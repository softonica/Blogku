package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"os"
	"reflect"
	"regexp"
	"strings"

	"github.com/microcosm-cc/bluemonday"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

var (
	slugRe = regexp.MustCompile(`[^a-z0-9]+`)
	htmlRe = regexp.MustCompile(`<[^>]*>`)
	// HTML allowlist policy for post content / static page body.
	sanitizer = bluemonday.UGCPolicy()
)

const (
	roleAdmin       = "admin"
	rolePenulis     = "penulis"
	roleSubscriber  = "subscriber"
	collectionUsers = "users"
)

func main() {
	app := pocketbase.New()

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		if err := bootstrap(app, se.Server.Addr); err != nil {
			return fmt.Errorf("bootstrap: %w", err)
		}

		// Serve the embedded SPA for non-API paths. PocketBase's own routes
		// (/api/*, /_/*) are registered earlier and take precedence; this
		// subtree route serves the SPA for the remaining requests.
		distFS, err := fs.Sub(embeddedDist, "dist")
		if err != nil {
			return fmt.Errorf("sub dist: %w", err)
		}
		// Load runtime config.json (site_url) from the data directory so the
		// SPA canonical/og URLs are driven by config, never hardcoded.
		cfg, cfgErr := loadRuntimeConfig(app.DataDir())

		// resolveSiteURL returns the configured site URL, or falls back to the
		// request origin when config.json is missing/unreadable.
		resolveSiteURL := func(e *core.RequestEvent) string {
			if cfgErr == nil && cfg.SiteURL != "" {
				return cfg.SiteURL
			}
			scheme := "http"
			if e.Request.TLS != nil {
				scheme = "https"
			} else if proto := e.Request.Header.Get("X-Forwarded-Proto"); proto != "" {
				scheme = proto
			}
			return scheme + "://" + e.Request.Host
		}

		se.Router.GET("/", func(e *core.RequestEvent) error {
			spa := newSPAHandler(distFS, spaVars{siteURL: resolveSiteURL(e)})
			spa.ServeHTTP(e.Response, e.Request)
			return nil
		})

		// Track a post view (best-effort). The client calls this once per
		// browser session per post; we just bump the counter atomically.
		registerMediaRoutes(app, se)

		se.Router.POST("/track-view", func(e *core.RequestEvent) error {
			var req struct {
				PostID string `json:"postId"`
			}
			if err := json.NewDecoder(e.Request.Body).Decode(&req); err != nil {
				return e.JSON(400, map[string]any{"error": "invalid request body"})
			}
			if req.PostID == "" {
				return e.JSON(400, map[string]any{"error": "postId is required"})
			}
			post, err := app.FindRecordById("posts", req.PostID)
			if err != nil {
				return e.JSON(404, map[string]any{"error": "post not found"})
			}
			views := post.GetInt64("viewCount") + 1
			post.Set("viewCount", views)
			if err := app.Save(post); err != nil {
				return e.JSON(500, map[string]any{"error": "failed to save view count"})
			}
			return e.JSON(200, map[string]any{"ok": true, "viewCount": views})
		})

		return se.Next()
	})

	registerHooks(app)

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

// -------------------------------------------------------------------
// Bootstrap: create schema + seeds
// -------------------------------------------------------------------

func bootstrap(app core.App, httpAddr string) error {
	users, err := ensureUsersCollection(app)
	if err != nil {
		return err
	}
	categories, err := ensureCategoriesCollection(app)
	if err != nil {
		return err
	}
	tags, err := ensureTagsCollection(app)
	if err != nil {
		return err
	}
	posts, err := ensurePostsCollection(app, users, categories, tags)
	if err != nil {
		return err
	}
	// Idempotent migration: older databases predate the post layout style.
	if err := ensurePostStyleField(app); err != nil {
		return err
	}
	if _, err := ensureCommentsCollection(app, users, posts); err != nil {
		return err
	}
	if _, err := ensureReactionsCollection(app, users, posts); err != nil {
		return err
	}
	if _, err := ensureMediaCollection(app, users); err != nil {
		return err
	}
	if err := ensureMediaRefCountField(app); err != nil {
		return err
	}
	if _, err := ensurePagesCollection(app, users); err != nil {
		return err
	}
	if err := ensureSiteSettingsCollection(app); err != nil {
		return err
	}
	if err := ensureEditorSettingsCollection(app); err != nil {
		return err
	}
	if err := seedSiteSettings(app); err != nil {
		return err
	}
	if err := seedEditorSettings(app); err != nil {
		return err
	}
	if err := seedPages(app); err != nil {
		return err
	}
	if err := seedUsers(app); err != nil {
		return err
	}
	created, email, password, err := ensureSuperuser(app)
	if err != nil {
		return err
	}
	if created {
		if httpAddr == "" {
			httpAddr = "127.0.0.1:8090"
		}
		fmt.Printf("\nBlogku admin created:\n  URL:  %s\n  Email: %s\n  Password: %s\n  (save these now — shown only once)\n\n", "http://"+httpAddr, email, password)
	}
	return nil
}

func collectionExists(app core.App, name string) bool {
	_, err := app.FindCollectionByNameOrId(name)
	return err == nil
}

func collectionHasIndexOnColumn(col *core.Collection, column string) bool {
	for _, idx := range col.Indexes {
		if strings.Contains(idx, column) {
			return true
		}
	}
	return false
}

func saveCollection(app core.App, col *core.Collection) (*core.Collection, error) {
	if err := app.Save(col); err != nil {
		return nil, err
	}
	return col, nil
}

func ensureUsersCollection(app core.App) (*core.Collection, error) {
	var users *core.Collection
	var err error

	if collectionExists(app, collectionUsers) {
		users, err = app.FindCollectionByNameOrId(collectionUsers)
		if err != nil {
			return nil, err
		}
	} else {
		users = core.NewAuthCollection(collectionUsers)
	}

	added := false
	if users.Fields.GetByName("username") == nil {
		users.Fields.Add(&core.TextField{
			Name:     "username",
			Required: true,
			Min:      3,
			Max:      30,
			Pattern:  `^[a-z0-9-]+$`,
		})
		added = true
	}
	if users.Fields.GetByName("name") == nil {
		users.Fields.Add(&core.TextField{Name: "name", Required: true, Min: 2, Max: 80})
	}
	if ensureAvatarIsURLField(users) {
		added = true
	}
	if users.Fields.GetByName("bio") == nil {
		users.Fields.Add(&core.TextField{Name: "bio", Max: 500})
	}
	if users.Fields.GetByName("role") == nil {
		users.Fields.Add(&core.SelectField{Name: "role", Values: []string{roleAdmin, rolePenulis, roleSubscriber}, MaxSelect: 1})
	}
	if users.Fields.GetByName("postCount") == nil {
		users.Fields.Add(&core.NumberField{Name: "postCount", Min: numRef(0)})
	}
	if users.Fields.GetByName("coverBanner") == nil {
		users.Fields.Add(&core.URLField{Name: "coverBanner"})
	}
	if users.Fields.GetByName("socials") == nil {
		users.Fields.Add(&core.JSONField{Name: "socials"})
	}

	public := `role != "subscriber" || id = @request.auth.id || @request.auth.role = "admin"`
	users.ListRule = types.Pointer(public)
	users.ViewRule = types.Pointer(public)
	users.CreateRule = types.Pointer("")
	users.UpdateRule = types.Pointer(`id = @request.auth.id || @request.auth.role = "admin"`)
	users.DeleteRule = types.Pointer(`@request.auth.role = "admin"`)

	users.PasswordAuth.IdentityFields = []string{"email", "username"}
	if added && !collectionHasIndexOnColumn(users, "username") {
		users.AddIndex("idx_users_username", true, "username", "")
	}

	return saveCollection(app, users)
}

// ensureAvatarIsURLField guarantees the users "avatar" field is a URL field.
// The frontend stores media URLs directly, so a legacy File avatar makes every
// profile update fail field validation. Returns true when the schema changed.
func ensureAvatarIsURLField(users *core.Collection) bool {
	switch f := users.Fields.GetByName("avatar"); {
	case f == nil:
		users.Fields.Add(&core.URLField{Name: "avatar"})
		return true
	case f.Type() == core.FieldTypeFile:
		users.Fields.RemoveByName("avatar")
		users.Fields.Add(&core.URLField{Name: "avatar"})
		return true
	default:
		return false
	}
}

func ensureCategoriesCollection(app core.App) (*core.Collection, error) {
	if collectionExists(app, "categories") {
		return app.FindCollectionByNameOrId("categories")
	}

	categories := core.NewBaseCollection("categories")
	categories.ListRule = types.Pointer("")
	categories.ViewRule = types.Pointer("")
	categories.CreateRule = types.Pointer(`@request.auth.role = "admin"`)
	categories.UpdateRule = types.Pointer(`@request.auth.role = "admin"`)
	categories.DeleteRule = types.Pointer(`@request.auth.role = "admin"`)

	categories.Fields.Add(&core.TextField{Name: "name", Required: true, Min: 2, Max: 60})
	categories.Fields.Add(&core.TextField{Name: "slug", Required: true, Min: 3, Max: 160})
	categories.Fields.Add(&core.TextField{Name: "description", Max: 300})
	categories.Fields.Add(&core.URLField{Name: "image"})
	categories.Fields.Add(&core.NumberField{Name: "postCount", Min: numRef(0)})
	addTimestamps(categories)
	categories.AddIndex("idx_categories_slug", true, "slug", "")

	created, err := saveCollection(app, categories)
	if err != nil {
		return nil, err
	}
	created.Fields.Add(&core.RelationField{Name: "parent", CollectionId: created.Id, MaxSelect: 1})
	return saveCollection(app, created)
}

func ensureTagsCollection(app core.App) (*core.Collection, error) {
	if collectionExists(app, "tags") {
		return app.FindCollectionByNameOrId("tags")
	}

	tags := core.NewBaseCollection("tags")
	tags.ListRule = types.Pointer("")
	tags.ViewRule = types.Pointer("")
	tags.CreateRule = types.Pointer(`@request.auth.role = "admin" || @request.auth.role = "penulis"`)
	tags.UpdateRule = types.Pointer(`@request.auth.role = "admin"`)
	tags.DeleteRule = types.Pointer(`@request.auth.role = "admin"`)

	tags.Fields.Add(&core.TextField{Name: "name", Required: true, Min: 2, Max: 40})
	tags.Fields.Add(&core.TextField{Name: "slug", Required: true, Min: 2, Max: 100})
	tags.Fields.Add(&core.NumberField{Name: "postCount", Min: numRef(0)})
	addTimestamps(tags)
	tags.AddIndex("idx_tags_slug", true, "slug", "")

	return saveCollection(app, tags)
}

func ensurePostsCollection(app core.App, users, categories, tags *core.Collection) (*core.Collection, error) {
	if collectionExists(app, "posts") {
		return app.FindCollectionByNameOrId("posts")
	}

	posts := core.NewBaseCollection("posts")
	contentRule := `status = "published" || @request.auth.role = "admin" || author = @request.auth.id`
	posts.ListRule = types.Pointer(contentRule)
	posts.ViewRule = types.Pointer(contentRule)
	posts.CreateRule = types.Pointer(`@request.auth.role = "admin" || @request.auth.role = "penulis"`)
	posts.UpdateRule = types.Pointer(`@request.auth.role = "admin" || author = @request.auth.id`)
	posts.DeleteRule = types.Pointer(`@request.auth.role = "admin" || author = @request.auth.id`)

	posts.Fields.Add(&core.TextField{Name: "title", Required: true, Min: 4, Max: 140})
	posts.Fields.Add(&core.TextField{Name: "slug", Required: true, Min: 3, Max: 160})
	posts.Fields.Add(&core.TextField{Name: "excerpt", Required: true, Min: 10, Max: 300})
	posts.Fields.Add(&core.EditorField{Name: "content", Required: true})
	posts.Fields.Add(&core.JSONField{Name: "content_blocks"})
	posts.Fields.Add(&core.URLField{Name: "cover"})
	posts.Fields.Add(&core.SelectField{Name: "status", Values: []string{"draft", "published"}, MaxSelect: 1, Required: true})
	posts.Fields.Add(&core.SelectField{Name: "postType", Values: []string{"standard", "video", "audio", "gallery"}, MaxSelect: 1})
	posts.Fields.Add(&core.SelectField{Name: "postStyle", Values: []string{"style1", "style2", "style3", "style4"}, MaxSelect: 1})
	posts.Fields.Add(&core.URLField{Name: "videoUrl"})
	posts.Fields.Add(&core.URLField{Name: "audioUrl"})
	posts.Fields.Add(&core.JSONField{Name: "gallery"})
	posts.Fields.Add(&core.RelationField{Name: "author", CollectionId: users.Id, MaxSelect: 1, Required: true})
	posts.Fields.Add(&core.RelationField{Name: "categories", CollectionId: categories.Id, MinSelect: 1, MaxSelect: 10})
	posts.Fields.Add(&core.RelationField{Name: "tags", CollectionId: tags.Id, MaxSelect: 5})
	posts.Fields.Add(&core.BoolField{Name: "featured"})
	posts.Fields.Add(&core.NumberField{Name: "readingTime", Min: numRef(1)})
	posts.Fields.Add(&core.NumberField{Name: "likeCount", Min: numRef(0)})
	posts.Fields.Add(&core.NumberField{Name: "viewCount", Min: numRef(0)})
	posts.Fields.Add(&core.NumberField{Name: "commentCount", Min: numRef(0)})
	addTimestamps(posts)

	posts.AddIndex("idx_posts_slug", true, "slug", "")
	posts.AddIndex("idx_posts_status_created", false, "status, created", "")
	posts.AddIndex("idx_posts_author", false, "author", "")
	posts.AddIndex("idx_posts_categories", false, "categories", "")
	posts.AddIndex("idx_posts_tags", false, "tags", "")

	return saveCollection(app, posts)
}

// ensurePostStyleField adds the postStyle select field to an existing posts
// collection. Safe to run on every boot; no-op once the field exists.
func ensurePostStyleField(app core.App) error {
	collection, err := app.FindCollectionByNameOrId("posts")
	if err != nil {
		return err
	}
	if collection.Fields.GetByName("postStyle") != nil {
		return nil
	}
	collection.Fields.Add(&core.SelectField{
		Name:      "postStyle",
		Values:    []string{"style1", "style2", "style3", "style4"},
		MaxSelect: 1,
	})
	_, err = saveCollection(app, collection)
	return err
}

func ensureCommentsCollection(app core.App, users, posts *core.Collection) (*core.Collection, error) {
	if collectionExists(app, "comments") {
		return app.FindCollectionByNameOrId("comments")
	}

	comments := core.NewBaseCollection("comments")
	viewRule := `post.status = "published" || @request.auth.role = "admin" || post.author = @request.auth.id`
	comments.ListRule = types.Pointer(viewRule)
	comments.ViewRule = types.Pointer(viewRule)
	comments.CreateRule = types.Pointer(`@request.auth.id != ""`)
	comments.UpdateRule = types.Pointer(`@request.auth.role = "admin" || author = @request.auth.id`)
	comments.DeleteRule = types.Pointer(`@request.auth.role = "admin" || author = @request.auth.id`)

	comments.Fields.Add(&core.RelationField{Name: "post", CollectionId: posts.Id, MaxSelect: 1, Required: true})
	comments.Fields.Add(&core.RelationField{Name: "author", CollectionId: users.Id, MaxSelect: 1, Required: true})
	comments.Fields.Add(&core.TextField{Name: "content", Required: true, Min: 2, Max: 5000})
	addTimestamps(comments)

	created, err := saveCollection(app, comments)
	if err != nil {
		return nil, err
	}
	created.Fields.Add(&core.RelationField{Name: "parent", CollectionId: created.Id, MaxSelect: 1})
	return saveCollection(app, created)
}

func ensureReactionsCollection(app core.App, users, posts *core.Collection) (*core.Collection, error) {
	if collectionExists(app, "reactions") {
		return app.FindCollectionByNameOrId("reactions")
	}

	reactions := core.NewBaseCollection("reactions")
	viewRule := `@request.auth.id != "" && (user = @request.auth.id || @request.auth.role = "admin")`
	reactions.ListRule = types.Pointer(viewRule)
	reactions.ViewRule = types.Pointer(viewRule)
	reactions.CreateRule = types.Pointer(`@request.auth.id != ""`)
	reactions.UpdateRule = types.Pointer(`user = @request.auth.id || @request.auth.role = "admin"`)
	reactions.DeleteRule = types.Pointer(`user = @request.auth.id || @request.auth.role = "admin"`)

	reactions.Fields.Add(&core.RelationField{Name: "post", CollectionId: posts.Id, MaxSelect: 1, Required: true})
	reactions.Fields.Add(&core.RelationField{Name: "user", CollectionId: users.Id, MaxSelect: 1, Required: true})
	reactions.Fields.Add(&core.SelectField{Name: "type", Values: []string{"like", "dislike", "favorite"}, MaxSelect: 1, Required: true})
	addTimestamps(reactions)
	reactions.AddIndex("idx_reactions_unique", true, "post, user, type", "")

	return saveCollection(app, reactions)
}

func ensureMediaCollection(app core.App, users *core.Collection) (*core.Collection, error) {
	if collectionExists(app, "media") {
		return app.FindCollectionByNameOrId("media")
	}

	media := core.NewBaseCollection("media")
	media.ListRule = types.Pointer("")
	media.ViewRule = types.Pointer("")
	media.CreateRule = types.Pointer(`@request.auth.role = "admin" || @request.auth.role = "penulis"`)
	media.UpdateRule = types.Pointer(`owner = @request.auth.id || @request.auth.role = "admin"`)
	media.DeleteRule = types.Pointer(`owner = @request.auth.id || @request.auth.role = "admin"`)

	media.Fields.Add(&core.FileField{
		Name:      "file",
		Required:  true,
		MaxSelect: 1,
		MaxSize:   5 * 1024 * 1024,
		MimeTypes: []string{"image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"},
	})
	media.Fields.Add(&core.RelationField{Name: "owner", CollectionId: users.Id, MaxSelect: 1})
	media.Fields.Add(&core.TextField{Name: "alt", Max: 160})
	addTimestamps(media)

	return saveCollection(app, media)
}

func ensurePagesCollection(app core.App, users *core.Collection) (*core.Collection, error) {
	if collectionExists(app, "pages") {
		return app.FindCollectionByNameOrId("pages")
	}

	pages := core.NewBaseCollection("pages")
	pages.ListRule = types.Pointer("")
	pages.ViewRule = types.Pointer("")
	pages.CreateRule = types.Pointer(`@request.auth.role = "admin"`)
	pages.UpdateRule = types.Pointer(`@request.auth.role = "admin"`)
	pages.DeleteRule = types.Pointer(`@request.auth.role = "admin"`)

	pages.Fields.Add(&core.TextField{Name: "slug", Required: true, Min: 2, Max: 100})
	pages.Fields.Add(&core.TextField{Name: "title", Required: true, Min: 2, Max: 200})
	pages.Fields.Add(&core.EditorField{Name: "body", Required: true})
	pages.Fields.Add(&core.RelationField{Name: "updatedBy", CollectionId: users.Id, MaxSelect: 1})
	addTimestamps(pages)
	pages.AddIndex("idx_pages_slug", true, "slug", "")

	return saveCollection(app, pages)
}

func ensureSiteSettingsCollection(app core.App) error {
	if collectionExists(app, "site_settings") {
		return nil
	}

	settings := core.NewBaseCollection("site_settings")
	settings.ListRule = types.Pointer("")
	settings.ViewRule = types.Pointer("")
	settings.UpdateRule = types.Pointer(`@request.auth.role = "admin"`)
	settings.CreateRule = types.Pointer("")
	settings.DeleteRule = types.Pointer("")

	settings.Fields.Add(&core.TextField{Name: "siteName", Required: true, Max: 120})
	settings.Fields.Add(&core.TextField{Name: "siteDescription", Max: 400})
	settings.Fields.Add(&core.EmailField{Name: "contactEmail"})
	settings.Fields.Add(&core.BoolField{Name: "allowRegistration"})
	settings.Fields.Add(&core.TextField{Name: "footerText", Max: 500})
	settings.Fields.Add(&core.URLField{Name: "logo"})
	settings.Fields.Add(&core.URLField{Name: "logoDark"})
	settings.Fields.Add(&core.URLField{Name: "favicon"})
	settings.Fields.Add(&core.JSONField{Name: "allowedImageDomains"})
	addTimestamps(settings)

	_, err := saveCollection(app, settings)
	return err
}

func ensureEditorSettingsCollection(app core.App) error {
	if collectionExists(app, "editor_settings") {
		// Additive migration: image processing settings must persist for the
		// client-side WebP pipeline (defaults are applied by the frontend when
		// the fields are empty).
		settings, err := app.FindCollectionByNameOrId("editor_settings")
		if err != nil {
			return err
		}
		changed := false
		if settings.Fields.GetByName("imageMaxDimension") == nil {
			settings.Fields.Add(&core.NumberField{
				Name: "imageMaxDimension",
				Min:  numRef(256),
				Max:  numRef(4096),
			})
			changed = true
		}
		if settings.Fields.GetByName("imageQuality") == nil {
			settings.Fields.Add(&core.NumberField{
				Name: "imageQuality",
				Min:  numRef(0.1),
				Max:  numRef(1),
			})
			changed = true
		}
		if changed {
			_, err = saveCollection(app, settings)
		}
		return err
	}

	settings := core.NewBaseCollection("editor_settings")
	settings.ListRule = types.Pointer("")
	settings.ViewRule = types.Pointer("")
	settings.UpdateRule = types.Pointer(`@request.auth.role = "admin"`)
	settings.CreateRule = types.Pointer("")
	settings.DeleteRule = types.Pointer("")

	settings.Fields.Add(&core.TextField{Name: "placeholder", Max: 200})
	settings.Fields.Add(&core.BoolField{Name: "showHeadings"})
	settings.Fields.Add(&core.BoolField{Name: "showFormatting"})
	settings.Fields.Add(&core.BoolField{Name: "showLists"})
	settings.Fields.Add(&core.BoolField{Name: "showBlockquote"})
	settings.Fields.Add(&core.BoolField{Name: "showRule"})
	settings.Fields.Add(&core.BoolField{Name: "showLink"})
	settings.Fields.Add(&core.BoolField{Name: "showImageUpload"})
	settings.Fields.Add(&core.BoolField{Name: "showImageUrl"})
	settings.Fields.Add(&core.BoolField{Name: "showEmoji"})
	settings.Fields.Add(&core.BoolField{Name: "showAlign"})
	settings.Fields.Add(&core.BoolField{Name: "showTable"})
	settings.Fields.Add(&core.BoolField{Name: "autolink"})
	settings.Fields.Add(&core.NumberField{Name: "maxContentLength", Min: numRef(0)})
	settings.Fields.Add(&core.NumberField{Name: "maxImageUploadSize", Min: numRef(0)})
	settings.Fields.Add(&core.NumberField{Name: "imageMaxDimension", Min: numRef(256), Max: numRef(4096)})
	settings.Fields.Add(&core.NumberField{Name: "imageQuality", Min: numRef(0.1), Max: numRef(1)})
	addTimestamps(settings)

	_, err := saveCollection(app, settings)
	return err
}

// -------------------------------------------------------------------
// Seeds
// -------------------------------------------------------------------

func seedSiteSettings(app core.App) error {
	collection, err := app.FindCollectionByNameOrId("site_settings")
	if err != nil {
		return err
	}
	total, err := app.CountRecords(collection)
	if err != nil {
		return err
	}
	if total > 0 {
		return nil
	}

	record := core.NewRecord(collection)
	record.Set("siteName", "Blogku")
	record.Set("siteDescription", "Modern magazine & editorial platform.")
	record.Set("contactEmail", "contact@blogku.com")
	record.Set("allowRegistration", true)
	record.Set("footerText", "© Blogku — a calm place to read, write and keep what matters.")
	record.Set("favicon", "")
	record.Set("allowedImageDomains", []string{"images.unsplash.com", "images.pexels.com"})

	return app.Save(record)
}

func seedEditorSettings(app core.App) error {
	collection, err := app.FindCollectionByNameOrId("editor_settings")
	if err != nil {
		return err
	}
	total, err := app.CountRecords(collection)
	if err != nil {
		return err
	}
	if total > 0 {
		return nil
	}

	record := core.NewRecord(collection)
	record.Set("placeholder", "Start writing here…")
	record.Set("showHeadings", true)
	record.Set("showFormatting", true)
	record.Set("showLists", true)
	record.Set("showBlockquote", true)
	record.Set("showRule", true)
	record.Set("showLink", true)
	record.Set("showImageUpload", true)
	record.Set("showImageUrl", true)
	record.Set("showEmoji", true)
	record.Set("showAlign", true)
	record.Set("showTable", true)
	record.Set("autolink", true)
	record.Set("maxContentLength", 50000)
	record.Set("maxImageUploadSize", 5*1024*1024)
	record.Set("imageMaxDimension", 2048)
	record.Set("imageQuality", 0.8)

	return app.Save(record)
}

func seedPages(app core.App) error {
	collection, err := app.FindCollectionByNameOrId("pages")
	if err != nil {
		return err
	}

	seed := []struct {
		slug  string
		title string
		body  string
	}{
		{"about", "About", "<p>About Blogku.</p>"},
		{"contact", "Contact", "<p>Contact Blogku.</p>"},
		{"privacy", "Privacy", "<p>Privacy policy.</p>"},
	}

	for _, page := range seed {
		existing, err := app.FindFirstRecordByFilter(collection, "slug = {:slug}", map[string]any{"slug": page.slug})
		if err == nil && existing != nil {
			continue
		}
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		record := core.NewRecord(collection)
		record.Set("slug", page.slug)
		record.Set("title", page.title)
		record.Set("body", page.body)
		if err := app.Save(record); err != nil {
			return err
		}
	}
	return nil
}

func seedUsers(app core.App) error {
	collection, err := app.FindCollectionByNameOrId(collectionUsers)
	if err != nil {
		return err
	}

	seed := []struct {
		username    string
		email       string
		name        string
		role        string
		password    string
		avatar      string
		bio         string
		coverBanner string
		socials     map[string]string
	}{
		{
			username: "admin", email: "admin@blogku.com", name: "Admin", role: roleAdmin,
			password: envOr("SEED_ADMIN_PASSWORD", "admin12345"),
		},
		{
			username: "demo", email: "demo@blogku.com", name: "Jenny Wilson", role: rolePenulis,
			password: envOr("SEED_AUTHOR_PASSWORD", "demo12345"),
			avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80",
			bio: "Immerse yourself in the world of literature with our curated collection of books. From bestsellers to hidden gems, our assortment caters to a variety of interests.",
			coverBanner: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
			socials: map[string]string{
				"facebook": "https://www.facebook.com/", "youtube": "https://www.youtube.com/",
				"tiktok": "https://www.tiktok.com/", "github": "https://www.github.com/",
				"buymeacoffee": "https://www.buymeacoffee.com/",
			},
		},
		{
			username: "subscriber", email: "subscriber@blogku.com", name: "Demo Reader", role: roleSubscriber,
			password: envOr("SEED_SUBSCRIBER_PASSWORD", "sub12345"),
		},
	}

	for _, s := range seed {
		existing, err := app.FindFirstRecordByFilter(collection, "email = {:email}", map[string]any{"email": s.email})
		if errors.Is(err, sql.ErrNoRows) {
			existing = nil
		} else if err != nil {
			return err
		}

		if existing != nil {
			// Best-effort enrichment: only fill demo profile fields that are empty
			// (or still carry legacy placeholder names).
			if n := existing.GetString("name"); n == "" || n == "Demo Author" {
				existing.Set("name", s.name)
			}
			if existing.GetString("avatar") == "" && s.avatar != "" {
				existing.Set("avatar", s.avatar)
			}
			if existing.GetString("bio") == "" && s.bio != "" {
				existing.Set("bio", s.bio)
			}
			if existing.GetString("coverBanner") == "" && s.coverBanner != "" {
				existing.Set("coverBanner", s.coverBanner)
			}
			if len(s.socials) > 0 &&
				(isEmptyMapValue(existing.Get("socials")) || isBlankJSON(existing.GetString("socials"))) {
				existing.Set("socials", s.socials)
			}
			if err := app.Save(existing); err != nil {
				return err
			}
			continue
		}

		record := core.NewRecord(collection)
		record.Set("username", s.username)
		record.Set("email", s.email)
		record.Set("name", s.name)
		record.Set("role", s.role)
		record.Set("bio", s.bio)
		record.Set("postCount", 0)
		if s.avatar != "" {
			record.Set("avatar", s.avatar)
		}
		if s.coverBanner != "" {
			record.Set("coverBanner", s.coverBanner)
		}
		if len(s.socials) > 0 {
			record.Set("socials", s.socials)
		}
		record.SetPassword(s.password)
		if err := app.Save(record); err != nil {
			return err
		}
	}
	return nil
}

func ensureSuperuser(app core.App) (bool, string, string, error) {
	collection, err := app.FindCollectionByNameOrId(core.CollectionNameSuperusers)
	if err != nil {
		return false, "", "", err
	}

	email := strings.TrimSpace(os.Getenv("PB_SUPERUSER_EMAIL"))
	password := os.Getenv("PB_SUPERUSER_PASSWORD")
	if email == "" {
		email = "admin@blogku.com"
	}
	if password == "" {
		password, err = randomPassword(24)
		if err != nil {
			return false, "", "", err
		}
	}

	existing, err := app.FindFirstRecordByFilter(collection, "email = {:email}", map[string]any{"email": email})
	if err == nil && existing != nil {
		return false, email, "", nil
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return false, "", "", err
	}

	record := core.NewRecord(collection)
	record.Set("email", email)
	record.SetPassword(password)
	if err := app.Save(record); err != nil {
		return false, "", "", err
	}
	return true, email, password, nil
}

func randomPassword(n int) (string, error) {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	for i := range b {
		b[i] = letters[int(b[i])%len(letters)]
	}
	return string(b), nil
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

func plainText(s string) string {
	s = htmlRe.ReplaceAllString(s, " ")
	return strings.Join(strings.Fields(s), " ")
}

func slugify(s string) string {
	s = strings.ToLower(plainText(s))
	s = slugRe.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	return s
}

func uniqueSlug(app core.App, collection string, base string) (string, error) {
	if base == "" {
		return "", fmt.Errorf("slug is empty")
	}
	slug := base
	for i := 2; ; i++ {
		_, err := app.FindFirstRecordByFilter(collection, "slug = {:slug}", map[string]any{"slug": slug})
		if errors.Is(err, sql.ErrNoRows) {
			return slug, nil
		}
		if err != nil {
			return "", err
		}
		slug = fmt.Sprintf("%s-%d", base, i)
	}
}

// isEmptyMapValue reports whether a JSON field value is nil or an empty
// container/string (used to detect uninitialized seed fields).
func isEmptyMapValue(v any) bool {
	if v == nil {
		return true
	}
	rv := reflect.ValueOf(v)
	switch rv.Kind() {
	case reflect.Map, reflect.Slice, reflect.Array:
		return rv.Len() == 0
	case reflect.String:
		return rv.String() == ""
	default:
		return false
	}
}

// isBlankJSON reports whether a JSON field's raw string is empty or a trivial
// empty/null container.
func isBlankJSON(raw string) bool {
	switch strings.TrimSpace(raw) {
	case "", "{}", "[]", "null":
		return true
	default:
		return false
	}
}

func numRef(v float64) *float64 {
	return &v
}

func addTimestamps(col *core.Collection) {
	col.Fields.Add(&core.AutodateField{Name: "created", System: true, OnCreate: true})
	col.Fields.Add(&core.AutodateField{Name: "updated", System: true, OnCreate: true, OnUpdate: true})
}

func dbxHashRoleAdmin() dbx.Expression {
	return dbx.HashExp{"role": roleAdmin}
}

func dbxHashParent(parentID string) dbx.Expression {
	return dbx.HashExp{"parent": parentID}
}

func dbxHashAuthor(authorID string) dbx.Expression {
	return dbx.HashExp{"author": authorID}
}

func recordAuthorID(app core.App, e *core.RecordRequestEvent) (string, error) {
	if e.Auth == nil {
		return "", errors.New("authentication required")
	}
	return e.Auth.Id, nil
}

func sanitizeHTML(s string) string {
	return sanitizer.Sanitize(s)
}

// -------------------------------------------------------------------
// Hooks
// -------------------------------------------------------------------

func registerHooks(app core.App) {
	registerMediaHooks(app)
	registerUserHooks(app)
	registerPostHooks(app)
	registerCommentHooks(app)
	registerReactionHooks(app)
	registerCategoryHooks(app)
	registerTagHooks(app)
	registerPagesHooks(app)
}

func registerUserHooks(app core.App) {
	app.OnRecordCreateRequest(collectionUsers).BindFunc(func(e *core.RecordRequestEvent) error {
		record := e.Record

		// Always force subscriber for self sign-up unless current auth is superuser/admin.
		if e.Auth == nil || e.Auth.Collection().Name == core.CollectionNameSuperusers {
			record.Set("role", roleSubscriber)
		} else if e.Auth.GetString("role") != roleAdmin {
			record.Set("role", roleSubscriber)
		}

		// Respect site_settings.allowRegistration (first record, not fixed id).
		settingsList, err := app.FindRecordsByFilter("site_settings", "", "", 1, 0)
		if err != nil {
			return err
		}
		if len(settingsList) == 0 {
			return errors.New("site settings are not initialized")
		}
		if !settingsList[0].GetBool("allowRegistration") {
			return errors.New("registration is disabled")
		}
		return e.Next()
	})

	app.OnRecordUpdateRequest(collectionUsers).BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Auth == nil || e.Auth.Collection().Name == core.CollectionNameSuperusers {
			return e.Next()
		}

		isAdmin := e.Auth.GetString("role") == roleAdmin
		newRole := e.Record.GetString("role")
		oldRole := ""

		if old, err := app.FindRecordById(collectionUsers, e.Record.Id); err == nil {
			oldRole = old.GetString("role")
		}

		// Non-admin cannot change roles.
		if !isAdmin && newRole != oldRole {
			return errors.New("forbidden: only admins can change roles")
		}

		// Admin cannot demote themselves.
		if isAdmin && e.Auth.Id == e.Record.Id && newRole != roleAdmin {
			return errors.New("forbidden: you cannot demote yourself")
		}

		// Last admin cannot be demoted.
		if oldRole == roleAdmin && newRole != roleAdmin {
			total, err := app.CountRecords(collectionUsers, dbxHashRoleAdmin())
			if err != nil {
				return err
			}
			if total <= 1 {
				return errors.New("forbidden: cannot demote the last admin")
			}
		}

		return e.Next()
	})

	app.OnRecordDeleteRequest(collectionUsers).BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Record.GetString("role") == roleAdmin {
			total, err := app.CountRecords(collectionUsers, dbxHashRoleAdmin())
			if err != nil {
				return err
			}
			if total <= 1 {
				return errors.New("forbidden: cannot delete the last admin")
			}
		}
		return e.Next()
	})
}

func registerPostHooks(app core.App) {
	app.OnRecordCreateRequest("posts").BindFunc(func(e *core.RecordRequestEvent) error {
		record := e.Record
		authorID, err := recordAuthorID(app, e)
		if err != nil {
			return err
		}
		record.Set("author", authorID)

		title := plainText(record.GetString("title"))
		slug := slugify(record.GetString("slug"))
		if slug == "" {
			slug = slugify(title)
		}
		slug, err = uniqueSlug(app, "posts", slug)
		if err != nil {
			return err
		}
		record.Set("slug", slug)

		record.Set("content", sanitizeHTML(record.GetString("content")))
		record.Set("readingTime", readingTime(record.GetString("content")))

		if len(record.GetStringSlice("tags")) > 5 {
			return errors.New("posts can have at most 5 tags")
		}

		return e.Next()
	})

	app.OnRecordUpdateRequest("posts").BindFunc(func(e *core.RecordRequestEvent) error {
		record := e.Record
		record.Set("content", sanitizeHTML(record.GetString("content")))
		record.Set("readingTime", readingTime(record.GetString("content")))
		if len(record.GetStringSlice("tags")) > 5 {
			return errors.New("posts can have at most 5 tags")
		}
		return e.Next()
	})

	app.OnRecordAfterCreateSuccess("posts").BindFunc(func(e *core.RecordEvent) error {
		return recomputePostCount(app, e.Record.GetString("author"))
	})
	app.OnRecordAfterDeleteSuccess("posts").BindFunc(func(e *core.RecordEvent) error {
		return recomputePostCount(app, e.Record.GetString("author"))
	})
}

func registerCommentHooks(app core.App) {
	app.OnRecordCreateRequest("comments").BindFunc(func(e *core.RecordRequestEvent) error {
		authorID, err := recordAuthorID(app, e)
		if err != nil {
			return err
		}
		e.Record.Set("author", authorID)
		e.Record.Set("content", plainText(e.Record.GetString("content")))
		return e.Next()
	})

	app.OnRecordAfterCreateSuccess("comments").BindFunc(func(e *core.RecordEvent) error {
		return bumpPostCounter(app, e.Record.GetString("post"), "commentCount", 1)
	})
	app.OnRecordAfterDeleteSuccess("comments").BindFunc(func(e *core.RecordEvent) error {
		return bumpPostCounter(app, e.Record.GetString("post"), "commentCount", -1)
	})
}

func registerReactionHooks(app core.App) {
	app.OnRecordCreateRequest("reactions").BindFunc(func(e *core.RecordRequestEvent) error {
		userID, err := recordAuthorID(app, e)
		if err != nil {
			return err
		}
		e.Record.Set("user", userID)
		return e.Next()
	})

	app.OnRecordAfterCreateSuccess("reactions").BindFunc(func(e *core.RecordEvent) error {
		if e.Record.GetString("type") == "like" {
			return bumpPostCounter(app, e.Record.GetString("post"), "likeCount", 1)
		}
		return nil
	})
	app.OnRecordAfterDeleteSuccess("reactions").BindFunc(func(e *core.RecordEvent) error {
		if e.Record.GetString("type") == "like" {
			return bumpPostCounter(app, e.Record.GetString("post"), "likeCount", -1)
		}
		return nil
	})
}

func registerCategoryHooks(app core.App) {
	app.OnRecordDeleteRequest("categories").BindFunc(func(e *core.RecordRequestEvent) error {
		total, err := app.CountRecords("categories", dbxHashParent(e.Record.Id))
		if err != nil {
			return err
		}
		if total > 0 {
			return errors.New("cannot delete a category that still has child categories")
		}
		return e.Next()
	})
}

func registerTagHooks(app core.App) {
	app.OnRecordCreateRequest("tags").BindFunc(func(e *core.RecordRequestEvent) error {
		record := e.Record
		slug := slugify(record.GetString("slug"))
		if slug == "" {
			slug = slugify(record.GetString("name"))
		}
		record.Set("name", plainText(record.GetString("name")))
		record.Set("slug", slug)
		return e.Next()
	})
	app.OnRecordUpdateRequest("tags").BindFunc(func(e *core.RecordRequestEvent) error {
		e.Record.Set("name", plainText(e.Record.GetString("name")))
		if s := slugify(e.Record.GetString("slug")); s != "" {
			e.Record.Set("slug", s)
		}
		return e.Next()
	})
}

func registerPagesHooks(app core.App) {
	app.OnRecordCreateRequest("pages").BindFunc(func(e *core.RecordRequestEvent) error {
		e.Record.Set("body", sanitizeHTML(e.Record.GetString("body")))
		return e.Next()
	})
	app.OnRecordUpdateRequest("pages").BindFunc(func(e *core.RecordRequestEvent) error {
		e.Record.Set("body", sanitizeHTML(e.Record.GetString("body")))
		return e.Next()
	})
}

func readingTime(html string) int {
	text := plainText(html)
	words := len(strings.Fields(text))
	if words == 0 {
		return 1
	}
	minutes := (words + 199) / 200
	if minutes < 1 {
		minutes = 1
	}
	return minutes
}

func recomputePostCount(app core.App, authorID string) error {
	if authorID == "" {
		return nil
	}
	total, err := app.CountRecords("posts", dbxHashAuthor(authorID))
	if err != nil {
		return err
	}
	author, err := app.FindRecordById(collectionUsers, authorID)
	if err != nil {
		return err
	}
	author.Set("postCount", total)
	return app.Save(author)
}

func bumpPostCounter(app core.App, postID, field string, delta int64) error {
	if postID == "" {
		return nil
	}
	post, err := app.FindRecordById("posts", postID)
	if err != nil {
		return err
	}
	post.Set(field, post.GetInt64(field)+delta)
	return app.Save(post)
}
