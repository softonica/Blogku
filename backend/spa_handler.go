package main

import (
	"io/fs"
	"net/http"
	"strings"
)

// contentSecurityPolicy is applied to the SPA shell only. Static assets and
// PocketBase's own API/admin routes keep their existing headers/policies.
const contentSecurityPolicy = "default-src 'self'; " +
	"script-src 'self' 'wasm-unsafe-eval'; " +
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
	"img-src 'self' data: blob: https:; " +
	"font-src 'self' data: https://fonts.gstatic.com; " +
	"connect-src 'self'; " +
	"media-src 'self' https: blob:; " +
	"frame-src https://www.youtube-nocookie.com https://player.vimeo.com; " +
	"worker-src 'self' blob:; " +
	"object-src 'none'; " +
	"base-uri 'self'; " +
	"form-action 'self'; " +
	"frame-ancestors 'self'"

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
		w.Header().Set("Content-Security-Policy", contentSecurityPolicy)
		if vars.siteURL != "" {
			body := strings.ReplaceAll(string(data), "{{SITE_URL}}", vars.siteURL)
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Write([]byte(body))
			return
		}
		http.ServeFileFS(w, r, fsys, "index.html")
	})
}
