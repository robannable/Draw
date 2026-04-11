import { useState, useEffect } from "react";
import DrawingNotes, { NOTE_TYPES, NOTE_TYPE_KEYS, buildOfflineHTML } from "./drawing-notes.jsx";
import JSZip from "jszip";
import Admin, { getSettings, DEFAULT_STAGES } from "./Admin.jsx";

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
        const col = NOTE_TYPES[a.noteType]?.color || C.ink;
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
  const [route, setRoute] = useState(() => window.location.pathname);
  const [movePopup, setMovePopup] = useState(null); // project id with open move popup

  // Path routing
  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Refresh settings when coming back from admin
  useEffect(() => { setSettings(getSettings()); }, [route]);

  useEffect(() => { saveProjects(projects); }, [projects]);

  // Derive stages from settings
  const stages = settings.stages || DEFAULT_STAGES;
  const activeStages = stages.filter(s => s.active);

  const projectName = settings.projectName || "Drawing Notes";

  // Admin route
  if (route.startsWith("/admin")) {
    const navigateHome = () => { window.history.pushState({}, "", "/"); setRoute("/"); };
    return <Admin onBack={navigateHome} />;
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

  const moveProject = (id, newStageId, e) => {
    e.stopPropagation();
    setProjects(prev => prev.map(p => p.id === id ? { ...p, phase: newStageId } : p));
  };

  const exportStage = async (stage) => {
    const drawings = byPhase[stage.id] || [];
    if (drawings.length === 0) return;
    const zip = new JSZip();
    drawings.forEach(p => {
      const html = buildOfflineHTML(p.title, p.date, p.annotations || [], p.markupStrokes || [], p.drawingImage, p.imgSize || { w: 1000, h: 700 }, NOTE_TYPES, NOTE_TYPE_KEYS);
      const filename = `${p.title.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase()}-archive.html`;
      zip.file(filename, html);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${stage.label.replace(/\s+/g, "-").toLowerCase()}-stage-export.zip`;
    a.click();
    URL.revokeObjectURL(url);
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

  // Group projects by active stage
  const byPhase = {};
  activeStages.forEach(s => { byPhase[s.id] = []; });
  projects.forEach(p => {
    const phase = byPhase[p.phase] !== undefined ? p.phase : (activeStages[0]?.id);
    if (phase && byPhase[phase]) byPhase[phase].push(p);
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans',sans-serif" }} onClick={() => movePopup && setMovePopup(null)}>
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
        {activeStages.map((stage, i) => (
          <div key={stage.id} style={{
            flex: 1, minWidth: 0, padding: "24px 20px",
            borderRight: i < activeStages.length - 1 ? `1px solid ${C.border}` : "none",
          }}>
            {/* Phase header */}
            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                  background: stage.color,
                }} />
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 500, color: C.ink, textTransform: "uppercase", letterSpacing: "0.05em" }}>{stage.label}</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.muted }}>{byPhase[stage.id]?.length || 0}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => exportStage(stage)} title={`Export all ${stage.label} drawings as zip`} style={{
                  background: "transparent", color: stage.color, border: `1px solid ${stage.color}40`,
                  width: 28, height: 28, borderRadius: 4, cursor: "pointer",
                  fontSize: 13, fontWeight: 700, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'DM Mono',monospace",
                }}>&gt;&gt;</button>
                <button onClick={() => startNew(stage.id)} title={`New ${stage.label} drawing`} style={{
                  background: "transparent", color: stage.color, border: `1px solid ${stage.color}40`,
                  width: 28, height: 28, borderRadius: 4, cursor: "pointer",
                  fontSize: 18, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'DM Mono',monospace",
                }}>+</button>
              </div>
            </div>

            {/* Drawing cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(!byPhase[stage.id] || byPhase[stage.id].length === 0) && (
                <div style={{
                  padding: "32px 16px", textAlign: "center", color: C.muted,
                  fontSize: 12, fontFamily: "'DM Mono',monospace", lineHeight: 1.7,
                  border: `1px dashed ${C.border}`, borderRadius: 4,
                }}>
                  No {stage.label.toLowerCase()} drawings yet.
                  <br />
                  <span onClick={() => startNew(stage.id)} style={{ color: stage.color, cursor: "pointer", textDecoration: "underline" }}>Start one</span>
                </div>
              )}
              {(byPhase[stage.id] || []).map(p => {
                const otherStages = activeStages.filter(s => s.id !== p.phase);
                return (
                  <div key={p.id} onClick={() => openProject(p.id)} style={{
                    background: C.paper, border: `1px solid ${C.border}`, borderRadius: 4,
                    cursor: "pointer", overflow: "hidden", transition: "box-shadow 0.15s",
                    display: "flex", flexDirection: "row",
                  }} onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
                     onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                    {/* Thumbnail */}
                    <div style={{
                      width: 120, minHeight: 80, flexShrink: 0, background: "#e8e4de", overflow: "hidden",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {p.drawingImage ? (
                        <Thumbnail drawingImage={p.drawingImage} imgSize={p.imgSize} annotations={p.annotations} markupStrokes={p.markupStrokes} />
                      ) : (
                        <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: C.muted }}>No image</span>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ padding: "10px 12px", flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "flex-start", borderLeft: `1px solid ${C.border}` }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 500, color: C.ink, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.title}
                      </div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.muted, marginBottom: 6 }}>
                        {fmtDate(p.date)} · {(p.annotations || []).length} note{(p.annotations || []).length !== 1 ? "s" : ""} · {(p.annotations || []).reduce((sum, a) => sum + (a.comments || []).length, 0)} comment{(p.annotations || []).reduce((sum, a) => sum + (a.comments || []).length, 0) !== 1 ? "s" : ""}
                      </div>
                      <div style={{ display: "flex", gap: 4, alignItems: "center", position: "relative" }}>
                        {otherStages.length > 0 && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setMovePopup(movePopup === p.id ? null : p.id); }} title="Move to another stage" style={{
                              background: "none", border: "none", color: "#059669", cursor: "pointer",
                              fontSize: 16, fontWeight: 700, padding: "2px 4px", lineHeight: 1, opacity: 0.6,
                              fontFamily: "'DM Mono',monospace",
                            }} onMouseEnter={e => e.currentTarget.style.opacity = 1}
                               onMouseLeave={e => e.currentTarget.style.opacity = 0.6}>&gt;</button>
                            {movePopup === p.id && (
                              <div onClick={e => e.stopPropagation()} style={{
                                position: "absolute", bottom: "100%", left: 0, marginBottom: 4,
                                background: C.paper, border: `1px solid ${C.border}`, borderRadius: 4,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.12)", padding: "6px 0", zIndex: 10,
                                minWidth: 140,
                              }}>
                                <div style={{ padding: "4px 12px 6px", fontSize: 10, fontFamily: "'DM Mono',monospace", color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>Move to</div>
                                {otherStages.map(s => (
                                  <div key={s.id} onClick={(e) => { moveProject(p.id, s.id, e); setMovePopup(null); }}
                                    style={{
                                      padding: "6px 12px", fontSize: 12, fontFamily: "'DM Mono',monospace",
                                      cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = C.bg}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                                    {s.label}
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                        <button onClick={(e) => deleteProject(p.id, e)} title="Delete drawing" style={{
                          background: "none", border: "none", color: C.red, cursor: "pointer",
                          fontSize: 16, padding: "2px 4px", lineHeight: 1, opacity: 0.6,
                        }} onMouseEnter={e => e.currentTarget.style.opacity = 1}
                           onMouseLeave={e => e.currentTarget.style.opacity = 0.6}>×</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
