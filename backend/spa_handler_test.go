package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"
)

func TestSPAHandler(t *testing.T) {
	fsys := fstest.MapFS{
		"index.html":    {Data: []byte(`<link rel="canonical" href="{{SITE_URL}}/" />`)},
		"assets/app.js": {Data: []byte("console.log('x')")},
		"favicon.svg":   {Data: []byte("<svg/>")},
	}
	h := newSPAHandler(fsys, spaVars{})

	cases := []struct {
		name string
		path string
		want string
	}{
		{"root no vars", "/", `<link rel="canonical" href="{{SITE_URL}}/" />`},
		{"asset", "/assets/app.js", "console.log('x')"},
		{"favicon", "/favicon.svg", "<svg/>"},
		{"history route fallback", "/post/my-first-post", `<link rel="canonical" href="{{SITE_URL}}/" />`},
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

func TestSPAHandlerInjectsSiteURL(t *testing.T) {
	fsys := fstest.MapFS{
		"index.html": {Data: []byte(`<link rel="canonical" href="{{SITE_URL}}/" />`)},
	}
	h := newSPAHandler(fsys, spaVars{siteURL: "https://blog.artku.my.id"})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	want := `<link rel="canonical" href="https://blog.artku.my.id/" />`
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if rec.Body.String() != want {
		t.Fatalf("body = %q, want %q", rec.Body.String(), want)
	}
}
