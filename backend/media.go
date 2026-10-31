package main

import (
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"sync"

	"github.com/pocketbase/pocketbase/core"
)

var (
	// mediaFileRefRe extracts file URLs of the form
	// /api/files/<collectionIdOrName>/<recordId>/<file> from any text. PocketBase
	// emits either the collection id (e.g. pbc_2708086759) or the collection
	// name ("media") in stored URLs, so both must match. It also matches the
	// variant URLs embedded in the #imgv1... fragment of stored image URLs, so
	// a referenced parent automatically keeps its thumb/medium variants alive.
	// The record id (group 2) is the media record id.
	mediaFileRefRe = regexp.MustCompile(`/api/files/([^/?"'\s<>]+)/([^/?"'\s<>]+)/([^?"'\s<>&#]+)`)
	// mediaVariantNameRe mirrors frontend lib/media.ts isVariantFileName.
	mediaVariantNameRe = regexp.MustCompile(`(?i)^ncmaz[._-](thumb|medium)[._-]|\.(thumb|medium)\.[a-z0-9]+$`)
)

const (
	collectionMedia = "media"
	refCountField   = "refCount"
)

// ensureMediaRefCountField adds the refCount counter to the media collection.
// The field tracks how many content fields (post cover/gallery/content, user
// avatar/cover banner, page body, site settings logos, category image)
// currently reference a media record. Safe to run on every boot.
func ensureMediaRefCountField(app core.App) error {
	col, err := app.FindCollectionByNameOrId(collectionMedia)
	if err != nil {
		return err
	}
	if col.Fields.GetByName(refCountField) != nil {
		return nil
	}
	zero := float64(0)
	col.Fields.Add(&core.NumberField{Name: refCountField, Min: &zero})
	_, err = saveCollection(app, col)
	return err
}

func isVariantFileName(name string) bool {
	return mediaVariantNameRe.MatchString(name)
}

// mediaRecordPublicURL returns the stable public file URL of a media record.
func mediaRecordPublicURL(r *core.Record) string {
	return "/api/files/" + collectionMedia + "/" + r.Id + "/" + r.GetString("file")
}

// collectMediaRefsFromText scans a text blob (plain URL, HTML, JSON string)
// for media file references and records the referenced media record ids.
func collectMediaRefsFromText(s string, out map[string]struct{}) {
	if s == "" {
		return
	}
	for _, m := range mediaFileRefRe.FindAllStringSubmatch(s, -1) {
		out[m[2]] = struct{}{}
	}
}

func walkStrings(v any, fn func(string)) {
	switch t := v.(type) {
	case string:
		fn(t)
	case []any:
		for _, item := range t {
			walkStrings(item, fn)
		}
	case []string:
		for _, item := range t {
			fn(item)
		}
	case map[string]any:
		for _, item := range t {
			walkStrings(item, fn)
		}
	}
}

// collectReferencedMediaIDs builds the set of media record ids that are
// referenced anywhere in the content model: posts (cover, gallery, content
// HTML, content_blocks JSON), users (avatar, coverBanner), pages (body),
// categories (image) and site settings (logo, logoDark, favicon).
func collectReferencedMediaIDs(app core.App) (map[string]struct{}, error) {
	refs := map[string]struct{}{}
	addText := func(s string) { collectMediaRefsFromText(s, refs) }

	posts, err := app.FindRecordsByFilter("posts", "", "", 0, 0)
	if err != nil {
		return nil, err
	}
	for _, p := range posts {
		addText(p.GetString("cover"))
		addText(p.GetString("content"))
		var gallery []string
		if err := p.UnmarshalJSONField("gallery", &gallery); err == nil {
			for _, u := range gallery {
				addText(u)
			}
		}
		var blocks any
		if err := p.UnmarshalJSONField("content_blocks", &blocks); err == nil {
			walkStrings(blocks, addText)
		}
	}

	users, err := app.FindRecordsByFilter(collectionUsers, "", "", 0, 0)
	if err != nil {
		return nil, err
	}
	for _, u := range users {
		addText(u.GetString("avatar"))
		addText(u.GetString("coverBanner"))
	}

	pages, err := app.FindRecordsByFilter("pages", "", "", 0, 0)
	if err != nil {
		return nil, err
	}
	for _, pg := range pages {
		addText(pg.GetString("body"))
	}

	categories, err := app.FindRecordsByFilter("categories", "", "", 0, 0)
	if err != nil {
		return nil, err
	}
	for _, c := range categories {
		addText(c.GetString("image"))
	}

	settings, err := app.FindRecordsByFilter("site_settings", "", "", 0, 0)
	if err != nil {
		return nil, err
	}
	for _, s := range settings {
		addText(s.GetString("logo"))
		addText(s.GetString("logoDark"))
		addText(s.GetString("favicon"))
	}

	return refs, nil
}

// findOrphanMedia lists every media record whose file URL is not referenced by
// any content field. Variant records (thumb/medium) created by the image
// pipeline are included: they are orphaned whenever their parent is.
func findOrphanMedia(app core.App) ([]*core.Record, error) {
	refs, err := collectReferencedMediaIDs(app)
	if err != nil {
		return nil, err
	}

	media, err := app.FindRecordsByFilter(collectionMedia, "", "", 0, 0)
	if err != nil {
		return nil, err
	}

	orphans := make([]*core.Record, 0, len(media))
	for _, rec := range media {
		if _, used := refs[rec.Id]; !used {
			orphans = append(orphans, rec)
		}
	}

	sort.Slice(orphans, func(i, j int) bool {
		return orphans[i].GetDateTime("created").Time().After(orphans[j].GetDateTime("created").Time())
	})
	return orphans, nil
}

// orphanCleanupGuard refuses to wipe the whole library when every media record
// looks orphaned (that almost always means reference detection failed rather
// than a real cleanup opportunity) — i.e. it protects against mis-detection
// cascades, like the /api/files/<collectionId> path form not being recognized.
func orphanCleanupGuard(app core.App, orphans []*core.Record) error {
	if len(orphans) == 0 {
		return nil
	}
	total, err := app.CountRecords(collectionMedia, nil)
	if err != nil {
		return err
	}
	if total > 0 && len(orphans) >= int(total) {
		return errors.New("every media record is flagged as orphan; cleanup aborted — reference detection may have failed")
	}
	return nil
}

// orphanMediaResponse is the JSON shape returned by the admin scan/cleanup
// endpoints (and consumed by the frontend PocketBaseSource).
type orphanMediaResponse struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	URL       string `json:"url"`
	CreatedAt string `json:"createdAt"`
	RefCount  int64  `json:"refCount"`
	Variant   bool   `json:"variant"`
}

func orphanResponseItems(orphans []*core.Record) []orphanMediaResponse {
	items := make([]orphanMediaResponse, 0, len(orphans))
	for _, rec := range orphans {
		items = append(items, orphanMediaResponse{
			ID:        rec.Id,
			Name:      rec.GetString("file"),
			URL:       mediaRecordPublicURL(rec),
			CreatedAt: rec.GetDateTime("created").Time().Format("2006-01-02T15:04:05.000Z"),
			RefCount:  rec.GetInt64(refCountField),
			Variant:   isVariantFileName(rec.GetString("file")),
		})
	}
	return items
}

// requireAdminAPI authenticates a request as an administrator: a superuser
// token or a users token with role=admin. It returns the auth record or an
// HTTP error to write to the client.
func requireAdminAPI(app core.App, e *core.RequestEvent) (*core.Record, error) {
	header := e.Request.Header.Get("Authorization")
	token := strings.TrimPrefix(header, "Bearer ")
	if token == "" || token == header {
		return nil, e.JSON(http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
	}
	record, err := app.FindAuthRecordByToken(token, core.TokenTypeAuth)
	if err != nil {
		return nil, e.JSON(http.StatusForbidden, map[string]any{"error": "forbidden"})
	}
	if record.Collection().Name == core.CollectionNameSuperusers {
		return record, nil
	}
	if record.GetString("role") != roleAdmin {
		return nil, e.JSON(http.StatusForbidden, map[string]any{"error": "forbidden"})
	}
	return record, nil
}

// registerMediaRoutes wires the admin-only orphan media scan/cleanup endpoints.
func registerMediaRoutes(app core.App, se *core.ServeEvent) {
	se.Router.POST("/admin/orphan-media/scan", func(e *core.RequestEvent) error {
		if _, err := requireAdminAPI(app, e); err != nil {
			return err
		}
		orphans, err := findOrphanMedia(app)
		if err != nil {
			return e.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
		}
		items := orphanResponseItems(orphans)
		return e.JSON(http.StatusOK, map[string]any{"total": len(items), "items": items})
	})

	se.Router.POST("/admin/orphan-media/cleanup", func(e *core.RequestEvent) error {
		if _, err := requireAdminAPI(app, e); err != nil {
			return err
		}
		orphans, err := findOrphanMedia(app)
		if err != nil {
			return e.JSON(http.StatusInternalServerError, map[string]any{"error": err.Error()})
		}
		if err := orphanCleanupGuard(app, orphans); err != nil {
			return e.JSON(http.StatusConflict, map[string]any{"error": err.Error()})
		}
		items := orphanResponseItems(orphans)
		for _, rec := range orphans {
			if err := app.Delete(rec); err != nil {
				return e.JSON(http.StatusInternalServerError, map[string]any{
					"error": fmt.Sprintf("failed to delete media %s: %v", rec.Id, err),
				})
			}
		}
		return e.JSON(http.StatusOK, map[string]any{"deleted": len(items), "items": items})
	})
}

// --- refCount maintenance hooks -------------------------------------------

// postMediaRefIDs extracts the media record ids referenced by a post.
func postMediaRefIDs(r *core.Record) map[string]struct{} {
	out := map[string]struct{}{}
	collectMediaRefsFromText(r.GetString("cover"), out)
	collectMediaRefsFromText(r.GetString("content"), out)
	var gallery []string
	if err := r.UnmarshalJSONField("gallery", &gallery); err == nil {
		for _, u := range gallery {
			collectMediaRefsFromText(u, out)
		}
	}
	var blocks any
	if err := r.UnmarshalJSONField("content_blocks", &blocks); err == nil {
		walkStrings(blocks, func(s string) { collectMediaRefsFromText(s, out) })
	}
	return out
}

func userMediaRefIDs(r *core.Record) map[string]struct{} {
	out := map[string]struct{}{}
	collectMediaRefsFromText(r.GetString("avatar"), out)
	collectMediaRefsFromText(r.GetString("coverBanner"), out)
	return out
}

func pageMediaRefIDs(r *core.Record) map[string]struct{} {
	out := map[string]struct{}{}
	collectMediaRefsFromText(r.GetString("body"), out)
	return out
}

func settingsMediaRefIDs(r *core.Record) map[string]struct{} {
	out := map[string]struct{}{}
	collectMediaRefsFromText(r.GetString("logo"), out)
	collectMediaRefsFromText(r.GetString("logoDark"), out)
	collectMediaRefsFromText(r.GetString("favicon"), out)
	return out
}

func categoryMediaRefIDs(r *core.Record) map[string]struct{} {
	out := map[string]struct{}{}
	collectMediaRefsFromText(r.GetString("image"), out)
	return out
}

// applyMediaRefDelta bumps the refCount of every media record whose reference
// set changed between before and after. Negative counts are clamped to zero.
func applyMediaRefDelta(app core.App, before, after map[string]struct{}) error {
	for id := range before {
		if _, keep := after[id]; keep {
			continue
		}
		if err := bumpMediaRef(app, id, -1); err != nil {
			return err
		}
	}
	for id := range after {
		if _, had := before[id]; had {
			continue
		}
		if err := bumpMediaRef(app, id, 1); err != nil {
			return err
		}
	}
	return nil
}

func bumpMediaRef(app core.App, id string, delta int64) error {
	rec, err := app.FindRecordById(collectionMedia, id)
	if err != nil {
		// Dangling reference: the media record was already deleted.
		return nil
	}
	n := rec.GetInt64(refCountField) + delta
	if n < 0 {
		n = 0
	}
	rec.Set(refCountField, n)
	return app.Save(rec)
}

// refSnapshots caches the pre-update reference set for records being edited.
// PocketBase's Record.Original() is not reliably populated outside request
// flows, so we snapshot the old state in OnRecordUpdateRequest (where
// e.Record already holds the new values) and consume it after a successful
// save.
var (
	refSnapshotsMu sync.Mutex
	refSnapshots   = map[string]map[string]struct{}{}
)

func refSnapshotKey(collection, id string) string {
	return collection + ":" + id
}

func storeRefSnapshot(key string, ids map[string]struct{}) {
	refSnapshotsMu.Lock()
	defer refSnapshotsMu.Unlock()
	refSnapshots[key] = ids
}

func loadRefSnapshot(key string) (map[string]struct{}, bool) {
	refSnapshotsMu.Lock()
	defer refSnapshotsMu.Unlock()
	ids, ok := refSnapshots[key]
	delete(refSnapshots, key)
	return ids, ok
}

// registerRefSyncHook wires refCount maintenance for one collection. The
// pre-update reference set is snapshotted during model validation (which runs
// for every save, API or direct), and the delta is applied after a successful
// save.
func registerRefSyncHook(
	app core.App,
	collection string,
	before func(*core.Record) map[string]struct{},
	after func(*core.Record) map[string]struct{},
) {
	app.OnModelValidate(collection).BindFunc(func(e *core.ModelEvent) error {
		rec, ok := e.Model.(*core.Record)
		if !ok || rec.IsNew() {
			return e.Next()
		}
		old, err := app.FindRecordById(collection, rec.Id)
		if err == nil {
			storeRefSnapshot(refSnapshotKey(collection, rec.Id), before(old))
		}
		return e.Next()
	})
	app.OnRecordAfterCreateSuccess(collection).BindFunc(func(e *core.RecordEvent) error {
		return applyMediaRefDelta(app, nil, after(e.Record))
	})
	app.OnRecordAfterUpdateSuccess(collection).BindFunc(func(e *core.RecordEvent) error {
		old, ok := loadRefSnapshot(refSnapshotKey(collection, e.Record.Id))
		if !ok {
			old = nil
		}
		return applyMediaRefDelta(app, old, after(e.Record))
	})
	app.OnRecordAfterDeleteSuccess(collection).BindFunc(func(e *core.RecordEvent) error {
		return applyMediaRefDelta(app, before(e.Record), nil)
	})
}

func registerMediaHooks(app core.App) {
	registerRefSyncHook(app, "posts", postMediaRefIDs, postMediaRefIDs)
	registerRefSyncHook(app, collectionUsers, userMediaRefIDs, userMediaRefIDs)
	registerRefSyncHook(app, "pages", pageMediaRefIDs, pageMediaRefIDs)
	registerRefSyncHook(app, "site_settings", settingsMediaRefIDs, settingsMediaRefIDs)
	registerRefSyncHook(app, "categories", categoryMediaRefIDs, categoryMediaRefIDs)
}
