# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm install          # install dependencies
npm run server       # start API on port 3001 (reads server/.env or .env)
npm run dev          # start Vite dev server on port 3000 (proxies /api to 3001)
npm run build        # production build to dist/
npm run start        # production: run API server (optionally serving dist/)
```

No linter, formatter, or test suite is configured.

## Environment

Copy `.env.example` to `.env` (at repo root) and set `CLIENT_PASSWORD` and `ADMIN_PASSWORD`. These are read **server-side only** — they never ship in the JS bundle. Also set `PORT` (default 3001) and optionally `SERVE_STATIC=true` if Node should serve the built frontend directly.

## Architecture

React 18 + Vite SPA with a minimal Node/Express API. Data lives in a single JSON file on the server (`server/data.json`), so any client with the password sees the same state. No external state management — pure `useState` and props. No CSS framework — all styles are inline JS objects.

### Source files

**Frontend** (`src/`)
- **`main.jsx`** — React bootstrap
- **`App.jsx`** — Hash router (`/` vs `/#admin`), client login gate, stage-based kanban index with project cards and thumbnails. Polls `GET /api/state` every 5s while on the index.
- **`Admin.jsx`** — Admin login, project metadata form, dynamic stage CRUD with color presets, JSON import. Exports `DEFAULT_STAGES`, `COLOR_PRESETS`.
- **`drawing-notes.jsx`** — Drawing editor with three tools (SELECT/ANNOTATE/MARKUP), SVG canvas with zoom/pan, annotation pins with comments and history, freehand markup strokes, HTML/JSON export. Exports `NOTE_TYPES`, `NOTE_TYPE_KEYS`, `buildOfflineHTML()`.
- **`api.js`** — `fetch` wrapper for the backend. Handles the token in `sessionStorage` and exposes `login`, `logout`, `getState`, `saveProject`, `deleteProject`, `saveSettings`.

**Backend** (`server/`)
- **`index.js`** — Express app. Endpoints: `POST /api/login`, `POST /api/logout`, `GET /api/state`, `PUT /api/projects/:id`, `DELETE /api/projects/:id`, `PUT /api/settings`. Tokens live in memory (server restart invalidates them). State is written atomically via temp-file + rename.
- **`data.json`** — Created at runtime, gitignored. Shape: `{ settings: {...}, projects: [...] }`.

### Key patterns

- **Routing** is hash-based (`/#admin`). No server rewrite rules needed for the SPA.
- **Auth** is a shared-password model enforced server-side. `POST /api/login` with `{ password, role }` returns a bearer token. The admin password can also log in as admin (admins get client access too).
- **Persistence** is the JSON file. Writes are serialised through a promise queue and flushed via `rename(tmp, data.json)` so readers never see a partial file.
- **Collaboration** is last-write-wins with 5-second polling. Clients save per-drawing, so the collision window is small, but two users editing the same drawing at the same moment can overwrite each other — accept this or add versioning.
- **Editing isolation**: polling is paused while a drawing is open in the editor so remote changes don't clobber in-flight edits. A fresh fetch happens on return to the index.
- **Coordinate system** uses `SVG.getScreenCTM()` for accurate screen-to-image coordinate conversion across zoom levels. The `getSVGPoint()` and `cPos()` helpers handle this.
- **HTML export** produces self-contained single-file HTML with embedded base64 images and inline JS — works fully offline.
- **Stage export** bundles all drawings in a stage into a ZIP using JSZip.
- **Shared color palette** is defined as `const C` in each component (ink, bg, paper, border, muted, red).
- **Note types** (Question/Description) are decoupled from stages — defined in `drawing-notes.jsx` and imported by `App.jsx`.

### Deployment

Typical VPS layout: nginx serves the built `dist/` directory and reverse-proxies `/api/*` to the Node process on 127.0.0.1:3001. Example nginx location block:

```nginx
location /api/ {
    limit_req zone=draw_api burst=200 nodelay;  # paired with a 600 r/m zone at http level
    proxy_pass http://127.0.0.1:3001;
}
```

Active editing autosaves at 2–3 PUT/sec, so any rate-limit zone applied to `/api/` needs a generous burst — see the README for the full `limit_req_zone` declaration and a fail2ban sizing note.

If you don't have a fronting web server, run Node with `SERVE_STATIC=true` and it will serve `dist/` itself.

### Constraints to be aware of

- Large base64 images bloat `data.json`; the JSON body limit is 25 MB.
- Annotation numbers auto-renumber on delete (no gaps).
- Single responsive breakpoint at 768px.
- Each deployment is intended to be one project — separate clone/install per client.
- Passwords are compared server-side, but there is no per-user identity. Anyone with the password can read or write all drawings.
