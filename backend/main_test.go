package main

import (
	"testing"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tests"
)

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
