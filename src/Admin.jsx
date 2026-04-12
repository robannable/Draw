import { useState, useEffect, useRef } from "react";
import * as api from "./api.js";

const C = {
  ink: "#1a1a1a", bg: "#f5f2ed", paper: "#ffffff",
  border: "#d4cfc7", muted: "#8a8478", red: "#c4342d",
};

export const DEFAULT_STAGES = [
  { id: "design", label: "Design", color: "#2563eb", bg: "#eff6ff", active: true },
  { id: "construction", label: "Construction", color: "#d97706", bg: "#fffbeb", active: true },
  { id: "handover", label: "Handover", color: "#059669", bg: "#ecfdf5", active: true },
];

export const COLOR_PRESETS = [
  { color: "#2563eb", bg: "#eff6ff" },
  { color: "#d97706", bg: "#fffbeb" },
  { color: "#059669", bg: "#ecfdf5" },
  { color: "#dc2626", bg: "#fef2f2" },
  { color: "#7c3aed", bg: "#f5f3ff" },
  { color: "#0891b2", bg: "#ecfeff" },
  { color: "#ea580c", bg: "#fff7ed" },
  { color: "#4f46e5", bg: "#eef2ff" },
  { color: "#db2777", bg: "#fdf2f8" },
  { color: "#475569", bg: "#f8fafc" },
];

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function stageId(label, existing) {
  let base = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!base) base = "stage";
  let id = base;
  let n = 2;
  while (existing.some(s => s.id === id)) { id = `${base}-${n++}`; }
  return id;
}

export default function Admin({ onBack }) {
  const [authed, setAuthed] = useState(() => api.isAdmin());
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [busy, setBusy] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [projectRef, setProjectRef] = useState("");
  const [description, setDescription] = useState("");
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [newStageName, setNewStageName] = useState("");
  const [colorPickerOpen, setColorPickerOpen] = useState(null);
  const [importStage, setImportStage] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const importRef = useRef(null);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        const state = await api.getState();
        if (cancelled) return;
        const s = state.settings || {};
        setProjectName(s.projectName || "");
        setClientName(s.clientName || "");
        setProjectAddress(s.projectAddress || "");
        setProjectRef(s.projectRef || "");
        setDescription(s.description || "");
        setStages(s.stages || DEFAULT_STAGES);
      } catch (err) {
        if (cancelled) return;
        if (err.message === "unauthorized") setAuthed(false);
        else setSaveError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [authed]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.login(pw, "admin");
      setAuthed(true);
      setPwError("");
    } catch (err) {
      setPwError(err.message === "invalid password" ? "Incorrect password." : `Login failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    const settings = { projectName, clientName, projectAddress, projectRef, description, stages };
    setSaveError("");
    try {
      await api.saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      if (err.message === "unauthorized") setAuthed(false);
      else setSaveError(err.message);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setAuthed(false);
    setPw("");
  };

  // Stage management
  const moveStage = (idx, dir) => {
    setStages(prev => {
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };
  const toggleStage = (idx) => {
    setStages(prev => prev.map((s, i) => i === idx ? { ...s, active: !s.active } : s));
  };
  const renameStage = (idx, label) => {
    setStages(prev => prev.map((s, i) => i === idx ? { ...s, label } : s));
  };
  const changeColor = (idx, color, bg) => {
    setStages(prev => prev.map((s, i) => i === idx ? { ...s, color, bg } : s));
    setColorPickerOpen(null);
  };
  const removeStage = (idx) => {
    if (!confirm(`Delete stage "${stages[idx].label}"?`)) return;
    setStages(prev => prev.filter((_, i) => i !== idx));
  };
  const addStage = () => {
    const label = newStageName.trim();
    if (!label) return;
    const usedColors = new Set(stages.map(s => s.color));
    const preset = COLOR_PRESETS.find(c => !usedColors.has(c.color)) || COLOR_PRESETS[0];
    const id = stageId(label, stages);
    setStages(prev => [...prev, { id, label, color: preset.color, bg: preset.bg, active: true }]);
    setNewStageName("");
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const targetStage = importStage || stages.find(s => s.active)?.id;
    if (!targetStage) { alert("No active stage to import into."); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      let project;
      try {
        const d = JSON.parse(ev.target.result);
        project = {
          id: uid(),
          title: d.title || "Imported Drawing",
          date: d.date || new Date().toISOString(),
          phase: targetStage,
          drawingImage: d.drawingImage || null,
          annotations: d.annotations || [],
          markupStrokes: d.markupStrokes || [],
          imgSize: d.imgSize || { w: 1000, h: 700 },
        };
      } catch { alert("Invalid project file"); return; }
      try {
        await api.saveProject(project);
        const stageLabel = stages.find(s => s.id === targetStage)?.label || targetStage;
        setImportResult(`Imported "${project.title}" into ${stageLabel}`);
        setTimeout(() => setImportResult(null), 3000);
      } catch (err) {
        alert(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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

  const smallBtn = (disabled) => ({
    background: "transparent", border: `1px solid ${C.border}`, color: disabled ? C.border : C.muted,
    width: 24, height: 24, borderRadius: 3, cursor: disabled ? "default" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontFamily: "'DM Mono',monospace", padding: 0, lineHeight: 1,
  });

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
              <input type="password" value={pw} onChange={e => { setPw(e.target.value); setPwError(""); }}
                autoFocus style={inputStyle} />
            </label>
            {pwError && <p style={{ fontSize: 13, color: C.red, margin: "0 0 12px" }}>{pwError}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" disabled={busy} style={{
                flex: 1, background: C.ink, color: "#fff", border: "none", padding: "12px 20px",
                fontSize: 13, fontFamily: "'DM Mono',monospace", fontWeight: 500, cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.6 : 1,
              }}>{busy ? "Signing in…" : "Sign In"}</button>
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

          {/* ---- Project Stages ---- */}
          <div style={{ marginBottom: 24 }}>
            <span style={labelStyle}>Project Stages</span>
            <p style={{ fontSize: 12, color: C.muted, margin: "0 0 12px", lineHeight: 1.5 }}>
              Stages define the progression of your project. Order matters — drawings move from top to bottom.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {stages.map((s, i) => (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                  border: `1px solid ${C.border}`, borderRadius: 4,
                  background: s.active ? C.paper : "#f5f2ed",
                  opacity: s.active ? 1 : 0.55,
                }}>
                  {/* Color dot / picker trigger */}
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setColorPickerOpen(colorPickerOpen === i ? null : i)} style={{
                      width: 18, height: 18, borderRadius: "50%", background: s.color,
                      border: "2px solid #fff", boxShadow: `0 0 0 1px ${C.border}`,
                      cursor: "pointer", padding: 0, flexShrink: 0,
                    }} />
                    {colorPickerOpen === i && (
                      <>
                        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} onClick={() => setColorPickerOpen(null)} />
                        <div style={{
                          position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 100,
                          background: C.paper, border: `1px solid ${C.border}`, borderRadius: 4,
                          padding: 6, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}>
                          {COLOR_PRESETS.map((cp, ci) => (
                            <button key={ci} onClick={() => changeColor(i, cp.color, cp.bg)} style={{
                              width: 22, height: 22, borderRadius: "50%", background: cp.color,
                              border: s.color === cp.color ? "2px solid #1a1a1a" : "2px solid transparent",
                              cursor: "pointer", padding: 0,
                            }} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Label */}
                  <input value={s.label} onChange={e => renameStage(i, e.target.value)}
                    style={{
                      flex: 1, fontSize: 13, fontFamily: "'DM Mono',monospace", fontWeight: 500,
                      border: "none", background: "transparent", outline: "none",
                      color: s.active ? C.ink : C.muted, padding: "2px 4px", minWidth: 0,
                    }} />

                  {/* Active toggle */}
                  <button onClick={() => toggleStage(i)} title={s.active ? "Deactivate" : "Activate"}
                    style={{
                      ...smallBtn(false),
                      background: s.active ? "#059669" : "transparent",
                      color: s.active ? "#fff" : C.muted,
                      border: s.active ? "1px solid #059669" : `1px solid ${C.border}`,
                      fontSize: 10, fontWeight: 700,
                    }}>{s.active ? "ON" : "OFF"}</button>

                  {/* Reorder */}
                  <button onClick={() => moveStage(i, -1)} disabled={i === 0} title="Move up"
                    style={smallBtn(i === 0)}>↑</button>
                  <button onClick={() => moveStage(i, 1)} disabled={i === stages.length - 1} title="Move down"
                    style={smallBtn(i === stages.length - 1)}>↓</button>

                  {/* Delete */}
                  <button onClick={() => removeStage(i)} title="Delete stage"
                    style={{ ...smallBtn(false), color: C.red, borderColor: `${C.red}40` }}>×</button>
                </div>
              ))}
            </div>

            {/* Add stage */}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input value={newStageName} onChange={e => setNewStageName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addStage()}
                placeholder="New stage name…"
                style={{ flex: 1, fontSize: 13, fontFamily: "'DM Mono',monospace", border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 10px", outline: "none" }} />
              <button onClick={addStage} style={{
                background: C.ink, color: "#fff", border: "none", padding: "6px 14px", borderRadius: 4,
                fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 500, cursor: "pointer",
              }}>Add</button>
            </div>
          </div>

          {/* ---- Import Drawing ---- */}
          <div style={{ marginBottom: 24 }}>
            <span style={labelStyle}>Import Drawing</span>
            <p style={{ fontSize: 12, color: C.muted, margin: "0 0 12px", lineHeight: 1.5 }}>
              Import a .json project file into a specific stage. Useful for loading templates or drawings from previous projects.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select value={importStage} onChange={e => setImportStage(e.target.value)}
                style={{
                  flex: 1, fontSize: 13, fontFamily: "'DM Mono',monospace",
                  border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 10px",
                  outline: "none", background: C.paper, color: C.ink, minWidth: 140,
                }}>
                {stages.filter(s => s.active).map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <button onClick={() => importRef.current?.click()} style={{
                background: C.ink, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 4,
                fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 500, cursor: "pointer",
                whiteSpace: "nowrap",
              }}>Choose .json file</button>
              <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
            </div>
            {importResult && (
              <p style={{ fontSize: 12, color: "#059669", margin: "8px 0 0", fontFamily: "'DM Mono',monospace" }}>{importResult}</p>
            )}
          </div>

          {saveError && (
            <p style={{ fontSize: 12, color: C.red, margin: "0 0 10px", fontFamily: "'DM Mono',monospace" }}>
              {saveError}
            </p>
          )}
          <button onClick={handleSave} style={{
            width: "100%", background: C.ink, color: "#fff", border: "none", padding: "12px 20px",
            fontSize: 13, fontFamily: "'DM Mono',monospace", fontWeight: 500, cursor: "pointer",
          }}>{saved ? "Saved" : "Save Settings"}</button>
        </div>

        <p style={{ fontSize: 11, color: C.muted, marginTop: 20, lineHeight: 1.6, fontFamily: "'DM Mono',monospace", textAlign: "center" }}>
          These details appear on the client-facing index page.
          <br />
          Passwords are configured in the server .env file.
        </p>
      </div>
    </div>
  );
}
