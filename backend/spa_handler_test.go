package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"
)

func TestSPAHandler(t *testing.T) {
	fsys := fstest.MapFS{
		"index.html":    {Data: []byte("<html>index</html>")},
		"assets/app.js": {Data: []byte("console.log('x')")},
		"favicon.svg":   {Data: []byte("<svg/>")},
	}
	h := newSPAHandler(fsys)

	cases := []struct {
		name string
		path string
		want string
	}{
		{"root", "/", "<html>index</html>"},
		{"asset", "/assets/app.js", "console.log('x')"},
		{"favicon", "/favicon.svg", "<svg/>"},
		{"history route fallback", "/post/my-first-post", "<html>index</html>"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200", rec.Code)
			}
			if rec.Body.String() != tc.want {
				t.Fatalf("body = %q, want %q", rec.Body.String(), tc.want)
			}
		})
	}
}
