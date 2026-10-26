package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadRuntimeConfig(t *testing.T) {
	dir := t.TempDir()

	// Missing file → zero config, no error.
	cfg, err := loadRuntimeConfig(dir)
	if err != nil {
		t.Fatalf("missing config: %v", err)
	}
	if cfg.SiteURL != "" {
		t.Fatalf("expected empty site_url, got %q", cfg.SiteURL)
	}

	// Existing file with site_url → parsed + trailing slash stripped.
	p := filepath.Join(dir, "config.json")
	if err := os.WriteFile(p, []byte(`{"site_url":"https://blog.artku.my.id/"}`), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	cfg, err = loadRuntimeConfig(dir)
	if err != nil {
		t.Fatalf("existing config: %v", err)
	}
	if cfg.SiteURL != "https://blog.artku.my.id" {
		t.Fatalf("expected stripped site_url, got %q", cfg.SiteURL)
	}

	// Invalid JSON → error surfaced.
	if err := os.WriteFile(p, []byte(`{invalid`), 0o644); err != nil {
		t.Fatalf("write invalid: %v", err)
	}
	if _, err := loadRuntimeConfig(dir); err == nil {
		t.Fatal("expected error for invalid config")
	}
}
