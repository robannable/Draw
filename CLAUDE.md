# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm install          # install dependencies
npm run dev          # start Vite dev server on port 3000
npm run build        # production build to dist/
npm run preview      # preview production build
```

No linter, formatter, or test suite is configured.

## Environment

Copy `.env.example` to `.env` and set `VITE_ADMIN_PASSWORD` and `VITE_CLIENT_PASSWORD`. These are baked into the JS bundle at build time via `import.meta.env.VITE_*`.

## Architecture

React 18 + Vite SPA with zero backend. All data lives in browser `localStorage`. No external state management — pure `useState` and props. No CSS framework — all styles are inline JS objects.

### Four source files

- **`src/main.jsx`** — React bootstrap
- **`src/App.jsx`** — Pathname router (`/` vs `/admin`), client login gate, stage-based kanban index with project cards and thumbnails
- **`src/Admin.jsx`** — Admin login, project metadata form, dynamic stage CRUD with color presets, JSON import. Exports `getSettings()`, `getStages()`, `DEFAULT_STAGES`, `COLOR_PRESETS`
- **`src/drawing-notes.jsx`** — Drawing editor with three tools (SELECT/ANNOTATE/MARKUP), SVG canvas with zoom/pan, annotation pins with comments and history, freehand markup strokes, HTML/JSON export. Exports `NOTE_TYPES`, `NOTE_TYPE_KEYS`, `buildOfflineHTML()`

### Key patterns

- **Routing** is hash-based (`/#admin`). No server configuration needed — works with any static file server.
- **Auth** uses `sessionStorage` tokens (separate for client and admin). Passwords are compared client-side — this is UX gatekeeping, not real security.
- **localStorage keys**: `"draw-projects"` (array of project objects) and `"draw-settings"` (project metadata + stages config).
- **Coordinate system** uses `SVG.getScreenCTM()` for accurate screen-to-image coordinate conversion across zoom levels. The `getSVGPoint()` and `cPos()` helpers handle this.
- **HTML export** produces self-contained single-file HTML with embedded base64 images and inline JS — works fully offline.
- **Stage export** bundles all drawings in a stage into a ZIP using JSZip.
- **Shared color palette** is defined as `const C` in each component (ink, bg, paper, border, muted, red).
- **Note types** (Question/Description) are decoupled from stages — defined in `drawing-notes.jsx` and imported by `App.jsx`.

### Constraints to be aware of

- Large images stored as base64 in localStorage can hit the ~5-10MB per-origin browser limit.
- Annotation numbers auto-renumber on delete (no gaps).
- Single responsive breakpoint at 768px.
- Each deployment is intended to be one project — separate clone/build per client.
