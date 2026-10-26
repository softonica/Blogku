# Blogku Single-Binary Setup

Blogku ships as a single Linux binary that bundles both the PocketBase backend and
the Vue 3 frontend (embedded SPA). No separate frontend build, environment
variables, or external database are required to get a running Blogku instance.

---

## Prerequisite

- One Linux amd64 binary named `blogku`. That's it — nothing else to install.

## Run

```bash
./blogku serve
```

By default the server listens on `127.0.0.1:8090` and stores its data (SQLite
database + media storage) in a local `pb_data/` directory next to the binary.

## First-run behavior

On the first run, Blogku automatically:

- creates the `pb_data/` directory (database schema + storage),
- seeds the default collections, site settings, static pages, and a demo user,
- provisions an admin superuser with a generated random password,
- prints the admin URL and credentials to the console **once**.

```
Blogku admin created:
  URL:  http://127.0.0.1:8090
  Email: admin@blogku.com
  Password: <random>
  (save these now — shown only once)
```

**Save these credentials immediately** — they are not shown again on subsequent
runs. If you lose them, delete the `pb_data/` directory and start over.

## Custom address / data dir

```bash
./blogku serve --http=0.0.0.0:8090 --dir=/srv/blogku/data
```

- `--http` sets the listen address (default `127.0.0.1:8090`).
- `--dir` sets the data directory (default `pb_data`).

## Rebuild from source

```bash
bash backend/build.sh
```

The build script builds the frontend (`vite build`), copies the output into
`backend/dist/`, then compiles the Go binary. The result is written to
`backend/blogku`.

## Notes

- Domain / HTTPS / reverse-proxy guidance is **out of scope** for the
  single-binary setup. By default the server listens on localhost; expose it
  behind your own reverse proxy or firewall at your own discretion.
- Target platform is Linux amd64 only (see the `GOOS=linux GOARCH=amd64` build
  in `backend/build.sh`).
