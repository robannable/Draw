import { useState, useEffect, useRef } from "react";
import DrawingNotes from "./drawing-notes.jsx";
import Admin, { getSettings } from "./Admin.jsx";

const PHASES = {
  design:       { label: "Design",       color: "#2563eb", bg: "#eff6ff" },
  construction: { label: "Construction", color: "#d97706", bg: "#fffbeb" },
  handover:     { label: "Handover",     color: "#059669", bg: "#ecfdf5" },
};
const C = {
  ink: "#1a1a1a", bg: "#f5f2ed", paper: "#ffffff",
  border: "#d4cfc7", muted: "#8a8478", red: "#c4342d",
};

const CLIENT_PW = import.meta.env.VITE_CLIENT_PASSWORD || "client";

function loadProjects() {
  try { return JSON.parse(localStorage.getItem("draw-projects") || "[]"); }
  catch { return []; }
}
function saveProjects(projects) {
  localStorage.setItem("draw-projects", JSON.stringify(projects));
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function fmtDate(d) {
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dt = new Date(d); return `${dt.getDate()} ${m[dt.getMonth()]} ${dt.getFullYear()}`;
}

function Thumbnail({ drawingImage, imgSize, annotations, markupStrokes }) {
  if (!drawingImage) return null;
  const w = imgSize?.w || 1000, h = imgSize?.h || 700;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "100%", display: "block" }}>
      <image href={drawingImage} x={0} y={0} width={w} height={h} />
      {(markupStrokes || []).map((s, i) => {
        const pts = s.points || [];
        if (pts.length < 2) return null;
        let d = `M${pts[0].x},${pts[0].y}`;
        for (let j = 1; j < pts.length - 1; j++) {
          const mx = (pts[j].x + pts[j+1].x) / 2, my = (pts[j].y + pts[j+1].y) / 2;
          d += `Q${pts[j].x},${pts[j].y},${mx},${my}`;
        }
        d += `L${pts[pts.length-1].x},${pts[pts.length-1].y}`;
        return <path key={i} d={d} fill="none" stroke={s.color} strokeWidth={Math.max(2, w / 300)} strokeLinecap="round" opacity={0.7} />;
      })}
      {(annotations || []).map(a => {
        const col = PHASES[a.phase]?.color || C.ink;
        const sz = Math.max(w / 40, 16);
        return (
          <g key={a.id} transform={`translate(${a.x},${a.y})`}>
            <circle r={sz / 2} fill={col} stroke="#fff" strokeWidth={Math.max(1, sz / 14)} />
            <text textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={sz * 0.5} fontFamily="monospace" fontWeight="500">{a.number}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ---- Client login ----
function ClientLogin({ onLogin, settings }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const name = settings.projectName || "Drawing Notes";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pw === CLIENT_PW) {
      sessionStorage.setItem("draw-client-session", "true");
      onLogin();
    } else {
      setError(true);
    }
  };

  const inputStyle = {
    width: "100%", fontSize: 15, fontFamily: "'DM Sans',sans-serif",
    border: `1px solid ${C.border}`, padding: "10px 12px", borderRadius: 0,
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet" />
      <div style={{ background: C.paper, border: `1px solid ${C.border}`, maxWidth: 400, width: "100%", padding: "40px 36px" }}>
        <h1 style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 500, marginBottom: 6, color: C.ink }}>{name}</h1>
        {settings.clientName && (
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 4px", fontFamily: "'DM Mono',monospace" }}>{settings.clientName}</p>
        )}
        <p style={{ fontSize: 14, color: C.muted, margin: "0 0 24px", lineHeight: 1.5 }}>
          Enter your password to view project drawings.
        </p>
        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Password</span>
            <input type="password" value={pw} onChange={e => { setPw(e.target.value); setError(false); }}
              autoFocus style={inputStyle} />
          </label>
          {error && <p style={{ fontSize: 13, color: C.red, margin: "0 0 12px" }}>Incorrect password.</p>}
          <button type="submit" style={{
            width: "100%", background: C.ink, color: "#fff", border: "none", padding: "12px 20px",
            fontSize: 13, fontFamily: "'DM Mono',monospace", fontWeight: 500, cursor: "pointer",
          }}>Sign In</button>
        </form>
      </div>
    </div>
  );
}

// ---- Main app ----
export default function App() {
  const [projects, setProjects] = useState(loadProjects);
  const [editing, setEditing] = useState(null);
  const [settings, setSettings] = useState(getSettings);
  const [clientAuthed, setClientAuthed] = useState(() => sessionStorage.getItem("draw-client-session") === "true");
  const [route, setRoute] = useState(() => window.location.hash);
  const importRef = useRef(null);

  // Hash routing
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Refresh settings when coming back from admin
  useEffect(() => { setSettings(getSettings()); }, [route]);

  useEffect(() => { saveProjects(projects); }, [projects]);

  const projectName = settings.projectName || "Drawing Notes";

  // Admin route
  if (route === "#/admin") {
    return <Admin onBack={() => { window.location.hash = ""; setRoute(""); }} />;
  }

  // Client login gate
  if (!clientAuthed) {
    return <ClientLogin settings={settings} onLogin={() => setClientAuthed(true)} />;
  }

  const openProject = (id) => setEditing(id);

  const startNew = (phase) => {
    const id = uid();
    const project = { id, title: "Untitled Drawing", date: new Date().toISOString(), phase, drawingImage: null, annotations: [], markupStrokes: [], imgSize: { w: 1000, h: 700 } };
    setProjects(prev => [...prev, project]);
    setEditing(id);
  };

  const handleSave = (id) => (data) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const handleBack = () => setEditing(null);

  const deleteProject = (id, e) => {
    e.stopPropagation();
    if (confirm("Delete this drawing?")) {
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        const id = uid();
        const project = {
          id,
          title: d.title || "Imported Drawing",
          date: d.date || new Date().toISOString(),
          phase: d.phase || "design",
          drawingImage: d.drawingImage || null,
          annotations: d.annotations || [],
          markupStrokes: d.markupStrokes || [],
          imgSize: d.imgSize || { w: 1000, h: 700 },
        };
        setProjects(prev => [...prev, project]);
      } catch { alert("Invalid project file"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleLogout = () => {
    sessionStorage.removeItem("draw-client-session");
    setClientAuthed(false);
  };

  // Editor view
  if (editing) {
    const project = projects.find(p => p.id === editing);
    if (!project) { setEditing(null); return null; }
    return <DrawingNotes key={editing} initialData={project} onBack={handleBack} onSave={handleSave(editing)} />;
  }

  // Group projects by phase
  const byPhase = { design: [], construction: [], handover: [] };
  projects.forEach(p => {
    const phase = byPhase[p.phase] ? p.phase : "design";
    byPhase[phase].push(p);
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.paper, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, fontWeight: 500, color: C.ink, margin: 0 }}>{projectName}</h1>
          <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
            {settings.clientName && <span style={{ fontSize: 13, color: C.muted, fontFamily: "'DM Mono',monospace" }}>{settings.clientName}</span>}
            {settings.clientName && settings.projectRef && <span style={{ fontSize: 13, color: C.border }}>·</span>}
            {settings.projectRef && <span style={{ fontSize: 13, color: C.muted, fontFamily: "'DM Mono',monospace" }}>{settings.projectRef}</span>}
          </div>
          {settings.projectAddress && <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0", fontFamily: "'DM Mono',monospace" }}>{settings.projectAddress}</p>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.muted, fontFamily: "'DM Mono',monospace" }}>{projects.length} drawing{projects.length !== 1 ? "s" : ""}</span>
          <button onClick={() => importRef.current?.click()} style={{
            background: "transparent", color: C.ink, border: `1px solid ${C.border}`, padding: "8px 16px",
            fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 500, cursor: "pointer", borderRadius: 0,
          }}>Import .json</button>
          <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
          <button onClick={handleLogout} style={{
            background: "transparent", color: C.muted, border: `1px solid ${C.border}`, padding: "8px 16px",
            fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 500, cursor: "pointer", borderRadius: 0,
          }}>Sign Out</button>
        </div>
      </div>

      {/* Project description bar */}
      {settings.description && (
        <div style={{ borderBottom: `1px solid ${C.border}`, background: C.paper, padding: "10px 28px" }}>
          <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5, fontFamily: "'DM Sans',sans-serif" }}>{settings.description}</p>
        </div>
      )}

      {/* Phase columns */}
      <div style={{ display: "flex", gap: 0, minHeight: "calc(100vh - 80px)" }}>
        {Object.entries(PHASES).map(([key, phase], i) => (
          <div key={key} style={{
            flex: 1, minWidth: 0, padding: "24px 20px",
            borderRight: i < 2 ? `1px solid ${C.border}` : "none",
          }}>
            {/* Phase header */}
            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                  background: phase.color,
                }} />
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 500, color: C.ink, textTransform: "uppercase", letterSpacing: "0.05em" }}>{phase.label}</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.muted }}>{byPhase[key].length}</span>
              </div>
              <button onClick={() => startNew(key)} title={`New ${phase.label} drawing`} style={{
                background: "transparent", color: phase.color, border: `1px solid ${phase.color}40`,
                width: 28, height: 28, borderRadius: 4, cursor: "pointer",
                fontSize: 18, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'DM Mono',monospace",
              }}>+</button>
            </div>

            {/* Drawing cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {byPhase[key].length === 0 && (
                <div style={{
                  padding: "32px 16px", textAlign: "center", color: C.muted,
                  fontSize: 12, fontFamily: "'DM Mono',monospace", lineHeight: 1.7,
                  border: `1px dashed ${C.border}`, borderRadius: 4,
                }}>
                  No {phase.label.toLowerCase()} drawings yet.
                  <br />
                  <span onClick={() => startNew(key)} style={{ color: phase.color, cursor: "pointer", textDecoration: "underline" }}>Start one</span>
                </div>
              )}
              {byPhase[key].map(p => (
                <div key={p.id} onClick={() => openProject(p.id)} style={{
                  background: C.paper, border: `1px solid ${C.border}`, borderRadius: 4,
                  cursor: "pointer", overflow: "hidden", transition: "box-shadow 0.15s",
                }} onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
                   onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                  {/* Thumbnail */}
                  <div style={{
                    height: 140, background: "#e8e4de", overflow: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {p.drawingImage ? (
                      <Thumbnail drawingImage={p.drawingImage} imgSize={p.imgSize} annotations={p.annotations} markupStrokes={p.markupStrokes} />
                    ) : (
                      <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: C.muted }}>No image</span>
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}` }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 500, color: C.ink, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.title}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.muted }}>
                        {fmtDate(p.date)} · {(p.annotations || []).length} note{(p.annotations || []).length !== 1 ? "s" : ""}
                      </span>
                      <button onClick={(e) => deleteProject(p.id, e)} title="Delete" style={{
                        background: "none", border: "none", color: C.muted, cursor: "pointer",
                        fontSize: 14, padding: "2px 4px", lineHeight: 1, opacity: 0.5,
                      }} onMouseEnter={e => e.currentTarget.style.opacity = 1}
                         onMouseLeave={e => e.currentTarget.style.opacity = 0.5}>×</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
