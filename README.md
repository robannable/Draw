# Draw!

An architectural annotation tool for construction projects. Upload building drawings, place categorised notes, collect comments from clients and collaborators, then export self-contained HTML archives for offline records.

Built for architects, designers, and project managers who need a simple, self-hosted way to manage drawing markup across project stages.

## Features

- **Drawing annotation** — upload images, place numbered pins, add text notes categorised as Questions or Descriptions
- **Comments and attribution** — named comments on any annotation, with full edit history
- **Markup drawing** — freehand markup directly on plans
- **Project stages** — organise drawings into custom stages (e.g. Design, Construction, Handover) with drag-and-drop movement between them
- **Admin setup** — password-protected admin page for project configuration, stage management, and drawing import
- **Client login** — separate password for client access to the index
- **HTML export** — export individual drawings or entire stages as self-contained HTML archives (zip)
- **JSON export/import** — back up and restore drawing data
- **Offline-ready archives** — exported HTML files work without a server, with all data embedded
- **Responsive** — works on desktop and tablet

## Quick start

```sh
git clone <your-repo-url> my-project
cd my-project
npm install
cp .env.example .env
```

Edit `.env` to set your passwords:

```
VITE_ADMIN_PASSWORD=your-admin-password
VITE_CLIENT_PASSWORD=your-client-password
```

Start the dev server:

```sh
npm run dev
```

Open `http://localhost:3000` for the client view, or `http://localhost:3000/admin` for project setup.

## Deploy to a web server

Build the static files:

```sh
npm run build
```

This produces a `dist/` folder. Upload its contents to any web server or static hosting.

**Important:** because the app uses client-side routing (pathname-based, not hash), your web server must serve `index.html` for all routes. Examples:

**Nginx:**

```nginx
server {
    listen 80;
    root /var/www/draw;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Apache** (`.htaccess` in the `dist/` folder):

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

**Caddy:**

```
your-domain.com {
    root * /var/www/draw
    try_files {path} /index.html
    file_server
}
```

## Starting a new project

1. Visit `/admin` and enter the admin password
2. Set the project name, client name, reference, and address
3. Create and configure your stages (names, colours, order)
4. Share the client password with your collaborators
5. They log in at the root URL to view and annotate drawings

## How data is stored

All project data lives in the browser's `localStorage`. There is no backend database. This means:

- Each browser/device has its own independent data
- Clearing browser data will remove all projects
- Use the JSON export regularly to back up your work
- Use the HTML export to create permanent, portable archives

## New deployment per project

Each client project should be a fresh deployment. Clone the repo, set passwords, build, and upload. This keeps projects isolated and passwords separate.

## Tech

- [Vite](https://vite.dev) + [React](https://react.dev) 18
- No CSS framework — inline styles throughout
- No backend — static files only
- [JSZip](https://stuk.github.io/jszip/) for stage export
- [DM Sans](https://fonts.google.com/specimen/DM+Sans) + [DM Mono](https://fonts.google.com/specimen/DM+Mono) via Google Fonts

## Project structure

```
src/
  main.jsx            Entry point
  App.jsx             Index page, routing, client login
  Admin.jsx           Admin settings, stage management, import
  drawing-notes.jsx   Drawing editor, annotations, export
index.html            HTML shell
vite.config.js        Vite config (port 3000)
.env.example          Password template
```

## Licence

See repository for licence details.
