package main

import (
	"testing"

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
