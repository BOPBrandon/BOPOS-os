import { useState } from "react";

// ─────────────────────────────────────────────
// BOPOS Onboarding — BOP Edition
// Warm, coaching-led, hospitality-first intake.
//
// HOW TO USE IN APP.JSX:
//
//   import BOPOSOnboarding from "./components/BOPOSOnboarding";
//   import { useState } from "react";
//
//   function App() {
//     const [profile, setProfile] = useState(
//       () => JSON.parse(localStorage.getItem("bopos_profile")) || null
//     );
//     if (!profile) {
//       return <BOPOSOnboarding onComplete={(p) => setProfile(p)} />;
//     }
//     return <YourMainApp profile={profile} />;
//   }
//
// ACCESS PROFILE ANYWHERE:
//   const profile = JSON.parse(localStorage.getItem("bopos_profile"));
//   profile.ownerFirstName   → "Sarah"
//   profile.businessName     → "Acme Contracting"
//   profile.industry         → "Construction & Contracting"
//   profile.employeeCount    → "6–10 employees"
//   profile.biggestChallenge → "..."
// ─────────────────────────────────────────────

const INDUSTRIES = [
  "Construction & Contracting",
  "Plumbing & HVAC",
  "Electrical",
  "Landscaping & Lawn Care",
  "Cleaning & Janitorial",
  "Roofing",
  "Painting",
  "Flooring & Tile",
  "Home Remodeling & Renovation",
  "Pest Control",
  "Auto Repair & Detailing",
  "Trucking & Logistics",
  "Food & Beverage",
  "Retail",
  "Professional Services",
  "Healthcare & Wellness",
  "Real Estate",
  "Marketing & Creative",
  "Technology & IT",
  "Other",
];

const EMPLOYEE_RANGES = [
  "Just me (solo owner)",
  "2–5 employees",
  "6–10 employees",
  "11–25 employees",
  "26–50 employees",
  "51–100 employees",
];

export default function BOPOSOnboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    ownerFirstName: "",
    ownerLastName: "",
    businessName: "",
    industry: "",
    employeeCount: "",
    city: "",
    state: "",
    biggestChallenge: "",
  });
  const [errors, setErrors] = useState({});

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const first = form.ownerFirstName.trim();

  const validateStep = () => {
    const e = {};
    if (step === 1) {
      if (!form.ownerFirstName.trim()) e.ownerFirstName = "We need your first name.";
      if (!form.ownerLastName.trim()) e.ownerLastName = "And your last name.";
    }
    if (step === 2) {
      if (!form.businessName.trim()) e.businessName = "What do you call your business?";
      if (!form.industry) e.industry = "Pick the one that fits closest.";
      if (!form.employeeCount) e.employeeCount = "Select the size of your team.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep((s) => s + 1); };
  const back = () => setStep((s) => s - 1);

  const handleSubmit = () => {
    const profile = { ...form, createdAt: new Date().toISOString() };
    localStorage.setItem("bopos_profile", JSON.stringify(profile));
    setStep(4);
    // onComplete fires from the Step 4 button — calling it here would
    // immediately unmount this component before Step 4 can render.
  };

  return (
    <div style={s.overlay}>
      <div style={s.card}>

        {/* ── Brand Header ───────────────────── */}
        <div style={s.brand}>
          <div style={s.brandMark}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p style={s.brandEyebrow}>BUSINESS ON PURPOSE</p>
            <p style={s.brandName}>Operating System</p>
          </div>
        </div>

        {/* ── Progress dots (steps 1–3) ───────── */}
        {step > 0 && step < 4 && (
          <div style={s.dots}>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                style={{
                  ...s.dot,
                  backgroundColor: n <= step ? "#1a3a5c" : "#e2e8f0",
                  transform: n === step ? "scale(1.3)" : "scale(1)",
                }}
              />
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════
            STEP 0 — The Arrival
        ══════════════════════════════════════ */}
        {step === 0 && (
          <div style={s.body}>
            <div style={s.welcomeBadge}>You made it.</div>
            <h1 style={s.h1}>
              You just made one of the best decisions you will ever make for your business.
            </h1>
            <p style={s.p}>
              Most business owners spend years — sometimes decades — running hard, working long,
              and still feeling like the business is running <em>them</em>. You decided to change
              that. That is not a small thing.
            </p>
            <p style={s.p}>
              The Business On Purpose Operating System is built to liberate you from the chaos —
              not with more complexity, but with clarity. A clear Vision Story. The right people
              in the right seats. Documented processes your team can run without you. Financial
              tools that tell the truth.
            </p>
            <p style={s.p}>
              Before we build anything, we want to know who you are and what you are carrying.
              Two minutes. A few honest questions. Then we get to work.
            </p>
            <div style={s.quoteBlock}>
              <p style={s.quote}>
                "The goal is not a better-run business. The goal is a liberated owner."
              </p>
              <p style={s.quoteAttr}>— Scott Beebe, Founder, Business On Purpose</p>
            </div>
            <button style={s.btnPrimary} onClick={next}>
              I am ready — let's begin →
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════
            STEP 1 — Who Are You?
        ══════════════════════════════════════ */}
        {step === 1 && (
          <div style={s.body}>
            <p style={s.stepEyebrow}>Step 1 of 3</p>
            <h2 style={s.h2}>First — who are we building this for?</h2>
            <p style={s.p}>
              Every tool inside this OS is built for a specific owner. Not a generic business.
              Not a template. A real person running a real company. That person is you.
              Let's make it official.
            </p>

            <div style={s.row}>
              <div style={s.halfField}>
                <label style={s.label}>First Name</label>
                <input
                  style={{ ...s.input, ...(errors.ownerFirstName ? s.inputErr : {}) }}
                  placeholder="Sarah"
                  value={form.ownerFirstName}
                  onChange={(e) => update("ownerFirstName", e.target.value)}
                  autoFocus
                />
                {errors.ownerFirstName && (
                  <span style={s.err}>{errors.ownerFirstName}</span>
                )}
              </div>
              <div style={s.halfField}>
                <label style={s.label}>Last Name</label>
                <input
                  style={{ ...s.input, ...(errors.ownerLastName ? s.inputErr : {}) }}
                  placeholder="Johnson"
                  value={form.ownerLastName}
                  onChange={(e) => update("ownerLastName", e.target.value)}
                />
                {errors.ownerLastName && (
                  <span style={s.err}>{errors.ownerLastName}</span>
                )}
              </div>
            </div>

            <div style={s.nav}>
              <div />
              <button style={s.btnPrimary} onClick={next}>
                That's me — continue →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            STEP 2 — The Business
        ══════════════════════════════════════ */}
        {step === 2 && (
          <div style={s.body}>
            <p style={s.stepEyebrow}>Step 2 of 3</p>
            <h2 style={s.h2}>
              {first
                ? `Good to meet you, ${first}. Now tell us about your business.`
                : "Now tell us about your business."}
            </h2>
            <p style={s.p}>
              This is how your OS stops being generic and starts being yours. The more specific
              you are, the more your coaching will feel like it was built for your world —
              because it was.
            </p>

            <div style={s.field}>
              <label style={s.label}>What do you call your business?</label>
              <input
                style={{ ...s.input, ...(errors.businessName ? s.inputErr : {}) }}
                placeholder="e.g. Johnson Plumbing & Mechanical"
                value={form.businessName}
                onChange={(e) => update("businessName", e.target.value)}
                autoFocus
              />
              {errors.businessName && (
                <span style={s.err}>{errors.businessName}</span>
              )}
            </div>

            <div style={s.field}>
              <label style={s.label}>What trade or industry are you in?</label>
              <div style={s.selectWrap}>
                <select
                  style={{
                    ...s.input,
                    ...s.select,
                    ...(errors.industry ? s.inputErr : {}),
                  }}
                  value={form.industry}
                  onChange={(e) => update("industry", e.target.value)}
                >
                  <option value="">Choose the closest match…</option>
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                <span style={s.chevron}>▾</span>
              </div>
              {errors.industry && <span style={s.err}>{errors.industry}</span>}
            </div>

            <div style={s.field}>
              <label style={s.label}>How many people are on your team right now?</label>
              <div style={s.selectWrap}>
                <select
                  style={{
                    ...s.input,
                    ...s.select,
                    ...(errors.employeeCount ? s.inputErr : {}),
                  }}
                  value={form.employeeCount}
                  onChange={(e) => update("employeeCount", e.target.value)}
                >
                  <option value="">Select your team size…</option>
                  {EMPLOYEE_RANGES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <span style={s.chevron}>▾</span>
              </div>
              {errors.employeeCount && (
                <span style={s.err}>{errors.employeeCount}</span>
              )}
            </div>

            <div style={s.row}>
              <div style={s.halfField}>
                <label style={s.label}>
                  City <span style={s.opt}>(optional)</span>
                </label>
                <input
                  style={s.input}
                  placeholder="Charleston"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </div>
              <div style={s.halfField}>
                <label style={s.label}>
                  State <span style={s.opt}>(optional)</span>
                </label>
                <input
                  style={s.input}
                  placeholder="SC"
                  maxLength={2}
                  value={form.state}
                  onChange={(e) =>
                    update("state", e.target.value.toUpperCase())
                  }
                />
              </div>
            </div>

            <div style={s.nav}>
              <button style={s.btnGhost} onClick={back}>← Back</button>
              <button style={s.btnPrimary} onClick={next}>Almost there →</button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            STEP 3 — The Honest Question
        ══════════════════════════════════════ */}
        {step === 3 && (
          <div style={s.body}>
            <p style={s.stepEyebrow}>Step 3 of 3</p>
            <h2 style={s.h2}>
              {first
                ? `One last question, ${first} — and it's the most important one.`
                : "One last question — and it's the most important one."}
            </h2>
            <p style={s.p}>
              Every business owner who walks into BOP coaching is carrying something.
              A problem that will not quit. A weight that follows them home. A feeling
              that no matter how hard they work, they cannot get fully free.
            </p>
            <p style={s.p}>
              We call it <strong>the chaos.</strong> And we have spent 11 years learning
              how to systematically dismantle it — one tool, one module, one rhythm at a
              time. Your Vision Story. Your people. Your processes. Your numbers. Built
              together, layer by layer, until the business runs without you at the center
              of everything.
            </p>
            <p style={s.p}>What is yours?</p>

            <div style={s.field}>
              <label style={s.label}>
                What is the one thing keeping you stuck right now?{" "}
                <span style={s.opt}>Be honest — this is where your OS starts.</span>
              </label>
              <textarea
                style={s.textarea}
                placeholder="e.g. Everything runs through me. I can't take a day off without something falling apart. I'm working harder than ever but I don't feel like I'm building anything — I feel like I'm just surviving."
                value={form.biggestChallenge}
                onChange={(e) => update("biggestChallenge", e.target.value)}
                rows={5}
                autoFocus
              />
            </div>

            <div style={s.nav}>
              <button style={s.btnGhost} onClick={back}>← Back</button>
              <button style={s.btnPrimary} onClick={handleSubmit}>
                Build my OS →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            STEP 4 — The Big Welcome
        ══════════════════════════════════════ */}
        {step === 4 && (
          <div style={{ ...s.body, alignItems: "center", textAlign: "center" }}>

            <div style={s.checkRing}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="#1a3a5c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2 style={{ ...s.h2, marginTop: "8px" }}>
              {first
                ? `${first}, your OS is ready. Let's get to work.`
                : "Your OS is ready. Let's get to work."}
            </h2>

            <p style={{ ...s.p, textAlign: "center" }}>
              {form.businessName ? `${form.businessName} is now in the system. ` : ""}
              Everything we build from here belongs to you — tools you will actually use,
              rhythms your team can run, and a Vision Story that makes every decision
              easier. This is what running a business on purpose looks like.
            </p>

            {form.biggestChallenge.trim() && (
              <div style={s.challengeCard}>
                <p style={s.challengeLabel}>What you're carrying:</p>
                <p style={s.challengeText}>
                  "{form.biggestChallenge.trim()}"
                </p>
                <p style={s.challengeNote}>
                  We heard you. That is exactly what this OS is built to fix.
                </p>
              </div>
            )}

            <div style={{ ...s.summaryCard, alignSelf: "stretch", textAlign: "left" }}>
              <SummaryRow
                label="Owner"
                value={`${form.ownerFirstName} ${form.ownerLastName}`}
              />
              <SummaryRow label="Business" value={form.businessName} />
              <SummaryRow label="Industry" value={form.industry} />
              <SummaryRow label="Team Size" value={form.employeeCount} />
              {form.city && (
                <SummaryRow
                  label="Location"
                  value={`${form.city}${form.state ? `, ${form.state}` : ""}`}
                />
              )}
            </div>

            <button
              style={{ ...s.btnPrimary, width: "100%", justifyContent: "center" }}
              onClick={() =>
                onComplete &&
                onComplete(JSON.parse(localStorage.getItem("bopos_profile")))
              }
            >
              Enter my Business On Purpose OS →
            </button>

            <p style={s.finePrint}>
              Begin In Gratitude. You made a decision today that most business owners
              never make.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Summary row helper ──────────────────────────
function SummaryRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={s.summaryRow}>
      <span style={s.summaryLabel}>{label}</span>
      <span style={s.summaryValue}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const NAVY = "#1a3a5c";
const CREAM = "#fdfcf9";
const BORDER = "#e2e8f0";
const TEXT = "#0d1b2a";
const MUTED = "#64748b";
const ERR = "#c53030";

const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "linear-gradient(145deg, #eef2f7 0%, #f7f5f0 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "24px",
    fontFamily: "'Georgia', 'Times New Roman', serif",
  },
  card: {
    backgroundColor: CREAM,
    borderRadius: "20px",
    boxShadow:
      "0 12px 60px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
    width: "100%",
    maxWidth: "560px",
    padding: "44px 48px",
    boxSizing: "border-box",
    maxHeight: "90vh",
    overflowY: "auto",
  },

  // Brand
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "36px",
    paddingBottom: "28px",
    borderBottom: `1px solid ${BORDER}`,
  },
  brandMark: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    backgroundColor: NAVY,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  brandEyebrow: {
    fontSize: "9px",
    fontWeight: "700",
    letterSpacing: "0.14em",
    color: MUTED,
    margin: 0,
    fontFamily: "'Inter', sans-serif",
    textTransform: "uppercase",
  },
  brandName: {
    fontSize: "15px",
    fontWeight: "700",
    color: NAVY,
    margin: "2px 0 0",
    fontFamily: "'Inter', sans-serif",
    letterSpacing: "-0.01em",
  },

  // Progress
  dots: {
    display: "flex",
    gap: "8px",
    marginBottom: "32px",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    transition: "all 0.25s ease",
  },

  // Layout
  body: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  row: {
    display: "flex",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },
  halfField: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "6px",
  },

  // Typography
  welcomeBadge: {
    display: "inline-block",
    backgroundColor: "#ebf4ff",
    color: NAVY,
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "5px 14px",
    borderRadius: "99px",
    fontFamily: "'Inter', sans-serif",
    alignSelf: "flex-start",
  },
  stepEyebrow: {
    fontSize: "11px",
    fontWeight: "600",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: MUTED,
    margin: 0,
    fontFamily: "'Inter', sans-serif",
  },
  h1: {
    fontSize: "27px",
    fontWeight: "700",
    color: TEXT,
    margin: 0,
    lineHeight: 1.3,
    letterSpacing: "-0.02em",
  },
  h2: {
    fontSize: "22px",
    fontWeight: "700",
    color: TEXT,
    margin: 0,
    lineHeight: 1.35,
    letterSpacing: "-0.02em",
  },
  p: {
    fontSize: "15.5px",
    color: "#374151",
    margin: 0,
    lineHeight: 1.75,
  },

  // Quote
  quoteBlock: {
    borderLeft: `3px solid ${NAVY}`,
    paddingLeft: "18px",
  },
  quote: {
    fontSize: "15px",
    fontStyle: "italic",
    color: TEXT,
    margin: "0 0 6px",
    lineHeight: 1.65,
  },
  quoteAttr: {
    fontSize: "12px",
    color: MUTED,
    margin: 0,
    fontFamily: "'Inter', sans-serif",
    fontStyle: "normal",
  },

  // Inputs
  label: {
    fontSize: "13.5px",
    fontWeight: "600",
    color: TEXT,
    fontFamily: "'Inter', sans-serif",
  },
  opt: {
    fontWeight: "400",
    color: MUTED,
    fontSize: "12px",
  },
  input: {
    height: "46px",
    padding: "0 14px",
    border: `1.5px solid ${BORDER}`,
    borderRadius: "10px",
    fontSize: "15px",
    color: TEXT,
    backgroundColor: "#fff",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "'Inter', sans-serif",
    transition: "border-color 0.15s",
  },
  inputErr: {
    borderColor: ERR,
  },
  selectWrap: {
    position: "relative",
  },
  select: {
    appearance: "none",
    paddingRight: "36px",
    cursor: "pointer",
  },
  chevron: {
    position: "absolute",
    right: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    color: MUTED,
    pointerEvents: "none",
    fontSize: "13px",
  },
  textarea: {
    padding: "13px 14px",
    border: `1.5px solid ${BORDER}`,
    borderRadius: "10px",
    fontSize: "15px",
    color: TEXT,
    backgroundColor: "#fff",
    outline: "none",
    resize: "vertical",
    fontFamily: "'Georgia', serif",
    lineHeight: 1.7,
    width: "100%",
    boxSizing: "border-box",
  },
  err: {
    fontSize: "12px",
    color: ERR,
    fontFamily: "'Inter', sans-serif",
  },

  // Buttons
  btnPrimary: {
    backgroundColor: NAVY,
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "0 26px",
    height: "48px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "'Inter', sans-serif",
    letterSpacing: "-0.01em",
    transition: "background-color 0.15s",
  },
  btnGhost: {
    backgroundColor: "transparent",
    color: MUTED,
    border: `1.5px solid ${BORDER}`,
    borderRadius: "10px",
    padding: "0 20px",
    height: "48px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },

  // Completion screen
  checkRing: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    border: `3px solid ${NAVY}`,
    backgroundColor: "#ebf4ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  challengeCard: {
    backgroundColor: "#fff8f0",
    border: "1px solid #fde8c8",
    borderRadius: "12px",
    padding: "18px 22px",
    textAlign: "left",
    alignSelf: "stretch",
  },
  challengeLabel: {
    fontSize: "10px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "#b45309",
    margin: "0 0 8px",
    fontFamily: "'Inter', sans-serif",
  },
  challengeText: {
    fontSize: "14.5px",
    fontStyle: "italic",
    color: "#78350f",
    margin: "0 0 10px",
    lineHeight: 1.65,
  },
  challengeNote: {
    fontSize: "13px",
    color: "#92400e",
    margin: 0,
    fontWeight: "600",
    fontFamily: "'Inter', sans-serif",
  },
  summaryCard: {
    backgroundColor: "#f8fafc",
    border: `1px solid ${BORDER}`,
    borderRadius: "12px",
    padding: "18px 22px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    fontSize: "14px",
    gap: "12px",
  },
  summaryLabel: {
    color: MUTED,
    fontWeight: "500",
    fontFamily: "'Inter', sans-serif",
    flexShrink: 0,
  },
  summaryValue: {
    color: TEXT,
    fontWeight: "600",
    fontFamily: "'Inter', sans-serif",
    textAlign: "right",
  },
  finePrint: {
    fontSize: "12.5px",
    color: MUTED,
    fontStyle: "italic",
    margin: "4px 0 0",
    lineHeight: 1.6,
    textAlign: "center",
  },
};
