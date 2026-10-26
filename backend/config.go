package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
)

// runtimeConfig mirrors the minimal OpenList-style config.json that a user can
// drop beside the data directory. Fields not present fall back to defaults.
type runtimeConfig struct {
	SiteURL string `json:"site_url"` // canonical public URL, e.g. https://blog.artku.my.id
}

// loadRuntimeConfig reads <dataDir>/config.json if it exists. Missing file is
// not an error — it returns a zero config.
func loadRuntimeConfig(dataDir string) (runtimeConfig, error) {
	var cfg runtimeConfig
	p := filepath.Join(dataDir, "config.json")
	f, err := os.Open(p)
	if err != nil {
		if os.IsNotExist(err) {
			return cfg, nil
		}
		return cfg, err
	}
	defer f.Close()
	if err := json.NewDecoder(f).Decode(&cfg); err != nil {
		return cfg, err
	}
	cfg.SiteURL = strings.TrimRight(strings.TrimSpace(cfg.SiteURL), "/")
	return cfg, nil
}
