/**
 * WorkbenchPage — The BOPOS Code Studio
 * 3-pane layout: Version History | The Architect (AI chat) | Live Canvas
 * Preview engine: sandboxed iframe with blob: URL — crashes stay inside the frame
 */
import {
  useState, useRef, useEffect, useCallback, useMemo,
} from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Hammer, Clock, Send, Loader2, AlertCircle,
  Code2, Eye, Rocket, Save, CheckCircle2, X,
  Terminal, ChevronLeft, Cloud, RefreshCw, RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useProfile } from "@/context/ProfileContext"

// ─────────────────────────────────────────────
// STORAGE KEYS
// ─────────────────────────────────────────────
const VERSIONS_KEY = "bopos_workbench_versions"
const DEPLOYED_KEY = "bopos_workbench_deployed"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface WorkbenchVersion {
  id:            string
  versionNumber: number
  label:         string
  code:          string
  schema?:       Record<string, unknown>
  createdAt:     string
}

interface ChatMessage {
  id:             string
  role:           "user" | "assistant"
  content:        string
  displayContent: string
  timestamp:      string
  hasCode:        boolean
}

interface DeployState {
  open:      boolean
  step:      "form" | "loading" | "success"
  name:      string
  dashboard: "os" | "mpr" | "anchor"
}

// ─────────────────────────────────────────────
// BRAIN — inlined system prompt
// ─────────────────────────────────────────────
const WORKBENCH_BRAIN = `You are the BOPOS Workbench Architect — a specialized code generation AI embedded in the Business On Purpose Operating System. Your purpose is to build production-quality React components that integrate seamlessly with the BOP platform.

## Your Role
You design and build custom tools, dashboards, calculators, trackers, and interactive components for business owners. Every tool must be functional, beautiful, persistently stored, and immediately deployable.

## Technical Protocol

### Code Output
- Use React + Tailwind CSS exclusively. Tailwind works natively — all classes render instantly.
- **NO import statements of any kind.** The renderer is a sandboxed function scope, not a module. Imports will crash it.
- **NO export keywords.** Just define: function App() { ... }
- React hooks (useState, useEffect, useCallback, useRef, useMemo, useReducer) are in scope — use without React. prefix
- Lucide icons are in scope: DollarSign, TrendingUp, TrendingDown, Users, Target, Calendar, Clock, CheckCircle2, AlertCircle, Plus, Minus, Trash2, Edit3, Save, ArrowUp, ArrowDown, BarChart2, PieChart, and more — use directly as JSX without importing
- useBOPStore and SyncIndicator are in scope — never import them
- Wrap ALL code in <WORKBENCH_CODE> and </WORKBENCH_CODE> tags

### Metadata Block (required at top of every component)
// TOOL METADATA
// name: [Tool Name]
// dashboard: [os | mpr | anchor]
// description: [One sentence describing what this tool does]

### UI Standard
- Primary: BOP Navy #002855 — use bg-[#002855], text-[#002855]
- Accent: BOP Orange — use orange-600
- Buttons: rounded-md (never pill-shaped)
- Cards: bg-white border border-gray-200 shadow-sm
- Page background: bg-gray-50

### Persistence & Memory (REQUIRED for all interactive tools)
Every tool that collects, tracks, or modifies data MUST use the globally available useBOPStore hook. Never use raw useState for data that needs to persist across sessions.

Usage:
  const [data, setData, syncStatus] = useBOPStore('tool-id', { field1: '', field2: 0 })

Rules:
- toolId must be a unique kebab-case string matching the name in the metadata block
- useBOPStore auto-saves with a 2-second debounce after any setData call
- syncStatus is 'idle' | 'saving' | 'saved'

SyncIndicator (REQUIRED in every tool — place at root of App return):
  <SyncIndicator status={syncStatus} />
It renders fixed in the bottom-right corner. Never omit it.

### Schema Block (output AFTER the WORKBENCH_CODE block)
<BOP_SCHEMA>
{
  "toolId": "tool-id-matching-metadata",
  "fields": {
    "fieldName": { "type": "string | number | boolean | array | object", "label": "Human Label" }
  }
}
</BOP_SCHEMA>

### Integration
dashboard field meaning:
- os — People, Process, Product, Profit (executive view)
- mpr — Process docs, workflow tools, SOPs
- anchor — Rhythm tracking, scheduling, cadence

## Response Format
1. One sentence describing what you're building
2. Full component in <WORKBENCH_CODE> tags
3. <BOP_SCHEMA> block (for tools with persistent data)
4. 2-3 suggested next iterations

For refinements: one sentence, then FULL updated component + updated schema if fields changed.

## STRICT OUTPUT RULE (highest priority)
Only output the functional React component inside the WORKBENCH_CODE tags. No introductory text. No explanations before or after the code block. Zero freeform prose outside the tags. The code block is the entire response.

## Tone
Confident, decisive, builder-mindset. One-sentence description inside the code as a comment, then the component.`

function getSystemPrompt(firstName: string, businessName: string): string {
  return `${WORKBENCH_BRAIN}

## Current Session
- Owner: ${firstName}
- Business: ${businessName}`
}

// ─────────────────────────────────────────────
// CODE UTILITIES
// ─────────────────────────────────────────────
const TAG_RE       = /<WORKBENCH_CODE>([\s\S]*?)<\/WORKBENCH_CODE>/
const SCHEMA_RE    = /<BOP_SCHEMA>([\s\S]*?)<\/BOP_SCHEMA>/
// Matches any fenced block regardless of language tag (superset of old FENCE_RE)
const ANY_FENCE_RE = /```[^\n]*\n([\s\S]*?)```/

function extractCode(text: string): string | null {
  // Priority 1: explicit <WORKBENCH_CODE> tags
  const tagMatch = TAG_RE.exec(text)
  if (tagMatch) return tagMatch[1].trim()

  // Priority 2: any fenced code block (```jsx, ```js, ```, etc.)
  const fenceMatch = ANY_FENCE_RE.exec(text)
  if (fenceMatch) return fenceMatch[1].trim()

  // Priority 3: bare function App() without any wrapper
  const appIdx = text.indexOf("function App()")
  if (appIdx !== -1) {
    const metaIdx = text.lastIndexOf("// TOOL METADATA", appIdx)
    const start = metaIdx !== -1 ? metaIdx : appIdx
    return text.slice(start).trim()
  }

  return null
}

function extractSchema(text: string): Record<string, unknown> | null {
  const match = SCHEMA_RE.exec(text)
  if (!match) return null
  try { return JSON.parse(match[1].trim()) as Record<string, unknown> } catch { return null }
}

function stripAllTags(text: string): string {
  return text
    .replace(TAG_RE,       "")
    .replace(ANY_FENCE_RE, "")
    .replace(SCHEMA_RE,    "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// Strip everything that would crash Babel standalone inside the iframe:
// ES module imports, export keywords, and stray wrapper tags.
function sanitizeCode(raw: string): string {
  const lines = raw.split("\n")
  const out: string[] = []
  let inMultiLineImport = false

  for (const line of lines) {
    const t = line.trim()

    // Multi-line import continuation: skip until we see 'from "..."'
    if (inMultiLineImport) {
      if (/\bfrom\s+['"]/.test(t)) inMultiLineImport = false
      continue
    }

    // Single or start-of-multiline import statement
    if (t.startsWith("import ") || t.startsWith("import{")) {
      // If 'from' is on this line it's a complete single-line import
      if (!/\bfrom\s+['"]/.test(t)) inMultiLineImport = true
      continue
    }

    // Strip 'export default' and 'export' keyword before declarations
    const stripped = line
      .replace(/^(\s*)export\s+default\s+/, "$1")
      .replace(/^(\s*)export\s+(?=(?:function|class|const|let|var)\b)/, "$1")

    // Drop stray WORKBENCH_CODE XML tags
    if (t === "<WORKBENCH_CODE>" || t === "</WORKBENCH_CODE>") continue

    // Strip pure comment lines (// TOOL METADATA, // name:, // dashboard:, etc.)
    // Inline comments like `const x = 1; // note` are kept because t doesn't start with //
    if (t.startsWith("//")) continue

    out.push(stripped)
  }

  return out
    .join("\n")
    .replace(/<BOP_SCHEMA>[\s\S]*?<\/BOP_SCHEMA>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// ─────────────────────────────────────────────
// IFRAME HTML TEMPLATE
//
// The AI code sits in a <script type="text/babel"> tag — no JSON.parse, no eval.
// The boot script runs first, defines showError + loadScript, then fires a sequential
// CDN chain. By the time Babel loads and processes the text/babel tag, all globals
// (React hooks, Lucide icons, useBOPStore) are already on window.
//
// </script> in AI code is escaped to <\/script> (one backslash). The HTML5 tokenizer
// requires the tag name after </ to start with an ASCII letter, so <\/ is treated as
// raw text and never closes the script element.
// ─────────────────────────────────────────────
const IFRAME_ICON_NAMES = [
  "DollarSign","TrendingUp","TrendingDown","BarChart2","BarChart3",
  "PieChart","LineChart","Percent","Calculator",
  "Users","User","Building2","Briefcase","Target","Award","Star",
  "Calendar","Clock","Bell","Timer",
  "AlertCircle","AlertTriangle","Info","CheckCircle","CheckCircle2",
  "Circle","XCircle","Loader2","Plus","Minus","X","Check",
  "Edit3","Trash2","Save","Copy","Download","Search","Filter",
  "Settings","RefreshCw","Eye","EyeOff",
  "ChevronDown","ChevronUp","ChevronLeft","ChevronRight",
  "ArrowUp","ArrowDown","ArrowLeft","ArrowRight",
  "List","ListChecks","ClipboardList","Layers","ExternalLink","SlidersHorizontal",
]

// ─────────────────────────────────────────────
// SELF-CONTAINED SANDBOX
//
// Architecture (pure postMessage):
//  1. Blob HTML is STATIC — no AI code embedded. Parent sends code via postMessage.
//  2. Loading animation is always visible until execCode fires and React mounts.
//  3. CDN chain: React → ReactDOM → Lucide → Babel. Each retries via jsDelivr.
//  4. After Babel loads, sandbox sends BOP_READY to parent, then flushes any code
//     that arrived via postMessage before the chain completed.
//  5. Parent sends code after BOP_READY, OR force-injects after 3s as a fallback.
//  6. execCode: Babel.transform(raw) + eval — explicit, no auto-processing quirks.
//  7. Tailwind play CDN loads non-blocking after render.
//  8. useBOPStore namespaces all keys by userId — each user's data is private.
// ─────────────────────────────────────────────
function buildSandboxHTML(): string {
  const iconList = JSON.stringify(IFRAME_ICON_NAMES)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
body{margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;}
*,*::before,*::after{box-sizing:border-box;}
#root{min-height:100vh;}
#bop-init{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:14px;}
.bop-dots{display:flex;gap:7px;}
.bop-dot{width:9px;height:9px;border-radius:50%;background:#002855;animation:bop-pulse 1.1s ease-in-out infinite;}
.bop-dot:nth-child(2){animation-delay:-.22s;}
.bop-dot:nth-child(3){animation-delay:-.44s;}
@keyframes bop-pulse{0%,80%,100%{transform:scale(0);opacity:.4}40%{transform:scale(1);opacity:1}}
.bop-label{font-size:11px;color:#94a3b8;letter-spacing:.04em;}
</style>
</head>
<body>
<div id="root">
  <div id="bop-init">
    <div class="bop-dots">
      <div class="bop-dot"></div><div class="bop-dot"></div><div class="bop-dot"></div>
    </div>
    <span class="bop-label">Loading BOPOS Workbench...</span>
  </div>
</div>
<script>
(function(){
  function showError(t,d){
    document.getElementById("root").innerHTML=
      '<div style="color:#b91c1c;background:#fef2f2;border:1px solid #fca5a5;'+
      'padding:20px;margin:20px;border-radius:8px;font-family:monospace;font-size:13px;white-space:pre-wrap">'+
      '<b>'+t+'</b><br><br>'+(d||'')+'</div>';
  }
  window.onerror=function(m,_s,_l,_c,e){showError("Runtime Error",e?(e.stack||e.message):String(m));return true;};
  window.onunhandledrejection=function(e){showError("Unhandled Promise",e.reason?String(e.reason.message||e.reason):"Unknown");};

  // Holds code that arrives before Babel is ready
  var _pendingCode=null;

  window.addEventListener("message",function(e){
    if(typeof e.data!=="string")return;
    if(typeof Babel!=="undefined"&&typeof React!=="undefined"){
      execCode(e.data);
    }else{
      _pendingCode=e.data;
    }
  });

  function execCode(raw){
    var mt='\\ntry{ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));}catch(ex){showError("Mount Error",ex.stack||ex.message);}';
    try{
      var out=Babel.transform(raw+mt,{presets:["react"],filename:"tool.jsx"}).code;
      eval(out);
    }catch(e){showError("Code Error",e.stack||e.message);}
  }

  // CDN loader — tries unpkg first, auto-retries with jsDelivr on failure
  function loadScript(path,cb){
    var cdns=["https://unpkg.com/","https://cdn.jsdelivr.net/npm/"];
    var idx=0;
    function next(){
      var s=document.createElement("script");
      s.src=cdns[idx]+path;s.crossOrigin="anonymous";
      s.onload=cb||function(){};
      s.onerror=function(){
        idx++;
        if(idx<cdns.length){next();}
        else{showError("CDN Load Failed","Could not load from any CDN:\\n"+path);}
      };
      document.head.appendChild(s);
    }
    next();
  }

  loadScript("react@18/umd/react.production.min.js",function(){
    var _uid=(localStorage.getItem("bopos_token")||"anon").replace(/[^a-zA-Z0-9]/g,"_").slice(0,20);
    window.useState=React.useState;window.useEffect=React.useEffect;
    window.useCallback=React.useCallback;window.useRef=React.useRef;
    window.useMemo=React.useMemo;window.useReducer=React.useReducer;

    window.useBOPStore=function(k,i){
      var _key=k+"_"+_uid;
      var _init=i;
      try{var _sv=localStorage.getItem(_key);if(_sv!==null)_init=JSON.parse(_sv);}catch(_x){}
      var _st=React.useState(_init);
      var _tr=React.useRef(null);
      function _set(v){
        var next=typeof v==="function"?v(_st[0]):v;
        _st[1](next);
        clearTimeout(_tr.current);
        _tr.current=setTimeout(function(){
          try{localStorage.setItem(_key,JSON.stringify(next));}catch(_x){}
        },2000);
      }
      return[_st[0],_set,"idle"];
    };
    window.SyncIndicator=function(){return null;};

    loadScript("react-dom@18/umd/react-dom.production.min.js",function(){
      loadScript("lucide@0.294.0/dist/umd/lucide.js",function(){
        var _lc=typeof lucide!=="undefined"?lucide:{};
        ${iconList}.forEach(function(n){window[n]=_lc[n];});

        loadScript("@babel/standalone/babel.min.js",function(){
          // Signal parent — sandbox is fully primed and ready for code
          try{window.parent.postMessage({type:"BOP_READY"},"*");}catch(_){}

          // Flush any code that arrived before Babel finished loading
          if(_pendingCode){execCode(_pendingCode);_pendingCode=null;}

          // Tailwind play CDN — non-blocking; styles via MutationObserver after render
          var _tw=document.createElement("script");
          _tw.src="https://cdn.tailwindcss.com";
          _tw.crossOrigin="anonymous";
          _tw.onerror=function(){
            var fb=document.createElement("style");
            fb.textContent="body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:8px;}*{box-sizing:border-box;}";
            document.head.appendChild(fb);
          };
          document.head.appendChild(_tw);
        });
      });
    });
  });
})();
</script>
</body>
</html>`
}

// ─────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────
function loadVersions(): WorkbenchVersion[] {
  try {
    const s = localStorage.getItem(VERSIONS_KEY)
    return s ? JSON.parse(s) : []
  } catch { return [] }
}

function persistVersions(versions: WorkbenchVersion[]) {
  localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions))
}

// ─────────────────────────────────────────────
// API CALL
// ─────────────────────────────────────────────
async function callWorkbenchClaude(messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("NO_KEY")

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":                              "application/json",
      "x-api-key":                                 apiKey,
      "anthropic-version":                         "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 4000,
      system:     systemPrompt,
      messages:   messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }> }
  return data.content[0]?.text ?? ""
}

// ─────────────────────────────────────────────
// VERSION HISTORY PANEL
// ─────────────────────────────────────────────
function VersionPanel({
  versions,
  activeVersionId,
  onSelect,
}: {
  versions:        WorkbenchVersion[]
  activeVersionId: string | null
  onSelect:        (v: WorkbenchVersion) => void
}) {
  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber)

  return (
    <div className="w-52 flex flex-col h-full bg-[#001022] border-r border-white/10 shrink-0">
      <div className="px-3 pt-3 pb-2 shrink-0">
        <Link
          to="/home"
          className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors"
        >
          <ChevronLeft className="h-3 w-3" />
          Back to OS
        </Link>
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5 border-y border-white/10 shrink-0">
        <Clock className="h-3 w-3 text-white/30 shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
          Version History
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {sorted.length === 0 ? (
          <p className="px-4 pt-4 text-[11px] text-white/20 leading-relaxed text-center">
            No versions yet.{"\n"}Build your first tool to save v1.
          </p>
        ) : (
          sorted.map((v) => (
            <button
              key={v.id}
              onClick={() => onSelect(v)}
              className={cn(
                "w-full text-left px-3 py-2.5 transition-colors border-l-2",
                activeVersionId === v.id
                  ? "bg-[#002855]/60 border-orange-500"
                  : "border-transparent hover:bg-white/5"
              )}
            >
              <span className={cn(
                "text-xs font-bold font-mono",
                activeVersionId === v.id ? "text-orange-400" : "text-white/50"
              )}>
                v{v.versionNumber}
              </span>
              <p className={cn(
                "text-[11px] mt-0.5 leading-tight line-clamp-2",
                activeVersionId === v.id ? "text-white/80" : "text-white/35"
              )}>
                {v.label}
              </p>
              <p className="text-[10px] text-white/20 mt-1">
                {new Date(v.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3 bg-[#001a3a] rounded-2xl rounded-tl-sm w-fit">
      <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-white/50 animate-bounce" />
    </div>
  )
}

// ─────────────────────────────────────────────
// DEPLOY WIZARD
// ─────────────────────────────────────────────
function DeployWizard({
  state,
  onUpdate,
  onClose,
  onDeploy,
}: {
  state:    DeployState
  onUpdate: (partial: Partial<DeployState>) => void
  onClose:  () => void
  onDeploy: () => void
}) {
  if (!state.open) return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#002855]">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-white" />
            <span className="text-sm font-bold text-white">Deploy to OS</span>
          </div>
          {state.step === "form" && (
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="px-6 py-6">
          {state.step === "form" && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Tool Name
                </label>
                <input
                  autoFocus
                  type="text"
                  value={state.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter" && state.name.trim()) onDeploy() }}
                  placeholder="e.g. Profit Margin Calculator"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Deploy To
                </label>
                <div className="flex flex-col gap-2">
                  {(["os", "mpr", "anchor"] as const).map((dash) => (
                    <button
                      key={dash}
                      onClick={() => onUpdate({ dashboard: dash })}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                        state.dashboard === dash
                          ? "border-[#002855] bg-[#002855]/5"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <div className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        state.dashboard === dash ? "bg-[#002855]" : "bg-gray-300"
                      )} />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {dash === "os" ? "The OS" : dash === "mpr" ? "The MPR" : "The Anchor"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {dash === "os"
                            ? "People, Process, Product, Profit"
                            : dash === "mpr"
                            ? "Master Process Roadmap"
                            : "52-Week Rhythm Engine"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={onDeploy}
                disabled={!state.name.trim()}
                className="w-full rounded-md py-3 text-sm font-bold text-white bg-[#002855] hover:bg-[#002855]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Deploy Tool
              </button>
            </div>
          )}

          {state.step === "loading" && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Loader2 className="h-8 w-8 text-[#002855] animate-spin" />
              <p className="text-sm font-semibold text-gray-700">Deploying your tool...</p>
            </div>
          )}

          {state.step === "success" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-bold text-gray-800">{state.name} deployed!</p>
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Your tool has been saved and is ready to use in the OS.
              </p>
              <button
                onClick={onClose}
                className="mt-2 rounded-md bg-[#002855] px-8 py-2.5 text-sm font-bold text-white hover:bg-[#002855]/90 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// STARTER PROMPTS
// ─────────────────────────────────────────────
const STARTER_PROMPTS = [
  "Generate a Profit Margin Calculator",
  "Draft a Weekly KPI Scorecard",
  "Build a 12-Week Goal Tracker",
  "Create a Profit First Allocation Tool",
]

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export function WorkbenchPage() {
  const { profile } = useProfile()
  const navigate     = useNavigate()
  const firstName    = profile.ownerFirstName || profile.ownerName?.split(" ")[0] || "Builder"
  const businessName = profile.businessName   || "your business"

  const [versions,        setVersions]      = useState<WorkbenchVersion[]>(loadVersions)
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null)
  const [currentCode,     setCurrentCode]   = useState("")
  const [currentSchema,   setCurrentSchema] = useState<Record<string, unknown> | null>(null)
  const [canvasTab,       setCanvasTab]     = useState<"preview" | "code">("preview")

  // Sanitized code: strips imports, export keywords, stray tags — what actually hits Babel
  const sanitizedCode = useMemo(() => (currentCode ? sanitizeCode(currentCode) : ""), [currentCode])
  const [messages,        setMessages]      = useState<ChatMessage[]>([])
  const [input,           setInput]         = useState("")
  const [isLoading,       setIsLoading]     = useState(false)
  const [error,           setError]         = useState<string | null>(null)
  const [deploy,          setDeploy]        = useState<DeployState>({
    open: false, step: "form", name: "", dashboard: "os",
  })

  const [toast, setToast] = useState<{ message: string; dashboard: "os" | "mpr" | "anchor" } | null>(null)

  // Show deploy success toast for 4 seconds
  useEffect(() => {
    if (deploy.step !== "success") return
    const dashLabel = deploy.dashboard === "os" ? "OS" : deploy.dashboard === "mpr" ? "MPR" : "Anchor"
    setToast({ message: `"${deploy.name}" deployed privately to your ${dashLabel}.`, dashboard: deploy.dashboard })
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [deploy.step, deploy.name, deploy.dashboard])

  // ── Iframe sandbox state ─────────────────────
  const iframeRef        = useRef<HTMLIFrameElement>(null)
  const blobUrlRef       = useRef<string | null>(null)
  const sandboxReadyRef  = useRef(false)
  const pendingCodeRef   = useRef<string>("")   // code waiting to be sent after BOP_READY
  const [iframeKey,     setIframeKey]     = useState(0)
  const [iframeLoading, setIframeLoading] = useState(false)

  const messagesEndRef  = useRef<HTMLDivElement>(null)
  const inputRef        = useRef<HTMLTextAreaElement>(null)
  const hasApiKey       = !!import.meta.env.VITE_ANTHROPIC_API_KEY
  // Tracks which message id we last extracted code from — prevents double-processing
  const lastExtractedId = useRef<string | null>(null)

  // Rebuild blob URL whenever sanitizedCode changes — revoke old URL to avoid leaks.
  // Code is NOT embedded in the blob; it's stored in pendingCodeRef and sent via
  // postMessage after BOP_READY (or force-injected after 3 seconds).
  useEffect(() => {
    if (!sanitizedCode) {
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
      pendingCodeRef.current = ""
      return
    }
    pendingCodeRef.current = sanitizedCode
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    const html = buildSandboxHTML()
    blobUrlRef.current = URL.createObjectURL(new Blob([html], { type: "text/html" }))
    sandboxReadyRef.current = false
    setIframeKey((k) => k + 1)
    setIframeLoading(true)
  }, [sanitizedCode])

  // BOP_READY: sandbox finished loading CDNs — send the pending code now
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type === "BOP_READY") {
        sandboxReadyRef.current = true
        setIframeLoading(false)
        if (pendingCodeRef.current) {
          iframeRef.current?.contentWindow?.postMessage(pendingCodeRef.current, "*")
        }
      }
    }
    window.addEventListener("message", onMsg)
    return () => window.removeEventListener("message", onMsg)
  }, [])

  // 3-second force-injection — if BOP_READY hasn't arrived, push code anyway.
  // Covers slow CDNs or sandboxes that load silently without firing the signal.
  useEffect(() => {
    if (!iframeLoading) return
    const t = setTimeout(() => {
      if (!sandboxReadyRef.current && pendingCodeRef.current) {
        iframeRef.current?.contentWindow?.postMessage(pendingCodeRef.current, "*")
      }
      setIframeLoading(false)
    }, 3000)
    return () => clearTimeout(t)
  }, [iframeLoading, iframeKey])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  // Message-to-Canvas bridge — safety net that fires whenever the messages list updates.
  // If handleSend already extracted code (hasCode === true), this is a no-op.
  // If extraction was missed (unsupported format), this catches it with enhanced parsing.
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (!last || last.role !== "assistant") return
    if (last.id === lastExtractedId.current) return  // already processed
    const code = extractCode(last.content)
    if (!code) return
    lastExtractedId.current = last.id
    if (code === currentCode) return  // handleSend already set it
    setCurrentCode(code)
    setCurrentSchema(extractSchema(last.content))
    setCanvasTab("preview")
  }, [messages, currentCode])

  const saveNewVersion = useCallback((
    code:    string,
    label:   string,
    schema?: Record<string, unknown> | null,
  ) => {
    const id = crypto.randomUUID()
    setVersions((prev) => {
      const next: WorkbenchVersion = {
        id,
        versionNumber: prev.length + 1,
        label:         label.slice(0, 60),
        code,
        ...(schema ? { schema } : {}),
        createdAt:     new Date().toISOString(),
      }
      const updated = [...prev, next]
      persistVersions(updated)
      return updated
    })
    setActiveVersionId(id)
  }, [])

  async function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: ChatMessage = {
      id:             crypto.randomUUID(),
      role:           "user",
      content:        text,
      displayContent: text,
      timestamp:      new Date().toISOString(),
      hasCode:        false,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setError(null)
    setIsLoading(true)

    try {
      const systemPrompt = getSystemPrompt(firstName, businessName)
      const rawReply     = await callWorkbenchClaude([...messages, userMsg], systemPrompt)
      const code         = extractCode(rawReply)
      const schema       = extractSchema(rawReply)
      const display      = stripAllTags(rawReply)

      const assistantMsg: ChatMessage = {
        id:             crypto.randomUUID(),
        role:           "assistant",
        content:        rawReply,
        displayContent: display,
        timestamp:      new Date().toISOString(),
        hasCode:        !!code,
      }
      setMessages((prev) => [...prev, assistantMsg])

      if (code) {
        setCurrentCode(code)
        setCurrentSchema(schema)
        const label = display.split("\n")[0].replace(/^#+\s*/, "").trim() || "Iteration"
        saveNewVersion(code, label, schema)
        setCanvasTab("preview")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setError(msg === "NO_KEY" ? "API key not configured." : `Error: ${msg}`)
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleVersionSelect(v: WorkbenchVersion) {
    setActiveVersionId(v.id)
    setCurrentCode(v.code)
    setCurrentSchema(v.schema ?? null)
    setCanvasTab("preview")
  }

  function handleManualSave() {
    if (!currentCode) return
    saveNewVersion(currentCode, "Manual save")
  }

  function handleRefreshPreview() {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")
    if (!lastAssistant) return
    const code = extractCode(lastAssistant.content)
    if (!code) return
    lastExtractedId.current = lastAssistant.id
    setCurrentCode(code)
    setCurrentSchema(extractSchema(lastAssistant.content))
    setCanvasTab("preview")
  }

  function handleResetCanvas() {
    setCurrentCode("")
    setCurrentSchema(null)
    setActiveVersionId(null)
    setCanvasTab("preview")
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
    setIframeKey((k) => k + 1)
    setIframeLoading(false)
  }

  function handleDeploySubmit() {
    setDeploy((d) => ({ ...d, step: "loading" }))
    const userId = (localStorage.getItem("bopos_token") ?? "anon")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .slice(0, 20)
    const existing = JSON.parse(localStorage.getItem(DEPLOYED_KEY) ?? "[]")
    existing.push({
      id:         crypto.randomUUID(),
      name:       deploy.name,
      dashboard:  deploy.dashboard,
      code:       currentCode,
      userId,
      deployedAt: new Date().toISOString(),
    })
    localStorage.setItem(DEPLOYED_KEY, JSON.stringify(existing))
    window.dispatchEvent(new CustomEvent('bop-deploy'))
    setTimeout(() => setDeploy((d) => ({ ...d, step: "success" })), 1500)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#001022]">

      {/* ── Pane 1: Version History ─────────────────────── */}
      <VersionPanel
        versions={versions}
        activeVersionId={activeVersionId}
        onSelect={handleVersionSelect}
      />

      {/* ── Pane 2: The Architect ───────────────────────── */}
      <div className="w-[360px] flex flex-col h-full bg-[#011428] border-r border-white/10 shrink-0">

        <div className="flex items-center gap-2 px-4 py-3 bg-[#001022] border-b border-white/10 shrink-0">
          <Terminal className="h-3.5 w-3.5 text-green-400 shrink-0" />
          <span className="text-[11px] font-mono text-green-400 tracking-wide">
            System: BOPOS Workbench Brain
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="flex flex-col gap-4 pt-2">
              <div className="rounded-xl bg-[#002855]/50 border border-blue-900/40 px-4 py-4">
                <p className="text-xs font-semibold text-white/70">Architect online.</p>
                <p className="mt-1 text-[11px] text-white/40 leading-relaxed">
                  Describe a tool and I'll generate a live React component. Every iteration auto-saves as a version.
                </p>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20 px-1">
                Quick starts
              </p>
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setInput(p); inputRef.current?.focus() }}
                  className="text-left rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === "user"
            return (
              <div key={msg.id} className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
                <div className={cn(
                  "max-w-[90%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap",
                  isUser
                    ? "bg-[#002855] text-white rounded-tr-sm"
                    : "bg-[#001a3a] text-white/75 rounded-tl-sm"
                )}>
                  {msg.displayContent}
                </div>
                {msg.hasCode && (
                  <div className="flex items-center gap-1 px-1">
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/50 px-2.5 py-1">
                      <Code2 className="h-2.5 w-2.5 text-emerald-400" />
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                        Code extracted · Version saved
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {isLoading && (
            <div className="flex justify-start">
              <TypingDots />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-950/50 border border-red-800/40 px-3 py-2 text-[11px] text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {hasApiKey ? (
          <div className="border-t border-white/10 bg-[#001022] px-3 py-3 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe the process or tool you'd like to build..."
                rows={1}
                className={cn(
                  "flex-1 resize-none rounded-xl border border-white/10 bg-[#011428]",
                  "px-3 py-2.5 text-xs text-white/80 placeholder:text-white/25",
                  "focus:outline-none focus:ring-1 focus:ring-blue-800/60",
                  "max-h-28 overflow-y-auto leading-relaxed"
                )}
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#002855] text-white hover:bg-[#002855]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />
                }
              </button>
            </div>
            <p className="mt-1.5 text-center text-[9px] text-white/20">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        ) : (
          <div className="border-t border-white/10 px-4 py-4 shrink-0">
            <div className="flex items-center gap-2 rounded-lg bg-amber-950/40 border border-amber-800/30 px-3 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <p className="text-[11px] text-amber-400/80">
                Add VITE_ANTHROPIC_API_KEY to .env.local
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Pane 3: Canvas ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            {/* Tab switcher */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setCanvasTab("preview")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  canvasTab === "preview"
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
              <button
                onClick={() => setCanvasTab("code")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  canvasTab === "code"
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Code2 className="h-3 w-3" />
                Code
              </button>
            </div>

            {/* Data Sync Ready indicator */}
            {currentCode && (
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1">
                <Cloud className="h-3 w-3 text-emerald-500" />
                <span className="text-[10px] font-semibold text-emerald-600">Data Sync Ready</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Reset Canvas — panic button, always visible */}
            <button
              onClick={handleResetCanvas}
              title="Clear canvas and return to welcome screen"
              className="flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Canvas
            </button>

            {/* Refresh Preview — manual bridge trigger */}
            <button
              onClick={handleRefreshPreview}
              disabled={!messages.some((m) => m.role === "assistant")}
              title="Re-extract code from last Architect response"
              className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-gray-300 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh Preview
            </button>

            {currentCode && (
              <button
                onClick={handleManualSave}
                className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-800 transition-colors"
              >
                <Save className="h-3 w-3" />
                Save Version
              </button>
            )}
            {currentCode && (
              <button
                onClick={() => setDeploy({ open: true, step: "form", name: "", dashboard: "os" })}
                className="flex items-center gap-1.5 rounded-md bg-[#002855] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#002855]/90 transition-colors"
              >
                <Rocket className="h-3 w-3" />
                Deploy to OS
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden relative">
          {!currentCode ? (
            // ── Empty state ──────────────────────────────
            <div className="flex h-full items-center justify-center bg-[#F0F2F5]">
              <div className="flex flex-col items-center gap-6 text-center max-w-md px-10">
                <Hammer className="h-10 w-10 text-[#002855]/15" />
                <div className="flex flex-col gap-2">
                  <p
                    className="text-[2rem] font-semibold leading-tight text-[#002855]"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Welcome to the BOP Workbench.
                  </p>
                  <p
                    className="text-xl text-[#002855]/55 font-light"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    What are we building today, {firstName}?
                  </p>
                </div>
                <p className="text-sm text-gray-400 font-medium">
                  Describe your tool in the Architect chat — a live preview will appear here.
                </p>
              </div>
            </div>
          ) : (
            // ── Iframe Sandbox Canvas ─────────────────────
            // Crashes stay inside the iframe — the BOPOS OS never white-screens
            <>
              {/* AI generating overlay */}
              {isLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm">
                  <Loader2 className="h-7 w-7 animate-spin text-[#002855]/40" />
                  <p className="text-xs text-gray-400">Building your tool...</p>
                </div>
              )}

              {canvasTab === "preview" ? (
                <div className="h-full relative bg-[#f8fafc]">
                  <iframe
                    key={iframeKey}
                    ref={iframeRef}
                    src={blobUrlRef.current ?? "about:blank"}
                    className="h-full w-full border-none"
                    sandbox="allow-scripts allow-same-origin"
                    title="BOP Tool Preview"
                  />
                </div>
              ) : (
                <div className="h-full overflow-auto bg-[#011428]">
                  <div className="px-4 pt-3 pb-1">
                    <span className="inline-block rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-400">
                      Sanitized — what goes into the iframe
                    </span>
                  </div>
                  <pre className="px-6 py-4 text-xs text-green-300/70 font-mono leading-relaxed whitespace-pre-wrap">
                    {sanitizedCode}
                  </pre>
                  {currentSchema && (
                    <div className="px-6 pb-8 border-t border-white/10 pt-4">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-2">
                        BOP Schema
                      </p>
                      <pre className="text-[11px] text-amber-300/60 font-mono leading-relaxed whitespace-pre-wrap">
                        {JSON.stringify(currentSchema, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Deploy Wizard */}
        <DeployWizard
          state={deploy}
          onUpdate={(partial) => setDeploy((d) => ({ ...d, ...partial }))}
          onClose={() => setDeploy((d) => ({ ...d, open: false, step: "form" }))}
          onDeploy={handleDeploySubmit}
        />
      </div>

      {/* Deploy success toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-xl bg-emerald-600 px-5 py-3 text-white shadow-2xl">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-semibold">{toast.message}</span>
          <button
            onClick={() => {
              const path = toast.dashboard === "os" ? "/home" : toast.dashboard === "mpr" ? "/mpr" : "/anchor"
              navigate(path)
              setToast(null)
            }}
            className="ml-1 shrink-0 rounded-md border border-white/30 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
          >
            View →
          </button>
          <button onClick={() => setToast(null)} className="text-white/70 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
