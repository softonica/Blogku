# Blogku Single-Binary Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single Linux Go binary that embeds the Vue SPA and serves both frontend + PocketBase API on one port, with auto-provisioned admin (printed to console) — OpenList-style setup.

**Architecture:** Embed `frontend/dist` into the Go backend via `go:embed` (build step copies dist into `backend/dist` first). Add an SPA handler with history-mode fallback serving embedded assets on the same PocketBase HTTP server. Modify `ensureSuperuser` to generate + print random credentials on first run when no env is set. Frontend's PocketBase client defaults to same-origin (empty base URL).

**Tech Stack:** Go 1.27 (PocketBase v0.40.6), Vue 3.5 + Vite 8, `go:embed`, `io/fs`, `crypto/rand`, labstack echo (PocketBase runtime).

## Global Constraints

- Backend module path: `backend/` (module `ncmaz.backend`, `go 1.27.2`).
- Frontend build output: `frontend/dist/` (Vite SPA, base `/`).
- `go:embed` cannot reference parent dirs → dist MUST be copied to `backend/dist` before `go build`.
- Embedded build must set `VITE_USE_POCKETBASE=true` and `VITE_PB_URL=` (empty = same-origin).
- Bump no versions; use existing `PocketBase` serve flags `--http` (default `127.0.0.1:8090`) and `--dir` (default `pb_data`).
- Credentials printed only on first-run (when a new superuser is actually created).
- Do not break existing `vite dev` mock mode: only the release build sets pocketbase env.

---

### Task 1: Frontend — same-origin default

**Files:**
- Modify: `frontend/src/lib/pb.ts`
- Test: `frontend/src/lib/pb.test.ts`

**Interfaces:**
- Produces: `createPb()` still returns a `PocketBase` client; when `VITE_PB_URL` is unset/blank it uses `''` (same-origin).

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/lib/pb.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'

describe('createPb base URL', () => {
  afterEach(() => {
    delete (import.meta.env as Record<string, unknown>).VITE_PB_URL
  })

  it('defaults to empty string (same-origin) when VITE_PB_URL unset', () => {
    delete (import.meta.env as Record<string, unknown>).VITE_PB_URL
    const { createPb } = await import('./pb')
    const pb = createPb()
    expect((pb as unknown as { baseURL: string }).baseURL).toBe('')
  })

  it('uses VITE_PB_URL when provided', () => {
    ;(import.meta.env as Record<string, unknown>).VITE_PB_URL = 'http://127.0.0.1:8090'
    const { createPb } = await import('./pb')
    const pb = createPb()
    expect((pb as unknown as { baseURL: string }).baseURL).toBe('http://127.0.0.1:8090')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --workspace=frontend run test -- lib/pb.test.ts`
Expected: FAIL (current default is `http://127.0.0.1:8090`, not `''`).

- [ ] **Step 3: Implement same-origin default**

```ts
// frontend/src/lib/pb.ts
import PocketBase from 'pocketbase'

const DEFAULT_PB_URL = ''

function resolveUrl(): string {
  const fromEnv = (import.meta.env.VITE_PB_URL as string | undefined)?.trim()
  return fromEnv ?? DEFAULT_PB_URL
}

export function createPb(): PocketBase {
  return new PocketBase(resolveUrl())
}
```

(Keep `getPb`, `resetPbForTests` unchanged.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --workspace=frontend run test -- lib/pb.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/pb.ts frontend/src/lib/pb.test.ts
git commit -m "feat(frontend): same-origin PocketBase default"
```

---

### Task 2: Embed infrastructure + build script

**Files:**
- Create: `backend/embed.go`
- Create: `backend/dist/.gitkeep`
- Create: `backend/build.sh` (Linux) and `backend/build.ps1` (Windows dev convenience)
- Modify: `backend/.gitignore` (ignore `backend/dist/*` except `.gitkeep`)

**Interfaces:**
- Produces: package-level var `embeddedDist embed.FS` (used by Task 4). Build script `backend/build.sh` produces `backend/blogku` binary.

- [ ] **Step 1: Create placeholder dist + embed.go**

```go
// backend/embed.go
package main

import "embed"

//go:embed all:dist
var embeddedDist embed.FS
```

Create `backend/dist/.gitkeep` (empty file) so the embed target exists before first web build.

- [ ] **Step 2: Add .gitignore rule**

Append to `backend/.gitignore`:

```
dist/*
!dist/.gitkeep
```

- [ ] **Step 3: Write build script**

`backend/build.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/frontend"
# Release build: pocketbase source + same-origin base URL.
VITE_USE_POCKETBASE=true VITE_PB_URL= npx vite build
rm -rf "$ROOT/backend/dist"
mkdir -p "$ROOT/backend/dist"
cp -r dist/. "$ROOT/backend/dist/"
cd "$ROOT/backend"
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o blogku .
echo "Built: $ROOT/backend/blogku"
```

`backend/build.ps1` (Windows, for dev):

```powershell
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Push-Location "$Root\frontend"
$env:VITE_USE_POCKETBASE='true'
$env:VITE_PB_URL=''
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Remove-Item "$Root\backend\dist" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "$Root\backend\dist" -Force | Out-Null
Copy-Item "$Root\frontend\dist\*" "$Root\backend\dist\" -Recurse -Force
Pop-Location
Push-Location "$Root\backend"
$env:CGO_ENABLED='0'
go build -trimpath -o blogku.exe .
Pop-Location
```

- [ ] **Step 4: Verify build compiles**

Run: `bash backend/build.sh`
Expected: exits 0, produces `backend/blogku`, `backend/dist` contains copied web assets.

- [ ] **Step 5: Commit**

```bash
git add backend/embed.go backend/dist/.gitkeep backend/build.sh backend/build.ps1 backend/.gitignore
git commit -m "build: embed frontend dist via go:embed + build scripts"
```

---

### Task 3: SPA handler + unit test

**Files:**
- Create: `backend/spa_handler.go`
- Create: `backend/spa_handler_test.go`

**Interfaces:**
- Produces: `newSPAHandler(fsys fs.FS) http.Handler` — serves real files, falls back to `index.html` for unknown paths (history-mode routing).

- [ ] **Step 1: Write the failing test**

```go
// backend/spa_handler_test.go
package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"
)

func TestSPAHandler(t *testing.T) {
	fsys := fstest.MapFS{
		"index.html": {Data: []byte("<html>index</html>")},
		"assets/app.js": {Data: []byte("console.log('x')")},
		"favicon.svg": {Data: []byte("<svg/>")},
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test . -run TestSPAHandler -count=1`
Expected: FAIL (compile error — `newSPAHandler` undefined).

- [ ] **Step 3: Implement handler**

```go
// backend/spa_handler.go
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test . -run TestSPAHandler -count=1`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/spa_handler.go backend/spa_handler_test.go
git commit -m "feat(backend): SPA handler with history-mode fallback"
```

---

### Task 4: Mount SPA on PocketBase server

**Files:**
- Modify: `backend/main.go` (in `main()`/`OnServe`)
- Test: `backend/spa_handler_test.go` (unchanged)

**Interfaces:**
- Consumes: `embeddedDist` (Task 2), `newSPAHandler` (Task 3).
- Produces: served SPA at `/` and all non-API routes; `/api/*` and `/_/*` untouched.

- [ ] **Step 1: Register the catch-all GET handler in OnServe**

Modify `main()` in `backend/main.go`:

```go
func main() {
	app := pocketbase.New()

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		if err := bootstrap(app); err != nil {
			return fmt.Errorf("bootstrap: %w", err)
		}

		// Serve the embedded SPA for every route that is not a PocketBase
		// API/admin route. PocketBase's own routes (/api/*, /_/*) are
		// registered earlier and take precedence; this wildcard catches the
		// remaining requests.
		spa := newSPAHandler(embeddedDist)
		se.Router.GET("*", func(c echo.Context) error {
			spa.ServeHTTP(c.Response().Writer, c.Request())
			return nil
		})

		return se.Next()
	})

	registerHooks(app)

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
```

Add imports: `"github.com/labstack/echo/v4"` (PocketBase's echo runtime).

- [ ] **Step 2: Build + smoke test**

Run:
```bash
bash backend/build.sh
./backend/blogku serve --http=127.0.0.1:8090 --dir=/tmp/blogku-smoke
```
Then in another shell:
```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8090/        # 200
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8090/api/health # 404 (API namespace intact)
```
Expected: `/` → 200; `/api/health` → 404 (no accidental API overlap), and SPA HTML is served at `/`.

- [ ] **Step 3: Commit**

```bash
git add backend/main.go
git commit -m "feat(backend): serve embedded SPA on same port"
```

---

### Task 5: Auto-provision superuser + print credentials

**Files:**
- Modify: `backend/main.go` (`ensureSuperuser` + `main()`)
- Test: `backend/main_test.go` (new)

**Interfaces:**
- Produces: `ensureSuperuser(app core.App) (created bool, email, password string, err error)` — creates a superuser (generating a random password when env unset) and reports whether it was newly created.

- [ ] **Step 1: Write the failing test**

```go
// backend/main_test.go
package main

import (
	"testing"

	"github.com/pocketbase/pocketbase/tests"
)

func TestEnsureSuperuserGeneratesCredentials(t *testing.T) {
	app := tests.NewTestApp(t)
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test . -run TestEnsureSuperuserGeneratesCredentials -count=1`
Expected: FAIL (current `ensureSuperuser` returns only `error`, does not generate credentials).

- [ ] **Step 3: Implement credential generation + creation flag**

Replace `ensureSuperuser` in `backend/main.go`:

```go
func ensureSuperuser(app core.App) (bool, string, string, error) {
	collection, err := app.FindCollectionByNameOrId(core.CollectionNameSuperusers)
	if err != nil {
		return false, "", "", err
	}

	email := strings.TrimSpace(os.Getenv("PB_SUPERUSER_EMAIL"))
	password := os.Getenv("PB_SUPERUSER_PASSWORD")
	if email == "" {
		email = "admin@blogku.com"
	}
	if password == "" {
		password, err = randomPassword(24)
		if err != nil {
			return false, "", "", err
		}
	}

	existing, err := app.FindFirstRecordByFilter(collection, "email = {:email}", map[string]any{"email": email})
	if err == nil && existing != nil {
		return false, email, "", nil
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return false, "", "", err
	}

	record := core.NewRecord(collection)
	record.Set("email", email)
	record.SetPassword(password)
	if err := app.Save(record); err != nil {
		return false, "", "", err
	}
	return true, email, password, nil
}

func randomPassword(n int) (string, error) {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	for i := range b {
		b[i] = letters[int(b[i])%len(letters)]
	}
	return string(b), nil
}
```

Update `bootstrap` to return the created superuser info and print it:

```go
func bootstrap(app core.App) error {
	// ... existing ensure* / seed* calls unchanged ...
	created, email, password, err := ensureSuperuser(app)
	if err != nil {
		return err
	}
	if created {
		fmt.Printf("\nBlogku admin created:\n  URL:  %s\n  Email: %s\n  Password: %s\n  (save these now — shown only once)\n\n", "http://127.0.0.1:8090", email, password)
	}
	return nil
}
```

Add imports `crypto/rand`. (The final URL print will be refined in Task 6 to use the actual `--http` flag.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test . -run TestEnsureSuperuserGeneratesCredentials -count=1`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/main.go backend/main_test.go
git commit -m "feat(backend): auto-provision admin with random password"
```

---

### Task 6: Print actual URL + end-to-end verification

**Files:**
- Modify: `backend/main.go` (use `--http` value for the printed URL)

**Interfaces:**
- Consumes: existing PB `serve` command flag `--http`.

- [ ] **Step 1: Use the serve flag for the printed URL**

In `main()`, capture the http address before start and pass it to bootstrap so the printed URL reflects the real bind address:

```go
func main() {
	app := pocketbase.New()

	serveCmd := app.Serve()

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		httpAddr := se.Config.HttpAddr // e.g. "127.0.0.1:8090"
		if err := bootstrap(app, httpAddr); err != nil {
			return fmt.Errorf("bootstrap: %w", err)
		}
		// ... SPA handler registration (Task 4) ...
		return se.Next()
	})

	if err := serveCmd.Execute(); err != nil {
		log.Fatal(err)
	}
}
```

Update `bootstrap(app core.App, httpAddr string)` and the print to use `"http://"+httpAddr`.

- [ ] **Step 2: Fresh-dir end-to-end verification**

Run:
```bash
rm -rf /tmp/blogku-e2e
bash backend/build.sh
./backend/blogku serve --http=127.0.0.1:8090 --dir=/tmp/blogku-e2e
```
Expected output (first run): prints a URL + generated admin email/password, twice-max (once). Then verify:

```bash
curl -s http://127.0.0.1:8090/ | grep -q "<html"        # SPA served
curl -s -X POST http://127.0.0.1:8090/api/collections/users/auth-with-password \
  -H 'Content-Type: application/json' \
  -d '{"identity":"demo","password":"demo12345"}' | grep -q '"token"'  # demo seed login works
```
Then stop, re-run on same dir → confirm credentials are NOT printed again (second run).

- [ ] **Step 3: Commit**

```bash
git add backend/main.go
git commit -m "feat(backend): print real serve URL on first run"
```

---

### Task 7: Docs + release note

**Files:**
- Modify: `README.md`
- Create: `docs/blogku-single-binary-setup.md` (usage guide)

- [ ] **Step 1: Write usage guide**

Create `docs/blogku-single-binary-setup.md` documenting:

- Prereq: one Linux amd64 binary `blogku`, nothing else.
- Run: `./blogku serve` (defaults `127.0.0.1:8090`, `pb_data`).
- First run behavior: auto-creates admin, prints URL + credentials once.
- Custom address/data dir: `./blogku serve --http=0.0.0.0:8090 --dir=/srv/blogku/data`.
- Rebuild from source: `bash backend/build.sh`.
- Note: no domain/HTTPS guidance (out of scope).

- [ ] **Step 2: Update root README**

Add a "Quick start (single-binary)" section near the top pointing to `docs/blogku-single-binary-setup.md`.

- [ ] **Step 3: Commit**

```bash
git add README.md docs/blogku-single-binary-setup.md
git commit -m "docs: single-binary setup guide"
```

---

## Self-Review

- Spec coverage: all 4 spec requirements map — embed (Task 2/4), same-origin (Task 1), auto-provision+print (Task 5/6), Linux build (Task 2/7). Out-of-scope items (domain/HTTPS/S3/Docker/Windows) are not implemented.
- Placeholders: none; all steps have concrete code/commands.
- Type consistency: `ensureSuperuser` new signature `(bool, string, string, error)` used consistently in Task 5 test, implementation, and bootstrap; `bootstrap(app, httpAddr)` signature consistent across Tasks 5-6; `embeddedDist` + `newSPAHandler` names consistent across Tasks 2-4.
