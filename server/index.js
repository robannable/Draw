// Minimal JSON-file-backed API for Draw.
// Stores { settings, projects } in server/data.json.
// Auth: two server-side passwords (client/admin) exchanged for random tokens
// kept in memory. Restarting the server invalidates all tokens.

import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT || "3001", 10);
const CLIENT_PASSWORD = process.env.CLIENT_PASSWORD || "client";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const SERVE_STATIC = process.env.SERVE_STATIC === "true";
const DATA_FILE = path.join(__dirname, "data.json");

// ---------- Storage (JSON file with serialised writes) ----------
const EMPTY = { settings: {}, projects: [] };

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      settings: parsed.settings || {},
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    };
  } catch (err) {
    if (err.code === "ENOENT") return { ...EMPTY };
    throw err;
  }
}

let writeQueue = Promise.resolve();
function writeData(next) {
  writeQueue = writeQueue.then(() => new Promise((resolve, reject) => {
    const tmp = DATA_FILE + ".tmp";
    fs.writeFile(tmp, JSON.stringify(next, null, 2), (err) => {
      if (err) return reject(err);
      fs.rename(tmp, DATA_FILE, (err2) => err2 ? reject(err2) : resolve());
    });
  }));
  return writeQueue;
}

// ---------- Auth (in-memory tokens) ----------
const tokens = new Map(); // token -> role ("client" | "admin")

function issueToken(role) {
  const t = crypto.randomBytes(24).toString("hex");
  tokens.set(t, role);
  return t;
}

function authRole(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer (.+)$/);
  if (!m) return null;
  return tokens.get(m[1]) || null;
}

function requireAuth(roles) {
  return (req, res, next) => {
    const role = authRole(req);
    if (!role || !roles.includes(role)) {
      return res.status(401).json({ error: "unauthorized" });
    }
    req.role = role;
    next();
  };
}

// ---------- App ----------
const app = express();
app.use(express.json({ limit: "25mb" })); // base64 images can be large

app.post("/api/login", (req, res) => {
  const { password, role } = req.body || {};
  if (role === "admin" && password === ADMIN_PASSWORD) {
    return res.json({ token: issueToken("admin"), role: "admin" });
  }
  if (role === "client" && password === CLIENT_PASSWORD) {
    return res.json({ token: issueToken("client"), role: "client" });
  }
  // Admin token also grants client access (so admins can view drawings)
  if (role === "client" && password === ADMIN_PASSWORD) {
    return res.json({ token: issueToken("admin"), role: "admin" });
  }
  res.status(401).json({ error: "invalid password" });
});

app.post("/api/logout", (req, res) => {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer (.+)$/);
  if (m) tokens.delete(m[1]);
  res.json({ ok: true });
});

// Settings (admin-only writes, any auth reads)
app.get("/api/state", requireAuth(["client", "admin"]), (_req, res) => {
  res.json(readData());
});

app.put("/api/settings", requireAuth(["admin"]), async (req, res) => {
  const data = readData();
  data.settings = req.body || {};
  await writeData(data);
  res.json({ ok: true, settings: data.settings });
});

// Projects (any auth)
app.put("/api/projects/:id", requireAuth(["client", "admin"]), async (req, res) => {
  const { id } = req.params;
  const project = { ...(req.body || {}), id };
  const data = readData();
  const idx = data.projects.findIndex(p => p.id === id);
  if (idx === -1) data.projects.push(project);
  else data.projects[idx] = project;
  await writeData(data);
  res.json({ ok: true, project });
});

app.delete("/api/projects/:id", requireAuth(["client", "admin"]), async (req, res) => {
  const { id } = req.params;
  const data = readData();
  data.projects = data.projects.filter(p => p.id !== id);
  await writeData(data);
  res.json({ ok: true });
});

// Optional static hosting (set SERVE_STATIC=true to serve dist/ from Node).
// Typical deployment: nginx serves dist/ and proxies /api/* here.
if (SERVE_STATIC) {
  const distDir = path.resolve(__dirname, "..", "dist");
  app.use(express.static(distDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Draw API listening on http://127.0.0.1:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
  if (SERVE_STATIC) console.log("Serving static dist/ (SERVE_STATIC=true)");
});
