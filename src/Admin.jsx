import { useState, useEffect } from "react";

const C = {
  ink: "#1a1a1a", bg: "#f5f2ed", paper: "#ffffff",
  border: "#d4cfc7", muted: "#8a8478", red: "#c4342d",
};

const ADMIN_PW = import.meta.env.VITE_ADMIN_PASSWORD || "admin";

function loadSettings() {
  try { return JSON.parse(localStorage.getItem("draw-settings") || "{}"); }
  catch { return {}; }
}

export function getSettings() {
  return loadSettings();
}

export default function Admin({ onBack }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("draw-admin-session") === "true");
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [projectRef, setProjectRef] = useState("");
  const [description, setDescription] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (authed) {
      const s = loadSettings();
      setProjectName(s.projectName || "");
      setClientName(s.clientName || "");
      setProjectAddress(s.projectAddress || "");
      setProjectRef(s.projectRef || "");
      setDescription(s.description || "");
    }
  }, [authed]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pw === ADMIN_PW) {
      sessionStorage.setItem("draw-admin-session", "true");
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  const handleSave = () => {
    const settings = { projectName, clientName, projectAddress, projectRef, description };
    localStorage.setItem("draw-settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("draw-admin-session");
    setAuthed(false);
    setPw("");
  };

  const inputStyle = {
    width: "100%", fontSize: 15, fontFamily: "'DM Sans',sans-serif",
    border: `1px solid ${C.border}`, padding: "10px 12px", borderRadius: 0,
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle = {
    fontSize: 12, fontFamily: "'DM Mono',monospace", color: C.muted,
    display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em",
  };

  // Login screen
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", padding: 20 }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet" />
        <div style={{ background: C.paper, border: `1px solid ${C.border}`, maxWidth: 400, width: "100%", padding: "40px 36px" }}>
          <h1 style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 500, marginBottom: 6, color: C.ink }}>Admin</h1>
          <p style={{ fontSize: 14, color: C.muted, margin: "0 0 24px", lineHeight: 1.5 }}>
            Enter admin password to configure project settings.
          </p>
          <form onSubmit={handleLogin}>
            <label style={{ display: "block", marginBottom: 16 }}>
              <span style={labelStyle}>Password</span>
              <input type="password" value={pw} onChange={e => { setPw(e.target.value); setPwError(false); }}
                autoFocus style={inputStyle} />
            </label>
            {pwError && <p style={{ fontSize: 13, color: C.red, margin: "0 0 12px" }}>Incorrect password.</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" style={{
                flex: 1, background: C.ink, color: "#fff", border: "none", padding: "12px 20px",
                fontSize: 13, fontFamily: "'DM Mono',monospace", fontWeight: 500, cursor: "pointer",
              }}>Sign In</button>
              <button type="button" onClick={onBack} style={{
                background: "transparent", color: C.ink, border: `1px solid ${C.border}`, padding: "12px 20px",
                fontSize: 13, fontFamily: "'DM Mono',monospace", fontWeight: 500, cursor: "pointer",
              }}>Back</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Settings form
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.paper, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, fontWeight: 500, color: C.ink, margin: 0 }}>Project Settings</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "4px 0 0", fontFamily: "'DM Mono',monospace" }}>Admin</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onBack} style={{
            background: "transparent", color: C.ink, border: `1px solid ${C.border}`, padding: "8px 16px",
            fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 500, cursor: "pointer",
          }}>← Back to Drawings</button>
          <button onClick={handleLogout} style={{
            background: "transparent", color: C.muted, border: `1px solid ${C.border}`, padding: "8px 16px",
            fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 500, cursor: "pointer",
          }}>Sign Out</button>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 28px" }}>
        <div style={{ background: C.paper, border: `1px solid ${C.border}`, padding: "32px 28px" }}>

          <label style={{ display: "block", marginBottom: 20 }}>
            <span style={labelStyle}>Project Name</span>
            <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. 14 Grafton St Renovation"
              style={inputStyle} />
          </label>

          <label style={{ display: "block", marginBottom: 20 }}>
            <span style={labelStyle}>Client Name</span>
            <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Smith & Partners"
              style={inputStyle} />
          </label>

          <label style={{ display: "block", marginBottom: 20 }}>
            <span style={labelStyle}>Project Address</span>
            <input value={projectAddress} onChange={e => setProjectAddress(e.target.value)} placeholder="e.g. 14 Grafton St, Dublin 2"
              style={inputStyle} />
          </label>

          <label style={{ display: "block", marginBottom: 20 }}>
            <span style={labelStyle}>Project Reference</span>
            <input value={projectRef} onChange={e => setProjectRef(e.target.value)} placeholder="e.g. PRJ-2026-041"
              style={inputStyle} />
          </label>

          <label style={{ display: "block", marginBottom: 24 }}>
            <span style={labelStyle}>Description</span>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Brief project description…"
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
          </label>

          <button onClick={handleSave} style={{
            width: "100%", background: C.ink, color: "#fff", border: "none", padding: "12px 20px",
            fontSize: 13, fontFamily: "'DM Mono',monospace", fontWeight: 500, cursor: "pointer",
          }}>{saved ? "Saved" : "Save Settings"}</button>
        </div>

        <p style={{ fontSize: 11, color: C.muted, marginTop: 20, lineHeight: 1.6, fontFamily: "'DM Mono',monospace", textAlign: "center" }}>
          These details appear on the client-facing index page.
          <br />
          Passwords are configured in the .env file before deployment.
        </p>
      </div>
    </div>
  );
}
