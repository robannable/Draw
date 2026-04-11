import { useState, useRef, useEffect, useCallback } from "react";

const TOOLS = { SELECT: "select", ANNOTATE: "annotate", MARKUP: "markup" };
export const NOTE_TYPES = {
  question:    { label: "Question",    color: "#dc2626", bg: "#fef2f2" },
  description: { label: "Description", color: "#059669", bg: "#ecfdf5" },
};
export const NOTE_TYPE_KEYS = Object.keys(NOTE_TYPES);
const C = {
  ink: "#1a1a1a", red: "#c4342d", bg: "#f5f2ed", paper: "#ffffff",
  border: "#d4cfc7", muted: "#8a8478", highlight: "#fef3c7", clientMark: "#c4342d",
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function fmtDate(d) {
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dt = new Date(d); return `${dt.getDate()} ${m[dt.getMonth()]} ${dt.getFullYear()}`;
}
function fmtTime(d) {
  const dt = new Date(d);
  return `${dt.getHours().toString().padStart(2,"0")}:${dt.getMinutes().toString().padStart(2,"0")}`;
}
function hEntry(action, detail) {
  return { action, detail, timestamp: new Date().toISOString() };
}

function Pin({ number, x, y, active, noteType, onClick, scale }) {
  const sz = Math.max(20, 28 / scale), fs = Math.max(10, 13 / scale), sw = Math.max(1, 1.5 / scale);
  const col = NOTE_TYPES[noteType]?.color || C.ink;
  return (
    <g onClick={e => { e.stopPropagation(); onClick(); }} style={{ cursor: "pointer" }} transform={`translate(${x},${y})`}>
      <circle r={sz / 2} fill={col} stroke={active ? "#fbbf24" : "#fff"} strokeWidth={active ? sw * 2.5 : sw} />
      <text textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={fs} fontFamily="'DM Mono',monospace" fontWeight="500">{number}</text>
    </g>
  );
}

function TypeBadge({ noteType, small, onClick }) {
  const p = NOTE_TYPES[noteType];
  if (!p) return null;
  return (
    <span onClick={onClick} style={{
      display: "inline-block", fontSize: small ? 10 : 11, fontFamily: "'DM Mono',monospace",
      fontWeight: 500, padding: small ? "1px 6px" : "2px 8px", borderRadius: 3,
      background: p.bg, color: p.color, border: `1px solid ${p.color}30`,
      cursor: onClick ? "pointer" : "default", letterSpacing: "0.03em",
      textTransform: "uppercase", userSelect: "none", lineHeight: 1.5,
    }}>{p.label}</span>
  );
}

function TypeSelector({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {NOTE_TYPE_KEYS.map(k => {
        const p = NOTE_TYPES[k];
        return (
          <span key={k} onClick={() => onChange(k)} style={{
            fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 500,
            padding: "2px 8px", borderRadius: 3, cursor: "pointer",
            background: value === k ? p.color : "transparent",
            color: value === k ? "#fff" : p.color,
            border: `1px solid ${p.color}${value === k ? "" : "40"}`,
            textTransform: "uppercase", letterSpacing: "0.03em",
          }}>{p.label}</span>
        );
      })}
    </div>
  );
}

function HistoryTimeline({ history }) {
  if (!history || history.length === 0) return null;
  return (
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>
      <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>History</div>
      <div style={{ position: "relative", paddingLeft: 14 }}>
        <div style={{ position: "absolute", left: 4, top: 2, bottom: 2, width: 1, background: C.border }} />
        {history.map((h, i) => (
          <div key={i} style={{ position: "relative", marginBottom: 6, fontSize: 11, lineHeight: 1.4, color: C.muted, fontFamily: "'DM Sans',sans-serif" }}>
            <div style={{ position: "absolute", left: -12, top: 4, width: 5, height: 5, borderRadius: "50%", background: i === history.length - 1 ? C.ink : C.border }} />
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, marginRight: 6 }}>{fmtDate(h.timestamp)} {fmtTime(h.timestamp)}</span>
            <span style={{ color: C.ink }}>{h.action}</span>
            {h.detail && <span style={{ display: "block", marginTop: 1, paddingLeft: 0, fontSize: 11, color: C.muted }}>{h.detail}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function FootnoteCard({ annotation, active, onActivate, onUpdate, onDelete, onAddComment, onTypeChange }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(annotation.text);
  const [commentText, setCommentText] = useState("");
  const [commentName, setCommentName] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const ref = useRef(null);

  useEffect(() => { if (active && ref.current) ref.current.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [active]);

  const handleSave = () => {
    onUpdate({ ...annotation, text, history: [...(annotation.history || []), hEntry("Edited", text.slice(0, 80))] });
    setEditing(false);
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    onAddComment(annotation.id, commentText.trim(), commentName.trim() || "Anon");
    setCommentText("");
  };

  const cycleType = () => {
    const idx = NOTE_TYPE_KEYS.indexOf(annotation.noteType || NOTE_TYPE_KEYS[0]);
    onTypeChange(annotation.id, NOTE_TYPE_KEYS[(idx + 1) % NOTE_TYPE_KEYS.length]);
  };

  const comments = annotation.comments || [];
  const history = annotation.history || [];

  return (
    <div ref={ref} onClick={onActivate} style={{
      borderLeft: `3px solid ${active ? C.red : NOTE_TYPES[annotation.noteType]?.color || C.border}`,
      background: active ? C.highlight : C.paper,
      padding: "14px 16px", cursor: "pointer", transition: "all 0.15s ease",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 24, height: 24, borderRadius: "50%",
          background: NOTE_TYPES[annotation.noteType]?.color || C.ink, color: "#fff",
          fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 500, flexShrink: 0, marginTop: 1,
        }}>{annotation.number}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <TypeBadge noteType={annotation.noteType || NOTE_TYPE_KEYS[0]} small onClick={e => { e.stopPropagation(); cycleType(); }} />
          </div>
          {editing ? (
            <div>
              <textarea value={text} onChange={e => setText(e.target.value)} onClick={e => e.stopPropagation()} rows={3}
                style={{ width: "100%", fontFamily: "'DM Sans',sans-serif", fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 4, padding: "8px 10px", resize: "vertical", outline: "none", lineHeight: 1.5, boxSizing: "border-box" }} />
              <div style={{ marginTop: 6 }}>
                <TypeSelector value={annotation.noteType || NOTE_TYPE_KEYS[0]} onChange={t => onTypeChange(annotation.id, t)} />
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button onClick={handleSave} style={btnS(C.ink, "#fff")}>Save</button>
                <button onClick={() => { setEditing(false); setText(annotation.text); }} style={btnS("transparent", "#666", true)}>Cancel</button>
                <button onClick={e => { e.stopPropagation(); onDelete(annotation.id); }} style={{ ...btnS("transparent", C.red, true), marginLeft: "auto" }}>Delete</button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: C.ink, fontFamily: "'DM Sans',sans-serif", whiteSpace: "pre-wrap" }}>
                {annotation.text || <span style={{ color: C.muted, fontStyle: "italic" }}>Click edit to add note…</span>}
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={e => { e.stopPropagation(); setEditing(true); }} style={linkBtn}>Edit</button>
                <button onClick={e => { e.stopPropagation(); setShowComments(!showComments); }} style={linkBtn}>
                  {showComments ? "Hide" : "Comments"}{comments.length > 0 ? ` (${comments.length})` : ""}
                </button>
                <button onClick={e => { e.stopPropagation(); setShowHistory(!showHistory); }} style={linkBtn}>
                  {showHistory ? "Hide" : "History"}{history.length > 0 ? ` (${history.length})` : ""}
                </button>
              </div>
            </div>
          )}

          {showComments && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${C.border}` }}>
              {comments.map((c, i) => (
                <div key={i} style={{ background: "#f0edea", borderRadius: 6, padding: "8px 10px", marginBottom: 6, fontSize: 13, lineHeight: 1.45, fontFamily: "'DM Sans',sans-serif" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <strong style={{ fontSize: 11, color: C.red, textTransform: "uppercase", letterSpacing: "0.04em" }}>{c.author}</strong>
                    <span style={{ fontSize: 11, color: C.muted }}>{fmtDate(c.date)} {fmtTime(c.date)}</span>
                  </div>
                  {c.text}
                </div>
              ))}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                <input value={commentName} onChange={e => setCommentName(e.target.value)}
                  onClick={e => e.stopPropagation()} placeholder="Your name"
                  style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", border: `1px solid ${C.border}`, borderRadius: 4, padding: "5px 10px", outline: "none", width: "50%" }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddComment()}
                    onClick={e => e.stopPropagation()} placeholder="Add comment…"
                    style={{ flex: 1, fontSize: 13, fontFamily: "'DM Sans',sans-serif", border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 10px", outline: "none" }} />
                  <button onClick={e => { e.stopPropagation(); handleAddComment(); }} style={btnS(C.red, "#fff")}>Reply</button>
                </div>
              </div>
            </div>
          )}

          {showHistory && <HistoryTimeline history={history} />}
        </div>
      </div>
    </div>
  );
}

const btnS = (bg, color, outline) => ({
  background: bg, color, border: outline ? `1px solid ${color}` : "none",
  borderRadius: 4, padding: "5px 12px", fontSize: 12, fontFamily: "'DM Mono',monospace", cursor: "pointer", fontWeight: 500,
});
const linkBtn = { background: "none", border: "none", color: C.muted, fontSize: 12, fontFamily: "'DM Mono',monospace", cursor: "pointer", padding: 0, textDecoration: "underline", textUnderlineOffset: 2 };

function strokeToPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    d += ` Q ${p0.x} ${p0.y} ${(p0.x + p1.x) / 2} ${(p0.y + p1.y) / 2}`;
  }
  return d;
}

// --- Self-contained HTML export builder ---
export function buildOfflineHTML(title, date, annotations, markupStrokes, drawingImage, imgSize, phases, phaseKeys) {
  const safeTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const dateStr = fmtDate(date);
  const exportDate = fmtDate(new Date());

  const data = JSON.stringify({ title, date, annotations, markupStrokes, drawingImage, imgSize });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle} \u2014 Building Archive</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:#f5f2ed;color:#1a1a1a}
.banner{background:#1a1a1a;color:#fff;padding:10px 18px;font-size:12px;font-family:'DM Mono',monospace;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.banner-phase{display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;text-transform:uppercase;letter-spacing:0.04em;margin-left:8px}
.wrap{display:flex;height:calc(100vh - 42px);overflow:hidden}
.draw-panel{flex:1;background:#e8e4de;position:relative;overflow:hidden;display:flex}
.draw-panel svg{width:100%;height:100%;display:block}
.notes-panel{width:380px;max-width:40vw;border-left:1px solid #d4cfc7;background:#fff;display:flex;flex-direction:column;overflow:hidden}
.notes-header{padding:16px 18px 12px;border-bottom:1px solid #d4cfc7}
.notes-header h1{font-family:'DM Mono',monospace;font-size:17px;font-weight:500}
.notes-header .meta{font-size:12px;font-family:'DM Mono',monospace;color:#8a8478;margin-top:4px;display:flex;justify-content:space-between}
.filter-bar{display:flex;gap:4px;padding:10px 18px;border-bottom:1px solid #d4cfc7;flex-wrap:wrap}
.fbtn{font-size:10px;font-family:'DM Mono',monospace;font-weight:500;padding:3px 10px;border-radius:3px;border:1px solid #d4cfc7;background:transparent;cursor:pointer;text-transform:uppercase;letter-spacing:0.03em;color:#8a8478}
.fbtn.active{background:#1a1a1a;color:#fff;border-color:#1a1a1a}
.notes-list{flex:1;overflow-y:auto}
.note{padding:14px 16px;border-bottom:1px solid #d4cfc7;border-left:3px solid #d4cfc7}
.note-head{display:flex;align-items:flex-start;gap:10px}
.pin{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;color:#fff;font-size:12px;font-family:'DM Mono',monospace;font-weight:500;flex-shrink:0}
.badge{display:inline-block;font-size:10px;font-family:'DM Mono',monospace;font-weight:500;padding:1px 6px;border-radius:3px;text-transform:uppercase;letter-spacing:0.03em;margin-bottom:6px}
.note-text{font-size:14px;line-height:1.55;white-space:pre-wrap;font-family:'DM Sans',sans-serif}
.comment{background:#f0edea;border-radius:6px;padding:8px 10px;margin-bottom:6px;font-size:13px;line-height:1.45}
.comment-head{display:flex;justify-content:space-between;margin-bottom:3px}
.comment-author{font-size:11px;color:#c4342d;text-transform:uppercase;letter-spacing:0.04em;font-weight:700}
.comment-date{font-size:11px;color:#8a8478}
.hist{margin-top:8px;padding-top:8px;border-top:1px dashed #d4cfc7}
.hist-label{font-size:10px;font-family:'DM Mono',monospace;color:#8a8478;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px}
.hist-entry{font-size:11px;color:#8a8478;margin-bottom:5px;padding-left:14px;position:relative;line-height:1.4}
.hist-entry::before{content:'';position:absolute;left:4px;top:5px;width:5px;height:5px;border-radius:50%;background:#d4cfc7}
.hist-entry:last-child::before{background:#1a1a1a}
.toggle{background:none;border:none;color:#8a8478;font-size:12px;font-family:'DM Mono',monospace;cursor:pointer;text-decoration:underline;text-underline-offset:2px;padding:0;margin-right:10px;margin-top:8px}
${Object.entries(phases).map(([k, p]) => `.ph-${k}{background:${p.bg};color:${p.color};border-color:${p.color}}
.pin-${k}{background:${p.color}}
.bl-${k}{border-left-color:${p.color}}`).join("\n")}
@media(max-width:768px){
  .wrap{flex-direction:column}
  .notes-panel{width:100%;max-width:none;border-left:none;border-top:1px solid #d4cfc7;max-height:50vh}
}
</style>
</head>
<body>
<div class="banner">
  <span>BUILDING ARCHIVE &mdash; ${safeTitle}</span>
  <span>Exported ${exportDate}</span>
</div>
<div class="wrap">
  <div class="draw-panel" id="dp"></div>
  <div class="notes-panel">
    <div class="notes-header">
      <h1>${safeTitle}</h1>
      <div class="meta"><span>${dateStr}</span><span id="cnt"></span></div>
    </div>
    <div class="filter-bar" id="fb"></div>
    <div class="notes-list" id="nl"></div>
  </div>
</div>
<script>
const D=${data};
const PH=${JSON.stringify(phases)};
let af="all";
const toggles={};
function fD(d){const m=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];const dt=new Date(d);return dt.getDate()+" "+m[dt.getMonth()]+" "+dt.getFullYear()}
function fT(d){const dt=new Date(d);return String(dt.getHours()).padStart(2,"0")+":"+String(dt.getMinutes()).padStart(2,"0")}
function init(){rf();rd();rn()}
function rf(){
  const b=document.getElementById("fb");b.innerHTML="";
  ${JSON.stringify(["all", ...phaseKeys])}.forEach(f=>{
    const e=document.createElement("button");e.className="fbtn"+(af===f?" active":"");
    e.textContent=f==="all"?"All":PH[f].label;
    e.onclick=()=>{af=f;rf();rn();rd()};b.appendChild(e);
  });
}
function rd(){
  const dp=document.getElementById("dp");
  let svg='<svg viewBox="0 0 '+D.imgSize.w+' '+D.imgSize.h+'" xmlns="http://www.w3.org/2000/svg">';
  if(D.drawingImage)svg+='<image href="'+D.drawingImage+'" width="'+D.imgSize.w+'" height="'+D.imgSize.h+'"/>';
  (D.markupStrokes||[]).forEach(s=>{
    if(s.points.length<2)return;
    let d="M "+s.points[0].x+" "+s.points[0].y;
    for(let i=1;i<s.points.length;i++){const p0=s.points[i-1],p1=s.points[i];d+=" Q "+p0.x+" "+p0.y+" "+(p0.x+p1.x)/2+" "+(p0.y+p1.y)/2}
    svg+='<path d="'+d+'" fill="none" stroke="'+s.color+'" stroke-width="'+(s.thickness||3)+'" stroke-linecap="round" opacity="0.7"/>';
  });
  const vis=D.annotations.filter(a=>af==="all"||a.noteType===af);
  vis.forEach(a=>{
    const c=PH[a.noteType]?PH[a.noteType].color:"#1a1a1a";
    svg+='<g transform="translate('+a.x+','+a.y+')" style="cursor:pointer" onclick="hl(\\''+a.id+'\\')">';
    svg+='<circle r="14" fill="'+c+'" stroke="#fff" stroke-width="1.5"/>';
    svg+='<text text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="13" font-family="\\'DM Mono\\',monospace" font-weight="500">'+a.number+'</text></g>';
  });
  svg+='</svg>';dp.innerHTML=svg;
}
function hl(id){const el=document.getElementById("n-"+id);if(el){el.scrollIntoView({behavior:"smooth",block:"nearest"});el.style.background="#fef3c7";setTimeout(()=>{el.style.background=""},1500)}}
function tog(id,sec){
  const key=id+"-"+sec;toggles[key]=!toggles[key];rn();
}
function rn(){
  const vis=D.annotations.filter(a=>af==="all"||a.noteType===af);
  document.getElementById("cnt").textContent=vis.length+" note"+(vis.length!==1?"s":"")+(af!=="all"?" ("+PH[af].label+")":"");
  document.getElementById("nl").innerHTML=vis.map(a=>{
    const p=PH[a.noteType]||PH[Object.keys(PH)[0]];
    const cs=a.comments||[];const hs=a.history||[];
    const sc=toggles[a.id+"-c"]||false;
    const sh=toggles[a.id+"-h"]||false;
    let html='<div class="note bl-'+a.noteType+'" id="n-'+a.id+'" style="transition:background 0.3s"><div class="note-head"><span class="pin pin-'+a.noteType+'">'+a.number+'</span><div style="flex:1"><span class="badge ph-'+a.noteType+'" style="border:1px solid '+p.color+'30">'+p.label+'</span>';
    html+='<p class="note-text">'+(a.text||"<em style=\\"color:#8a8478\\">No note</em>")+'</p>';
    html+='<div style="margin-top:8px">';
    if(cs.length)html+='<button class="toggle" onclick="tog(\\''+a.id+'\\',\\'c\\')">'+(sc?"Hide":"Comments")+" ("+cs.length+")</button>";
    if(hs.length)html+='<button class="toggle" onclick="tog(\\''+a.id+'\\',\\'h\\')">'+(sh?"Hide":"History")+" ("+hs.length+")</button>";
    html+='</div>';
    if(sc&&cs.length){
      html+='<div style="margin-top:10px;padding-top:8px;border-top:1px dashed #d4cfc7">';
      cs.forEach(c=>{html+='<div class="comment"><div class="comment-head"><span class="comment-author">'+c.author+'</span><span class="comment-date">'+fD(c.date)+" "+fT(c.date)+'</span></div>'+c.text+'</div>'});
      html+='</div>';
    }
    if(sh&&hs.length){
      html+='<div class="hist"><div class="hist-label">History</div>';
      hs.forEach(h=>{html+='<div class="hist-entry"><span style="font-family:DM Mono,monospace;font-size:10px;margin-right:6px">'+fD(h.timestamp)+" "+fT(h.timestamp)+'</span><span style="color:#1a1a1a">'+h.action+'</span>'+(h.detail?'<br><span>'+h.detail+'</span>':'')+'</div>'});
      html+='</div>';
    }
    html+='</div></div></div>';
    return html;
  }).join("");
}
init();
<\/script>
</body>
</html>`;
}

// ============ MAIN APP ============
export default function DrawingNotes({ initialData, onBack, onSave }) {
  const init = initialData || {};
  const [projectTitle, setProjectTitle] = useState(init.title || "Project Drawing");
  const [projectDate, setProjectDate] = useState(init.date || new Date().toISOString());
  const [drawingImage, setDrawingImage] = useState(init.drawingImage || null);
  const [annotations, setAnnotations] = useState(init.annotations || []);
  const [activeAnnotation, setActiveAnnotation] = useState(null);
  const [tool, setTool] = useState(TOOLS.SELECT);
  const [markupStrokes, setMarkupStrokes] = useState(init.markupStrokes || []);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [showSetup, setShowSetup] = useState(!init.drawingImage);
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentNoteType, setCurrentNoteType] = useState("description");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [markupColor, setMarkupColor] = useState("#c4342d");
  const [markupThickness, setMarkupThickness] = useState(3);

  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: init.imgSize?.w || 1000, h: init.imgSize?.h || 700 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [imgSize, setImgSize] = useState(init.imgSize || { w: 1000, h: 700 });

  const svgRef = useRef(null);
  const fileRef = useRef(null);
  const importRef = useRef(null);

  const scale = viewBox.w / (svgRef.current?.clientWidth || 1000);
  const filteredAnnotations = typeFilter === "all" ? annotations : annotations.filter(a => a.noteType === typeFilter);

  // Auto-save back to index when data changes
  useEffect(() => {
    if (onSave && drawingImage) {
      onSave({ title: projectTitle, date: projectDate, annotations, markupStrokes, drawingImage, imgSize });
    }
  }, [projectTitle, projectDate, annotations, markupStrokes, drawingImage, imgSize]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
        setViewBox({ x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight });
        setDrawingImage(ev.target.result);
        setShowSetup(false);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const getSVGPoint = useCallback((cx, cy) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = cx; pt.y = cy;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const svgPt = pt.matrixTransform(ctm.inverse());
      return { x: svgPt.x, y: svgPt.y };
    }
    // Fallback
    const r = svg.getBoundingClientRect();
    return { x: viewBox.x + ((cx - r.left) / r.width) * viewBox.w, y: viewBox.y + ((cy - r.top) / r.height) * viewBox.h };
  }, [viewBox]);

  const cPos = (e) => e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };

  const handleDown = (e) => {
    const pos = cPos(e);
    const pt = getSVGPoint(pos.x, pos.y);
    if (tool === TOOLS.ANNOTATE) {
      const num = annotations.length > 0 ? Math.max(...annotations.map(a => a.number)) + 1 : 1;
      const a = { id: uid(), number: num, x: pt.x, y: pt.y, text: "", noteType: currentNoteType, comments: [], history: [hEntry("Created", `${NOTE_TYPES[currentNoteType].label}`)] };
      setAnnotations(prev => [...prev, a]);
      setActiveAnnotation(a.id);
      return;
    }
    if (tool === TOOLS.MARKUP) { setIsDrawing(true); setCurrentStroke({ points: [pt], color: markupColor, thickness: markupThickness }); return; }
    setIsPanning(true);
    setPanStart({ x: pos.x, y: pos.y, vx: viewBox.x, vy: viewBox.y });
  };

  const handleMove = (e) => {
    const pos = cPos(e);
    if (isDrawing && tool === TOOLS.MARKUP) {
      const pt = getSVGPoint(pos.x, pos.y);
      setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, pt] } : null);
      return;
    }
    if (isPanning && panStart) {
      const r = svgRef.current?.getBoundingClientRect();
      if (!r) return;
      setViewBox(prev => ({
        ...prev,
        x: panStart.vx + ((panStart.x - pos.x) / r.width) * viewBox.w,
        y: panStart.vy + ((panStart.y - pos.y) / r.height) * viewBox.h
      }));
    }
  };

  const handleUp = () => {
    if (isDrawing && currentStroke) { setMarkupStrokes(prev => [...prev, currentStroke]); setCurrentStroke(null); setIsDrawing(false); }
    setIsPanning(false); setPanStart(null);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const f = e.deltaY > 0 ? 1.1 : 0.9;
    const mx = (e.clientX - r.left) / r.width, my = (e.clientY - r.top) / r.height;
    setViewBox(prev => {
      const nw = Math.min(Math.max(prev.w * f, 200), imgSize.w * 3);
      const ratio = nw / prev.w;
      const nh = prev.h * ratio;
      return { x: prev.x + (prev.w - nw) * mx, y: prev.y + (prev.h - nh) * my, w: nw, h: nh };
    });
  };

  const resetView = () => setViewBox({ x: 0, y: 0, w: imgSize.w, h: imgSize.h });

  const updateAnnotation = (u) => setAnnotations(prev => prev.map(a => a.id === u.id ? u : a));
  const deleteAnnotation = (id) => {
    setAnnotations(prev => prev.filter(a => a.id !== id).map((a, i) => ({ ...a, number: i + 1 })));
    if (activeAnnotation === id) setActiveAnnotation(null);
  };
  const addComment = (id, text, author) => {
    setAnnotations(prev => prev.map(a => a.id === id ? {
      ...a,
      comments: [...(a.comments || []), { author, text, date: new Date().toISOString() }],
      history: [...(a.history || []), hEntry(`Comment by ${author}`, text.slice(0, 60))]
    } : a));
  };
  const changeType = (id, noteType) => {
    setAnnotations(prev => prev.map(a => a.id === id ? {
      ...a, noteType,
      history: [...(a.history || []), hEntry("Type changed", NOTE_TYPES[noteType].label)]
    } : a));
  };

  const exportHTML = () => {
    const html = buildOfflineHTML(projectTitle, projectDate, annotations, markupStrokes, drawingImage, imgSize, NOTE_TYPES, NOTE_TYPE_KEYS);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${projectTitle.replace(/\s+/g, "-").toLowerCase()}-archive.html`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = { title: projectTitle, date: projectDate, annotations, markupStrokes, drawingImage, imgSize, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${projectTitle.replace(/\s+/g, "-").toLowerCase()}-project.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const importProject = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        if (d.title) setProjectTitle(d.title);
        if (d.date) setProjectDate(d.date);
        if (d.annotations) setAnnotations(d.annotations);
        if (d.markupStrokes) setMarkupStrokes(d.markupStrokes);
        if (d.drawingImage) { setDrawingImage(d.drawingImage); setShowSetup(false); }
        if (d.imgSize) { setImgSize(d.imgSize); setViewBox({ x: 0, y: 0, w: d.imgSize.w, h: d.imgSize.h }); }
      } catch { alert("Invalid project file"); }
    };
    reader.readAsText(file);
  };

  const sw = (thickness) => Math.max(1, (thickness || 3) / scale);

  // --- Setup screen ---
  if (showSetup && !drawingImage) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", padding: 20 }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet" />
        <div style={{ background: C.paper, border: `1px solid ${C.border}`, maxWidth: 480, width: "100%", padding: "40px 36px" }}>
          <h1 style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 500, marginBottom: 6, color: C.ink }}>Drawing Notes</h1>
          <p style={{ fontSize: 14, color: C.muted, margin: "0 0 28px", lineHeight: 1.5 }}>
            Upload a drawing to begin annotating. Load a previous project file, or start fresh.
          </p>
          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: C.muted, display: "block", marginBottom: 6 }}>PROJECT TITLE</span>
            <input value={projectTitle} onChange={e => setProjectTitle(e.target.value)}
              style={{ width: "100%", fontSize: 15, fontFamily: "'DM Sans',sans-serif", border: `1px solid ${C.border}`, padding: "10px 12px", borderRadius: 0, outline: "none", boxSizing: "border-box" }} />
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => fileRef.current?.click()} style={{ flex: 1, minWidth: 140, background: C.ink, color: "#fff", border: "none", padding: "12px 20px", fontSize: 13, fontFamily: "'DM Mono',monospace", fontWeight: 500, cursor: "pointer" }}>Upload Drawing</button>
            <button onClick={() => importRef.current?.click()} style={{ flex: 1, minWidth: 140, background: "transparent", color: C.ink, border: `1px solid ${C.border}`, padding: "12px 20px", fontSize: 13, fontFamily: "'DM Mono',monospace", fontWeight: 500, cursor: "pointer" }}>Load Project</button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          <input ref={importRef} type="file" accept=".json" onChange={importProject} style={{ display: "none" }} />
          <p style={{ fontSize: 11, color: C.muted, marginTop: 24, lineHeight: 1.6, fontFamily: "'DM Mono',monospace" }}>
            Accepts PNG, JPG, SVG. Everything stays in your browser.
          </p>
        </div>
      </div>
    );
  }

  // --- Main UI ---
  const tbBtn = (t, label, icon) => (
    <button onClick={() => setTool(t)} title={label} style={{
      background: tool === t ? C.ink : "transparent", color: tool === t ? "#fff" : C.ink,
      border: tool === t ? "none" : `1px solid ${C.border}`, borderRadius: 4,
      width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", fontSize: 16, fontFamily: "'DM Mono',monospace",
    }}>{icon}</button>
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, fontFamily: "'DM Sans',sans-serif", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet" />

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderBottom: `1px solid ${C.border}`, background: C.paper, flexShrink: 0, flexWrap: "wrap", minHeight: 48 }}>
        {onBack && (
          <>
            <button onClick={onBack} title="Back to index" style={{
              background: "transparent", color: C.ink, border: `1px solid ${C.border}`, borderRadius: 4,
              height: 36, display: "flex", alignItems: "center", gap: 4, padding: "0 10px",
              cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono',monospace", fontWeight: 500,
            }}>Index</button>
            <div style={{ width: 1, height: 24, background: C.border, margin: "0 2px" }} />
          </>
        )}
        {tbBtn(TOOLS.SELECT, "Pan & Select", "⇔")}
        {tbBtn(TOOLS.ANNOTATE, "Add Annotation", "①")}
        {tbBtn(TOOLS.MARKUP, "Draw Markup", "✎")}

        {tool === TOOLS.ANNOTATE && (
          <>
            <div style={{ width: 1, height: 24, background: C.border, margin: "0 2px" }} />
            <TypeSelector value={currentNoteType} onChange={setCurrentNoteType} />
          </>
        )}

        {tool === TOOLS.MARKUP && (
          <>
            <div style={{ width: 1, height: 24, background: C.border, margin: "0 2px" }} />
            {["#c4342d", "#2563eb"].map(c => (
              <span key={c} onClick={() => setMarkupColor(c)} style={{
                width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer",
                border: markupColor === c ? "2px solid #1a1a1a" : "2px solid transparent",
                boxShadow: markupColor === c ? `0 0 0 1px ${C.paper}` : "none",
              }} />
            ))}
            <div style={{ width: 1, height: 24, background: C.border, margin: "0 2px" }} />
            {[2, 5, 10].map(t => (
              <span key={t} onClick={() => setMarkupThickness(t)} title={`${t === 2 ? "Fine" : t === 5 ? "Medium" : "Thick"}`} style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 24, height: 24, cursor: "pointer", borderRadius: 4,
                border: markupThickness === t ? `1px solid ${C.ink}` : `1px solid transparent`,
              }}>
                <span style={{
                  width: 14, height: t, borderRadius: t, background: markupColor,
                }} />
              </span>
            ))}
            <div style={{ width: 1, height: 24, background: C.border, margin: "0 2px" }} />
            <button onClick={() => setMarkupStrokes(p => p.slice(0, -1))} style={linkBtn}>Undo</button>
            <button onClick={() => setMarkupStrokes([])} style={linkBtn}>Clear</button>
          </>
        )}

        <div style={{ width: 1, height: 24, background: C.border, margin: "0 2px" }} />
        <button onClick={resetView} style={linkBtn} title="Reset zoom">Fit</button>

        <div style={{ flex: 1 }} />

        <div style={{ position: "relative" }}>
          <button onClick={() => setShowExportMenu(!showExportMenu)} style={{ ...linkBtn, background: C.ink, color: "#fff", padding: "4px 12px", borderRadius: 4, textDecoration: "none" }}>Export ▾</button>
          {showExportMenu && (
            <>
              <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} onClick={() => setShowExportMenu(false)} />
              <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: C.paper, border: `1px solid ${C.border}`, borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, minWidth: 220, overflow: "hidden" }}>
                <button onClick={() => { exportHTML(); setShowExportMenu(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13, borderBottom: `1px solid ${C.border}` }}>
                  <strong style={{ display: "block", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>Client Archive (.html)</strong>
                  <span style={{ fontSize: 11, color: C.muted }}>Self-contained offline file for handover</span>
                </button>
                <button onClick={() => { exportJSON(); setShowExportMenu(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13 }}>
                  <strong style={{ display: "block", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>Working File (.json)</strong>
                  <span style={{ fontSize: 11, color: C.muted }}>Re-importable project data</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }} className="main-layout">
        {/* Drawing */}
        <div style={{ flex: "1 1 60%", minWidth: 0, minHeight: 0, background: "#e8e4de", position: "relative", overflow: "hidden", display: "flex" }}>
          <svg ref={svgRef} viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            style={{ width: "100%", height: "100%", cursor: tool === TOOLS.SELECT ? (isPanning ? "grabbing" : "grab") : "crosshair", touchAction: "none", userSelect: "none" }}
            onMouseDown={handleDown} onMouseMove={handleMove} onMouseUp={handleUp} onMouseLeave={handleUp}
            onTouchStart={handleDown} onTouchMove={handleMove} onTouchEnd={handleUp} onWheel={handleWheel}>
            {drawingImage && <image href={drawingImage} x={0} y={0} width={imgSize.w} height={imgSize.h} style={{ pointerEvents: "none" }} />}
            {markupStrokes.map((s, i) => <path key={i} d={strokeToPath(s.points)} fill="none" stroke={s.color} strokeWidth={sw(s.thickness)} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} style={{ pointerEvents: "none" }} />)}
            {currentStroke && <path d={strokeToPath(currentStroke.points)} fill="none" stroke={currentStroke.color} strokeWidth={sw(currentStroke.thickness)} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} style={{ pointerEvents: "none" }} />}
            {filteredAnnotations.map(a => <Pin key={a.id} number={a.number} x={a.x} y={a.y} active={activeAnnotation === a.id} noteType={a.noteType || NOTE_TYPE_KEYS[0]} onClick={() => setActiveAnnotation(a.id === activeAnnotation ? null : a.id)} scale={scale || 1} />)}
          </svg>
          <div style={{ position: "absolute", bottom: 10, left: 10, fontSize: 11, fontFamily: "'DM Mono',monospace", color: C.muted, background: "rgba(255,255,255,0.85)", padding: "4px 8px", borderRadius: 3, pointerEvents: "none" }}>
            {tool === TOOLS.SELECT && "Drag to pan · Scroll to zoom"}
            {tool === TOOLS.ANNOTATE && `Click to place ${NOTE_TYPES[currentNoteType].label.toLowerCase()}`}
            {tool === TOOLS.MARKUP && "Draw on the plan"}
          </div>
        </div>

        {/* Notes panel */}
        <div style={{ flex: "0 0 380px", maxWidth: 420, minWidth: 280, display: "flex", flexDirection: "column", borderLeft: `1px solid ${C.border}`, background: C.paper, overflow: "hidden" }} className="notes-panel">
          <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            {editingTitle ? (
              <input value={projectTitle} onChange={e => setProjectTitle(e.target.value)} onBlur={() => setEditingTitle(false)} onKeyDown={e => e.key === "Enter" && setEditingTitle(false)} autoFocus
                style={{ fontSize: 17, fontFamily: "'DM Mono',monospace", fontWeight: 500, border: "none", borderBottom: `2px solid ${C.ink}`, outline: "none", width: "100%", padding: "2px 0", background: "transparent" }} />
            ) : (
              <h2 onClick={() => setEditingTitle(true)} style={{ fontSize: 17, fontFamily: "'DM Mono',monospace", fontWeight: 500, margin: 0, cursor: "pointer", color: C.ink }}>{projectTitle}</h2>
            )}
            <div style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: C.muted, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
              <span>{fmtDate(projectDate)}</span>
              <span>{filteredAnnotations.length} note{filteredAnnotations.length !== 1 ? "s" : ""}{typeFilter !== "all" ? ` (${NOTE_TYPES[typeFilter].label})` : ""}</span>
            </div>
          </div>

          {/* Type filter */}
          <div style={{ display: "flex", gap: 4, padding: "10px 18px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, flexWrap: "wrap" }}>
            {["all", ...NOTE_TYPE_KEYS].map(k => (
              <span key={k} onClick={() => setTypeFilter(k)} style={{
                fontSize: 10, fontFamily: "'DM Mono',monospace", fontWeight: 500,
                padding: "3px 10px", borderRadius: 3, cursor: "pointer",
                background: typeFilter === k ? C.ink : "transparent",
                color: typeFilter === k ? "#fff" : C.muted,
                border: `1px solid ${typeFilter === k ? C.ink : C.border}`,
                textTransform: "uppercase", letterSpacing: "0.03em",
              }}>{k === "all" ? "All" : NOTE_TYPES[k].label}</span>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredAnnotations.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: C.muted, fontSize: 13, fontFamily: "'DM Mono',monospace", lineHeight: 1.7 }}>
                {annotations.length === 0 ? <>No annotations yet.<br />Select ① and click the drawing.</> : <>No {NOTE_TYPES[typeFilter]?.label.toLowerCase()} notes.</>}
              </div>
            ) : (
              filteredAnnotations.map(a => (
                <FootnoteCard key={a.id} annotation={a} active={activeAnnotation === a.id}
                  onActivate={() => setActiveAnnotation(a.id === activeAnnotation ? null : a.id)}
                  onUpdate={updateAnnotation} onDelete={deleteAnnotation} onAddComment={addComment} onTypeChange={changeType} />
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .main-layout { flex-direction: column !important; }
          .notes-panel { flex: 1 1 auto !important; max-width: none !important; min-width: 0 !important; border-left: none !important; border-top: 1px solid ${C.border} !important; max-height: 45vh !important; }
        }
      `}</style>
    </div>
  );
}
