# Draw!

An architectural annotation tool for construction projects. Upload building drawings, place categorised notes, collect comments from clients and collaborators, then export self-contained HTML archives for offline records.

Built for architects, designers, and project managers who need a simple, self-hosted way to manage drawing markup across project stages.

## Features

- **Drawing annotation** — upload images (PNG, JPG), SVGs, or PDFs, place numbered pins, add text notes categorised as Questions or Descriptions
- **PDF support** — client-side PDF rendering with page selection for multi-page documents and a progress bar during processing
- **Comments and attribution** — named comments on any annotation, with full edit history
- **Markup drawing** — freehand markup directly on plans
- **Project stages** — organise drawings into custom stages (e.g. Design, Construction, Handover) with drag-and-drop movement between them
- **Admin setup** — password-protected admin page for project configuration, stage management, and drawing import
- **Client login** — separate password for client access to the index
- **Shared backend** — all clients work against a single shared dataset, so multiple people can collaborate remotely
- **HTML export** — export individual drawings or entire stages as self-contained HTML archives (zip)
- **JSON export/import** — back up and restore drawing data
- **Offline-ready archives** — exported HTML files work without a server, with all data embedded
- **Responsive** — works on desktop and tablet

## Quick start

```sh
git clone https://github.com/robannable/Draw.git my-project
cd my-project
npm install
cp .env.example .env
```

Edit `.env` to set your passwords:

```
PORT=3001
CLIENT_PASSWORD=your-client-password
ADMIN_PASSWORD=your-admin-password
```

Start the API and the Vite dev server in two terminals:

```sh
npm run server     # terminal 1 — API on :3001
npm run dev        # terminal 2 — Vite on :3000 (proxies /api to 3001)
```

Open `http://localhost:3000` for the client view, or `http://localhost:3000/#admin` for project setup.

## Deploy to a VPS

Build the static files:

```sh
npm run build
```

Then run the Node API as a long-running process (systemd, pm2, or similar):

```sh
NODE_ENV=production npm run start
```

The API listens on `PORT` (default 3001) and reads/writes `server/data.json`.

### Fronting with nginx (recommended)

```nginx
# http context (e.g. /etc/nginx/conf.d/draw.conf or inside http { } in nginx.conf)
limit_req_zone $binary_remote_addr zone=draw_api:10m rate=600r/m;

server {
    listen 80;
    server_name your-domain.com;
    root /var/www/draw/dist;
    index index.html;

    # SPA fallback (only needed if you use non-hash deep links; hash routing works without this)
    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        # Active editing autosaves at 2–3 PUT/sec; generic "general" zones with
        # low burst (e.g. 30 r/m burst=20) will 503 the client and, with
        # fail2ban nginx-limit-req in play, earn an hour-long ban.
        limit_req zone=draw_api burst=200 nodelay;

        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

> **fail2ban note:** if you run the `nginx-limit-req` jail, default `maxretry=5 / findtime=600 / bantime=3600` is too aggressive for this app's save cadence. Values around `maxretry=20 / findtime=60 / bantime=600` catch real scrapers without banning editors on a momentary burst.

> **Note:** Ensure your nginx `mime.types` file maps `.mjs` to `application/javascript`. The PDF worker is an ES module (`.mjs`) and browsers will reject it if served with the wrong MIME type. Check for this line:
> ```
> application/javascript    js mjs;
> ```

### Without a fronting web server

Set `SERVE_STATIC=true` in `.env` and Node will serve the built `dist/` directly. Not recommended for production but handy for quick trials.

## Starting a new project

1. Visit `/#admin` and enter the admin password
2. Set the project name, client name, reference, and address
3. Create and configure your stages (names, colours, order)
4. Share the client password with your collaborators
5. They log in at the root URL to view and annotate drawings

## How data is stored

All project data lives on the server in `server/data.json`. Clients fetch state from the API and poll every 5 seconds for updates, so multiple users working simultaneously see each other's changes within a few seconds.

- Back up `server/data.json` regularly — it's the only source of truth
- Use the JSON export for per-drawing backups
- Use the HTML export to create permanent, portable archives

### Collaboration notes

- Saves are per-drawing, so collisions only happen when two users edit the same drawing at the same moment. Last write wins.
- While a drawing is open in the editor, remote polling pauses so your in-progress work isn't overwritten.
- Admin settings (project name, stages, etc.) are written only when you click Save.

## New deployment per project

Each client project should be a fresh deployment. Clone the repo, set passwords, build, and run. This keeps projects isolated, passwords separate, and each project's `data.json` independent.

## Tech

- [Vite](https://vite.dev) + [React](https://react.dev) 18
- [Express](https://expressjs.com) API, JSON-file storage
- No CSS framework — inline styles throughout
- [pdfjs-dist](https://mozilla.github.io/pdf.js/) for client-side PDF rendering
- [JSZip](https://stuk.github.io/jszip/) for stage export
- [DM Sans](https://fonts.google.com/specimen/DM+Sans) + [DM Mono](https://fonts.google.com/specimen/DM+Mono) via Google Fonts

## Project structure

```
src/
  main.jsx            Entry point
  App.jsx             Index page, routing, client login
  Admin.jsx           Admin settings, stage management, import
  drawing-notes.jsx   Drawing editor, annotations, export
  api.js              Client wrapper for the backend
server/
  index.js            Express API (login, state, projects, settings)
  data.json           Created at runtime (gitignored)
index.html            HTML shell
vite.config.js        Vite config + /api dev proxy
.env.example          Config template
```

## Licence

See repository for licence details.
