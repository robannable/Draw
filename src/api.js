// Thin wrapper around the Draw backend.
// Token is kept in sessionStorage so a refresh doesn't force re-login,
// but tabs/sessions don't share it.

const TOKEN_KEY = "draw-token";
const ROLE_KEY = "draw-role";

export function getToken() { return sessionStorage.getItem(TOKEN_KEY); }
export function getRole() { return sessionStorage.getItem(ROLE_KEY); }
export function isAuthed() { return !!getToken(); }
export function isAdmin() { return getRole() === "admin"; }

function setAuth(token, role) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(ROLE_KEY, role);
}

function clearAuth() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ROLE_KEY);
}

async function request(method, url, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) {
    clearAuth();
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function login(password, role) {
  const res = await request("POST", "/api/login", { password, role });
  setAuth(res.token, res.role);
  return res.role;
}

export async function logout() {
  try { await request("POST", "/api/logout"); } catch {}
  clearAuth();
}

export async function getState() {
  return request("GET", "/api/state");
}

export async function saveProject(project) {
  return request("PUT", `/api/projects/${encodeURIComponent(project.id)}`, project);
}

export async function deleteProject(id) {
  return request("DELETE", `/api/projects/${encodeURIComponent(id)}`);
}

export async function saveSettings(settings) {
  return request("PUT", "/api/settings", settings);
}
