package main

import (
	"io/fs"
	"net/http"
	"strings"
)

// newSPAHandler serves an embedded SPA: real files directly, unknown paths
// fall back to index.html so the client-side router (history mode) works.
func newSPAHandler(fsys fs.FS) http.Handler {
	fileServer := http.FileServerFS(fsys)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := strings.TrimPrefix(r.URL.Path, "/")
		if p != "" {
			if _, err := fs.Stat(fsys, p); err == nil {
				fileServer.ServeHTTP(w, r)
				return
			}
		}
		http.ServeFileFS(w, r, fsys, "index.html")
	})
}
