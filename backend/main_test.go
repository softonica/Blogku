package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"
)

func createHookTestCategory(t *testing.T, app core.App, name string) string {
	t.Helper()

	col, err := app.FindCollectionByNameOrId("categories")
	if err != nil {
		t.Fatalf("find categories collection: %v", err)
	}
	rec := core.NewRecord(col)
	rec.Set("name", name)
	rec.Set("slug", slugify(name)+"-"+randomID())
	rec.Set("postCount", 0)
	if err := app.Save(rec); err != nil {
		t.Fatalf("create category: %v", err)
	}
	return rec.Id
}

func createHookTestPost(t *testing.T, app core.App, title, status string, categoryIDs []string) *core.Record {
	t.Helper()

	col, err := app.FindCollectionByNameOrId("posts")
	if err != nil {
		t.Fatalf("find posts collection: %v", err)
	}
	users, err := app.FindRecordsByFilter(collectionUsers, "", "", 1, 0)
	if err != nil || len(users) == 0 {
		t.Fatalf("find seed author: %v (users=%d)", err, len(users))
	}

	rec := core.NewRecord(col)
	rec.Set("title", title)
	rec.Set("slug", slugify(title)+"-"+randomID())
	rec.Set("excerpt", "An excerpt that is long enough to pass validation.")
	rec.Set("content", "<p>Body</p>")
	rec.Set("status", status)
	rec.Set("author", users[0].Id)
	rec.Set("categories", categoryIDs)
	if err := app.Save(rec); err != nil {
		t.Fatalf("create post: %v", err)
	}
	return rec
}

func assertCategoryCount(t *testing.T, app core.App, id string, want int64) {
	t.Helper()

	cat, err := app.FindRecordById("categories", id)
	if err != nil {
		t.Fatalf("find category %s: %v", id, err)
	}
	if got := cat.GetInt64("postCount"); got != want {
		t.Errorf("category %s postCount = %d, want %d", id, got, want)
	}
}

func TestRecomputeAllCategoryCountsCountsPublishedPosts(t *testing.T) {
	app := newTestAppWithBootstrap(t)

	c1 := createHookTestCategory(t, app, "Tech")
	c2 := createHookTestCategory(t, app, "Travel")

	createHookTestPost(t, app, "Published one", "published", []string{c1})
	createHookTestPost(t, app, "Published two", "published", []string{c1, c2})
	createHookTestPost(t, app, "Draft one", "draft", []string{c1})

	if err := recomputeAllCategoryCounts(app); err != nil {
		t.Fatalf("recomputeAllCategoryCounts: %v", err)
	}

	assertCategoryCount(t, app, c1, 2)
	assertCategoryCount(t, app, c2, 1)
}

func TestPostHooksKeepCategoryCountsInSync(t *testing.T) {
	app := newTestAppWithBootstrap(t)
	registerPostHooks(app)

	// The default PocketBase test app enables MFA on the users auth
	// collection; disable it so the seeded admin can log in directly.
	usersCol, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatalf("find users collection: %v", err)
	}
	usersCol.MFA.Enabled = false
	if err := app.Save(usersCol); err != nil {
		t.Fatalf("disable MFA: %v", err)
	}

	token := loginAdminToken(t, app)

	c1 := createHookTestCategory(t, app, "Tech")
	c2 := createHookTestCategory(t, app, "Travel")

	// create published post -> Tech = 1
	body := fmt.Sprintf(
		`{"title":"Hello world","excerpt":"An excerpt that is long enough to pass validation.","content":"<p>Body</p>","status":"published","categories":["%s"]}`,
		c1,
	)
	res, resBody := apiRequest(t, app, http.MethodPost, "/api/collections/posts/records", token, strings.NewReader(body))
	if res.StatusCode != 200 {
		t.Fatalf("create post: status=%d body=%s", res.StatusCode, resBody)
	}
	assertCategoryCount(t, app, c1, 1)
	assertCategoryCount(t, app, c2, 0)

	var created struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal([]byte(resBody), &created); err != nil {
		t.Fatalf("parse create response: %v (body=%s)", err, resBody)
	}

	// a draft post must not affect the counters
	draftBody := fmt.Sprintf(
		`{"title":"Draft draft","excerpt":"An excerpt that is long enough to pass validation.","content":"<p>Body</p>","status":"draft","categories":["%s"]}`,
		c1,
	)
	res, resBody = apiRequest(t, app, http.MethodPost, "/api/collections/posts/records", token, strings.NewReader(draftBody))
	if res.StatusCode != 200 {
		t.Fatalf("create draft: status=%d body=%s", res.StatusCode, resBody)
	}
	assertCategoryCount(t, app, c1, 1)

	// update -> move to Travel
	res, resBody = apiRequest(
		t, app,
		http.MethodPatch,
		"/api/collections/posts/records/"+created.ID,
		token,
		strings.NewReader(fmt.Sprintf(`{"categories":["%s"]}`, c2)),
	)
	if res.StatusCode != 200 {
		t.Fatalf("update post: status=%d body=%s", res.StatusCode, resBody)
	}
	assertCategoryCount(t, app, c1, 0)
	assertCategoryCount(t, app, c2, 1)

	// delete -> all zero
	res, resBody = apiRequest(t, app, http.MethodDelete, "/api/collections/posts/records/"+created.ID, token, nil)
	if res.StatusCode != 204 {
		t.Fatalf("delete post: status=%d body=%s", res.StatusCode, resBody)
	}
	assertCategoryCount(t, app, c1, 0)
	assertCategoryCount(t, app, c2, 0)
}

func apiRequest(t *testing.T, app core.App, method, path, token string, body io.Reader) (*http.Response, string) {
	t.Helper()

	baseRouter, err := apis.NewRouter(app)
	if err != nil {
		t.Fatalf("new router: %v", err)
	}

	serveEvent := &core.ServeEvent{App: app, Router: baseRouter}
	var res *http.Response
	var resBody string

	err = app.OnServe().Trigger(serveEvent, func(e *core.ServeEvent) error {
		req := httptest.NewRequest(method, path, body)
		req.Header.Set("content-type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", token)
		}

		mux, err := e.Router.BuildMux()
		if err != nil {
			return err
		}

		recorder := httptest.NewRecorder()
		mux.ServeHTTP(recorder, req)

		res = recorder.Result()
		b, readErr := io.ReadAll(res.Body)
		if readErr != nil {
			return readErr
		}
		resBody = string(b)
		res.Body.Close()
		return nil
	})
	if err != nil {
		t.Fatalf("serve trigger: %v", err)
	}

	return res, resBody
}

func loginAdminToken(t *testing.T, app core.App) string {
	t.Helper()

	res, body := apiRequest(
		t, app,
		http.MethodPost,
		"/api/collections/users/auth-with-password",
		"",
		strings.NewReader(`{"identity":"admin@blogku.com","password":"admin12345"}`),
	)
	if res.StatusCode != 200 {
		t.Fatalf("admin login failed: status=%d body=%s", res.StatusCode, body)
	}

	var data struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal([]byte(body), &data); err != nil {
		t.Fatalf("parse login response: %v (body=%s)", err, body)
	}

	return "Bearer " + data.Token
}

func TestEnsureSuperuserGeneratesCredentials(t *testing.T) {
	t.Setenv("PB_SUPERUSER_EMAIL", "")
	t.Setenv("PB_SUPERUSER_PASSWORD", "")

	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatalf("failed to create test app: %v", err)
	}
	defer app.Cleanup()

	created, email, password, err := ensureSuperuser(app)
	if err != nil {
		t.Fatalf("ensureSuperuser: %v", err)
	}
	if !created {
		t.Fatal("expected created = true on empty app")
	}
	if email == "" || password == "" {
		t.Fatal("expected generated email and password to be non-empty")
	}
	if password == "admin12345" || password == "change-me" {
		t.Fatal("expected a random password, not a default")
	}

	// Second call must not create again.
	created2, _, _, err := ensureSuperuser(app)
	if err != nil {
		t.Fatalf("ensureSuperuser second call: %v", err)
	}
	if created2 {
		t.Fatal("expected created = false on second call")
	}
}

func TestEnsureAvatarIsURLFieldMigratesLegacyFile(t *testing.T) {
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatalf("new test app: %v", err)
	}
	defer app.Cleanup()

	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatalf("find users collection: %v", err)
	}

	if got := users.Fields.GetByName("avatar").Type(); got != core.FieldTypeFile {
		t.Skipf("expected PocketBase default file avatar for this test, got %s", got)
	}

	if !ensureAvatarIsURLField(users) {
		t.Fatal("expected avatar migration to change the schema")
	}
	if err := app.Save(users); err != nil {
		t.Fatalf("save users collection: %v", err)
	}

	re, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatalf("reload users collection: %v", err)
	}
	if got := re.Fields.GetByName("avatar").Type(); got != core.FieldTypeURL {
		t.Fatalf("expected avatar to become a URL field, got %s", got)
	}
}

func TestIsEmptyMapValue(t *testing.T) {
	cases := []struct {
		in   any
		want bool
	}{
		{nil, true},
		{map[string]any{}, true},
		{map[string]any{"a": "b"}, false},
		{[]interface{}{}, true},
		{[]string{"x"}, false},
		{"", true},
		{"x", false},
	}
	for _, c := range cases {
		if got := isEmptyMapValue(c.in); got != c.want {
			t.Errorf("isEmptyMapValue(%#v) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestIsBlankJSON(t *testing.T) {
	for in, want := range map[string]bool{
		"":           true,
		"{}":         true,
		"[]":         true,
		"null":       true,
		"  ":        true,
		`{"a":1}`:   false,
		`["x"]`:     false,
	} {
		if got := isBlankJSON(in); got != want {
			t.Errorf("isBlankJSON(%q) = %v, want %v", in, got, want)
		}
	}
}
