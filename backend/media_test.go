package main

import (
	"fmt"
	"testing"
	"time"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"
)

func TestIsVariantFileName(t *testing.T) {
	cases := map[string]bool{
		"cover.thumb.webp":           true,
		"cover.medium.webp":          true,
		"ncmaz-thumb-cover.webp":     true,
		"ncmaz_medium_cover_ab12.webp": true,
		"thumbnail_ab12cd34ef.jpg":   false,
		"my_thumb_nail.jpg":          false,
		"photo.webp":                 false,
	}
	for in, want := range cases {
		if got := isVariantFileName(in); got != want {
			t.Errorf("isVariantFileName(%q) = %v, want %v", in, got, want)
		}
	}
}

func TestCollectMediaRefsFromText(t *testing.T) {
	input := `<p>Hello <img src="/api/files/media/p1/a.webp" /></p>` +
		`<img src="https://x.test/api/files/media/p2/b.webp?v=1#imgv1&t=/api/files/media/v1/t.webp&m=/api/files/media/v2/m.webp">`
	refs := map[string]struct{}{}
	collectMediaRefsFromText(input, refs)
	for _, want := range []string{"p1", "p2", "v1", "v2"} {
		if _, ok := refs[want]; !ok {
			t.Errorf("missing ref %q in %v", want, refs)
		}
	}
	if len(refs) != 4 {
		t.Errorf("expected 4 refs, got %d", len(refs))
	}
}

func TestCollectMediaRefsFromTextCollectionID(t *testing.T) {
	// Production URLs are emitted by pb.files.getURL using the media
	// collection id (e.g. pbc_2708086759), not the literal "media" name.
	input := `<img src="https://blog.artku.my.id/api/files/pbc_2708086759/rec1/a.png?token=xyz">` +
		`<img src="/api/files/media/rec2/b.webp">` +
		`#imgv1&t=/api/files/pbc_2708086759/v1/t.webp&m=/api/files/media/v2/m.webp`
	refs := map[string]struct{}{}
	collectMediaRefsFromText(input, refs)
	for _, want := range []string{"rec1", "rec2", "v1", "v2"} {
		if _, ok := refs[want]; !ok {
			t.Errorf("missing ref %q in %v", want, refs)
		}
	}
}

func TestWalkStrings(t *testing.T) {
	payload := map[string]any{
		"a": "one",
		"b": []any{"two", map[string]any{"c": "three"}},
		"d": []string{"four"},
	}
	var got []string
	walkStrings(payload, func(s string) { got = append(got, s) })
	if len(got) != 4 {
		t.Errorf("expected 4 strings, got %v", got)
	}
}

func newTestAppWithBootstrap(t *testing.T) core.App {
	t.Helper()
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatalf("new test app: %v", err)
	}
	t.Cleanup(app.Cleanup)
	if err := bootstrap(app, ""); err != nil {
		t.Fatalf("bootstrap: %v", err)
	}
	return app
}

func createMediaRecord(t *testing.T, app core.App, fileName string) string {
	t.Helper()
	id := randomID()
	now := time.Now().UTC().Format("2006-01-02 15:04:05.000Z")
	if _, err := app.DB().Insert(collectionMedia, dbx.Params{
		"id":      id,
		"file":    fileName,
		"created": now,
		"updated": now,
	}).Execute(); err != nil {
		t.Fatalf("insert media record: %v", err)
	}
	return id
}

func createTestCategory(t *testing.T, app core.App) string {
	t.Helper()
	cats, err := app.FindRecordsByFilter("categories", "", "", 1, 0)
	if err == nil && len(cats) > 0 {
		return cats[0].Id
	}
	id := randomID()
	now := time.Now().UTC().Format("2006-01-02 15:04:05.000Z")
	if _, err := app.DB().Insert("categories", dbx.Params{
		"id":      id,
		"name":    "Test Category",
		"slug":    "test-category-" + id,
		"created": now,
		"updated": now,
	}).Execute(); err != nil {
		t.Fatalf("insert category: %v", err)
	}
	return id
}

func createTestPost(t *testing.T, app core.App, cover string) *core.Record {
	t.Helper()
	users, err := app.FindRecordsByFilter(collectionUsers, "", "", 1, 0)
	if err != nil || len(users) == 0 {
		t.Fatalf("find seed author: %v (users=%d)", err, len(users))
	}
	categoryID := createTestCategory(t, app)
	col, err := app.FindCollectionByNameOrId("posts")
	if err != nil {
		t.Fatalf("find posts collection: %v", err)
	}
	rec := core.NewRecord(col)
	rec.Set("title", "A test article about media references")
	rec.Set("slug", fmt.Sprintf("a-test-article-about-media-%s", randomID()))
	rec.Set("excerpt", "This excerpt describes the article in enough detail for validation.")
	rec.Set("content", "<p>Article body with a single paragraph.</p>")
	rec.Set("status", "published")
	rec.Set("author", users[0].Id)
	rec.Set("categories", []string{categoryID})
	rec.Set("cover", cover)
	if err := app.Save(rec); err != nil {
		t.Fatalf("create post record: %v", err)
	}
	return rec
}

var testIDCounter int64

func randomID() string {
	testIDCounter++
	return fmt.Sprintf("t%d_%d", time.Now().UnixNano(), testIDCounter)
}

func TestEnsureMediaRefCountField(t *testing.T) {
	app := newTestAppWithBootstrap(t)
	col, err := app.FindCollectionByNameOrId(collectionMedia)
	if err != nil {
		t.Fatalf("find media collection: %v", err)
	}
	if col.Fields.GetByName(refCountField) == nil {
		t.Fatal("expected refCount field to exist after bootstrap")
	}
}

func TestFindOrphanMediaKeepsReferencedAndVariants(t *testing.T) {
	app := newTestAppWithBootstrap(t)

	parentID := createMediaRecord(t, app, "cover.webp")
	thumbID := createMediaRecord(t, app, "ncmaz-thumb-cover.webp")
	mediumID := createMediaRecord(t, app, "ncmaz-medium-cover.webp")
	orphanID := createMediaRecord(t, app, "unused.webp")

	// Full encoded URL: fragment embeds the variant URLs, so both variants
	// must be treated as referenced.
	cover := "https://example.test/api/files/media/" + parentID + "/cover.webp" +
		"#imgv1&t=https://example.test/api/files/media/" + thumbID + "/t.webp" +
		"&m=https://example.test/api/files/media/" + mediumID + "/m.webp"
	createTestPost(t, app, cover)

	orphans, err := findOrphanMedia(app)
	if err != nil {
		t.Fatalf("findOrphanMedia: %v", err)
	}
	if len(orphans) != 1 || orphans[0].Id != orphanID {
		t.Fatalf("expected exactly orphan %s, got %v", orphanID, orphanIDs(orphans))
	}
}

func TestCleanupDeletesOrphansOnly(t *testing.T) {
	app := newTestAppWithBootstrap(t)

	used := createMediaRecord(t, app, "used.webp")
	orphan := createMediaRecord(t, app, "unused.webp")
	createTestPost(t, app, "https://example.test/api/files/media/"+used+"/used.webp")

	orphans, err := findOrphanMedia(app)
	if err != nil {
		t.Fatalf("findOrphanMedia: %v", err)
	}
	for _, rec := range orphans {
		if err := app.Delete(rec); err != nil {
			t.Fatalf("delete orphan: %v", err)
		}
	}

	// The referenced record survives; the orphan (and nothing else) is gone.
	if _, err := app.FindRecordById(collectionMedia, used); err != nil {
		t.Fatalf("used record was deleted: %v", err)
	}
	if _, err := app.FindRecordById(collectionMedia, orphan); err == nil {
		t.Fatal("expected orphan record to be deleted")
	}
	orphans, err = findOrphanMedia(app)
	if err != nil {
		t.Fatalf("rescan: %v", err)
	}
	if len(orphans) != 0 {
		t.Fatalf("expected zero orphans after cleanup, got %v", orphanIDs(orphans))
	}
}

func TestOrphanCleanupGuard(t *testing.T) {
	app := newTestAppWithBootstrap(t)

	// No orphans → guard allows (no-op).
	if err := orphanCleanupGuard(app, nil); err != nil {
		t.Fatalf("expected guard pass with zero orphans, got %v", err)
	}

	// All media orphaned → guard refuses.
	orphan := createMediaRecord(t, app, "only.webp")
	orphans, err := findOrphanMedia(app)
	if err != nil {
		t.Fatalf("findOrphanMedia: %v", err)
	}
	if err := orphanCleanupGuard(app, orphans); err == nil {
		t.Fatal("expected guard to refuse when every media record is orphaned")
	}

	// Partial orphans → guard allows.
	used := createMediaRecord(t, app, "used.webp")
	createTestPost(t, app, "https://example.test/api/files/media/"+used+"/used.webp")
	orphans, err = findOrphanMedia(app)
	if err != nil {
		t.Fatalf("findOrphanMedia: %v", err)
	}
	if len(orphans) != 1 || orphans[0].Id != orphan {
		t.Fatalf("expected only %s orphaned, got %v", orphan, orphanIDs(orphans))
	}
	if err := orphanCleanupGuard(app, orphans); err != nil {
		t.Fatalf("expected guard to allow partial cleanup, got %v", err)
	}
}

func TestMediaRefCountHooks(t *testing.T) {
	app := newTestAppWithBootstrap(t)
	registerMediaHooks(app)

	mediaID := createMediaRecord(t, app, "cover.webp")
	coverURL := "https://example.test/api/files/media/" + mediaID + "/cover.webp"

	refCount := func() int64 {
		t.Helper()
		rec, err := app.FindRecordById(collectionMedia, mediaID)
		if err != nil {
			t.Fatalf("find media: %v", err)
		}
		return rec.GetInt64(refCountField)
	}

	if got := refCount(); got != 0 {
		t.Fatalf("expected initial refCount 0, got %d", got)
	}

	post := createTestPost(t, app, coverURL)
	if got := refCount(); got != 1 {
		t.Fatalf("expected refCount 1 after post create, got %d", got)
	}

	// Removing the cover decrements the counter.
	post.Set("cover", "https://images.unsplash.com/photo-test")
	if err := app.Save(post); err != nil {
		t.Fatalf("update post: %v", err)
	}
	if got := refCount(); got != 0 {
		t.Fatalf("expected refCount 0 after cover removed, got %d", got)
	}

	// Two posts sharing the same cover count twice.
	post2 := createTestPost(t, app, coverURL)
	post.Set("cover", coverURL)
	if err := app.Save(post); err != nil {
		t.Fatalf("re-add cover: %v", err)
	}
	if got := refCount(); got != 2 {
		t.Fatalf("expected refCount 2 for shared cover, got %d", got)
	}

	// Deleting one post leaves one reference; deleting the other zeroes it.
	if err := app.Delete(post2); err != nil {
		t.Fatalf("delete post2: %v", err)
	}
	if got := refCount(); got != 1 {
		t.Fatalf("expected refCount 1 after one delete, got %d", got)
	}
	if err := app.Delete(post); err != nil {
		t.Fatalf("delete post: %v", err)
	}
	if got := refCount(); got != 0 {
		t.Fatalf("expected refCount 0 after all deletes, got %d", got)
	}
}

func TestApplyMediaRefDeltaClampsAtZero(t *testing.T) {
	app := newTestAppWithBootstrap(t)
	mediaID := createMediaRecord(t, app, "x.webp")

	before := map[string]struct{}{mediaID: {}}
	if err := applyMediaRefDelta(app, before, nil); err != nil {
		t.Fatalf("first decrement: %v", err)
	}
	if err := applyMediaRefDelta(app, before, nil); err != nil {
		t.Fatalf("second decrement: %v", err)
	}
	rec, err := app.FindRecordById(collectionMedia, mediaID)
	if err != nil {
		t.Fatalf("find media: %v", err)
	}
	if got := rec.GetInt64(refCountField); got != 0 {
		t.Fatalf("expected clamped refCount 0, got %d", got)
	}
}

func orphanIDs(orphans []*core.Record) []string {
	ids := make([]string, 0, len(orphans))
	for _, r := range orphans {
		ids = append(ids, r.Id)
	}
	return ids
}
