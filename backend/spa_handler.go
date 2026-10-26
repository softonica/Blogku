package main

import (
	"io/fs"
	"net/http"
	"strings"
)

// spaVars resolves template placeholders in the SPA shell (index.html).
// Currently injects the canonical site URL (used by canonical/og:url/JSON-LD)
// so these are never hardcoded in the frontend.
type spaVars struct {
	siteURL string
}

// newSPAHandler serves an embedded SPA: real files directly, unknown paths
// fall back to index.html (history-mode routing). When serving index.html it
// substitutes {{SITE_URL}} placeholders with vars.siteURL.
func newSPAHandler(fsys fs.FS, vars spaVars) http.Handler {
	fileServer := http.FileServerFS(fsys)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := strings.TrimPrefix(r.URL.Path, "/")
		if p != "" {
			if _, err := fs.Stat(fsys, p); err == nil {
				fileServer.ServeHTTP(w, r)
				return
			}
		}

		data, err := fs.ReadFile(fsys, "index.html")
		if err != nil {
			http.NotFound(w, r)
			return
		}
		if vars.siteURL != "" {
			body := strings.ReplaceAll(string(data), "{{SITE_URL}}", vars.siteURL)
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Write([]byte(body))
			return
		}
		http.ServeFileFS(w, r, fsys, "index.html")
	})
}
