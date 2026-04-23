# BOPOS — CLAUDE.md
## Business On Purpose Operating System
### Context file for Claude Code — read this before every session

---

## WHAT THIS PROJECT IS

BOPOS is a Service as a Software platform built natively on AI. It liberates small business owners (3–100 employees) from chaos by delivering a fully functioning business operating system through four client-facing panels.

Rally cry: **Liberate Thousands. Build the Tree. Sell It Once.**

Built by: Brandon Gray, Director of Business Operations Integrity, Business On Purpose.

---

## THE TECH STACK

```
Frontend:   React (Vite) + Tailwind CSS + shadcn/ui
AI:         Anthropic Claude API (claude-sonnet-4-20250514)
Auth:       Supabase (planned) / Clerk
Database:   Supabase
Backend:    Vercel serverless functions
Preview:    iframe + srcDoc + Babel standalone + React/Tailwind CDN
Port:       5174 (dev)
```

**CRITICAL:** The Anthropic API key never lives in the browser. All API calls route through `/api/chat` (Vercel serverless). If you see the API key referenced in any frontend file, that is a security violation — flag it immediately.

---

## THE FOUR PANELS

| Panel | Purpose | Brain File |
|---|---|---|
| OS | Coaches the 4 P's across 24+ modules | OS Brain (inside MPR Brain) |
| MPR | Maps 4 Core Systems | BOPOS_MPR_Brain_System_Prompt.md |
| Anchor | 52-week rhythm engine | BOPOS_Anchor_Brain_System_Prompt.md |
| Workbench | Business Creation Engine | BOPOS_Workbench_Brain_System_Prompt.md |

---

## THE FOUR BUILD FILTERS — CHECK EVERY DECISION

1. **One-Click** — Can it be done in one step? If not, ask why.
2. **Scalable** — Does it require a human to run it manually?
3. **Use What We Have** — Is there an existing stack solution?
4. **Continual Progress** — Does it have a feedback loop built in?

Do not add new dependencies without confirming the existing stack cannot do it.

---

## CURRENT BUILD STATUS

```
✅ React + Vite scaffold
✅ Three-panel sidebar (OS / MPR / Anchor)
✅ Workbench panel (chat + preview + version history)
✅ Onboarding intake form (BOPOSOnboarding.jsx)
✅ Four Brain system prompts (in project knowledge)
✅ 26+ module scripts (in project knowledge)
✅ 29+ PDF templates (in project knowledge)

🔄 Workbench iframe preview renderer (Babel standalone)
🔄 Vercel serverless API route (/api/chat)
🔄 Auth layer (Supabase/Clerk)
🔄 Token budget enforcement per user
🔄 Deploy to MPR/OS/Anchor logic
🔄 Supabase schema (users, conversations, tools, token_usage)
```

---

## WORKBENCH RULES — ALWAYS ENFORCE

Every tool generated in the Workbench must:
- Be a React functional component using Tailwind CSS only
- Include a Reset or Clear button
- Be named using MPR naming convention: [Function] — [System]
- End with `export default ComponentName` on its own line
- Use no import or require statements (React/hooks available globally)
- Be deployed before the session closes

The preview renderer uses:
```html
<iframe srcDoc={previewHtml(code)} sandbox="allow-scripts allow-same-origin" />
```
With Babel standalone transpiling JSX inside the iframe at runtime.

---

## FILE STRUCTURE (KEY FILES)

```
/src
  /components
    BOPOSOnboarding.jsx     ← Intake form (onboarding)
    WorkbenchPanel.jsx      ← Workbench chat + preview
    OSPanel.jsx             ← Operating System panel
    MPRPanel.jsx            ← Master Process Roadmap panel
    AnchorPanel.jsx         ← Anchor / rhythm panel
  /api
    chat.js                 ← Vercel serverless (API key lives here)
  App.jsx                   ← Main router + auth gate
  main.jsx                  ← React root mount
/public
/CLAUDE.md                  ← This file
```

---

## BOP TERMINOLOGY — USE EXACTLY

- 4 P's → Purpose, People, Process, Profit
- 4 Core Systems → Marketing, Sales, Operations, Administration
- Vision Story → Foundation of everything. 7 categories.
- B.I.G. Wins → Begin In Gratitude. Every session opens here.
- RPM → Repetition, Predictability, Meaning
- Real Revenue → Revenue minus COGS
- Mothership → Governance layer. Never client-facing.
- Living document → 80–90% complete by design. Always.

---

## WHEN SOMETHING BREAKS

1. Check the browser console first (F12 → Console)
2. Check the most recently edited file — that is almost always the source
3. Do not change multiple files at once to fix one error
4. If the whole app is white screen → check `src/main.jsx` and `src/App.jsx` for syntax errors first
5. If the Workbench preview is blank → check the iframe srcDoc is receiving the code string

---

## HOW BRANDON WORKS

- All caps = direct command, execute it
- One thing at a time — do not bundle unrequested changes
- When something is broken, give one cause and one fix
- No excessive explanation — get to the answer
- Screenshots are context — read them before responding
- Check the Four Build Filters before proposing anything new

---

## THE PERFORMANCE STANDARD

Every output in this project is held to a world-class standard. No placeholders. No partial fixes. No "this might work." If it is not ready to ship, it is not ready to send.

Work demonstrates faith. Build accordingly.
