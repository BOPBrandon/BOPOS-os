import { useState } from "react"
import bopLogo from "@/assets/bop-logo.png"

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
]

export interface OnboardingData {
  name: string
  businessName: string
  location: string
  industry: string
  employeeCount: string
  yearsInBusiness: string
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void
}

const TOTAL = 6

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-lg " +
  "text-[#0d1b2a] placeholder:text-gray-400 outline-none transition-all duration-150 " +
  "focus:border-[#002855] focus:bg-white focus:ring-2 focus:ring-[#002855]/10"

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep]       = useState(1)
  const [form, setForm]       = useState<OnboardingData>({
    name: "", businessName: "", location: "",
    industry: "", employeeCount: "", yearsInBusiness: "",
  })
  const [error, setError]         = useState("")
  const [isBuilding, setIsBuilding] = useState(false)

  const firstName = form.name.trim().split(" ")[0] || ""
  const bizName   = form.businessName.trim() || "your business"

  function set(field: keyof OnboardingData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (error) setError("")
  }

  function validate(): boolean {
    const msg = (
      step === 1 ? (!form.name.trim()            && "Please enter your name.")          :
      step === 2 ? (!form.businessName.trim()    && "Please enter your business name.") :
      step === 3 ? (!form.location.trim()        && "Please enter your city and state."):
      step === 4 ? (!form.industry               && "Please select your industry.")     :
      step === 5 ? (!form.employeeCount.trim()   && "Please enter the number of employees.") :
      step === 6 ? (!form.yearsInBusiness.trim() && "Please enter years in business.")  :
      false
    )
    if (msg) { setError(msg as string); return false }
    return true
  }

  function advance() {
    if (!validate()) return
    if (step < TOTAL) {
      setStep((s) => s + 1)
    } else {
      setIsBuilding(true)
      setTimeout(() => onComplete(form), 2000)
    }
  }

  function back() {
    setError("")
    setStep((s) => s - 1)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") advance()
  }

  // ── Building workspace loading state ──────────────────────
  if (isBuilding) {
    return (
      <div
        className="flex min-h-screen w-full items-center justify-center"
        style={{ backgroundColor: "#BCC6CC" }}
      >
        <div className="flex flex-col items-center gap-5 px-6 text-center">
          <div className="h-12 w-12 rounded-full border-[3px] border-[#002855]/20 border-t-[#002855] animate-spin" />
          <div>
            <p
              className="text-3xl font-bold text-[#002855]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Building your workspace…
            </p>
            {firstName && (
              <p className="mt-2 text-sm text-[#002855]/50">
                Personalizing your OS for {firstName}.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Question text per step ─────────────────────────────────
  function question(): string {
    switch (step) {
      case 1: return "What is your name?"
      case 2: return `Great to meet you, ${firstName || "there"}. What is the name of your business?`
      case 3: return `Where is ${bizName} located?`
      case 4: return "What industry are you in?"
      case 5: return "How many full-time W2 employees do you currently have?"
      case 6: return "How many years have you been in business?"
      default: return ""
    }
  }

  // ── Input per step ─────────────────────────────────────────
  function renderInput() {
    switch (step) {
      case 1:
        return (
          <input
            key="name" autoFocus type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="e.g. Sarah Johnson"
            className={inputCls}
          />
        )
      case 2:
        return (
          <input
            key="businessName" autoFocus type="text"
            value={form.businessName}
            onChange={(e) => set("businessName", e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="e.g. Johnson Plumbing & Mechanical"
            className={inputCls}
          />
        )
      case 3:
        return (
          <input
            key="location" autoFocus type="text"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="e.g. Charleston, SC"
            className={inputCls}
          />
        )
      case 4:
        return (
          <div className="relative">
            <select
              key="industry" autoFocus
              value={form.industry}
              onChange={(e) => set("industry", e.target.value)}
              className={`${inputCls} appearance-none cursor-pointer pr-10`}
            >
              <option value="">Choose the closest match…</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              ▾
            </span>
          </div>
        )
      case 5:
        return (
          <input
            key="employeeCount" autoFocus type="number" min="0"
            value={form.employeeCount}
            onChange={(e) => set("employeeCount", e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="e.g. 8"
            className={`${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          />
        )
      case 6:
        return (
          <input
            key="yearsInBusiness" autoFocus type="number" min="0"
            value={form.yearsInBusiness}
            onChange={(e) => set("yearsInBusiness", e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="e.g. 5"
            className={`${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
          />
        )
    }
  }

  const progress = (step / TOTAL) * 100

  return (
    <>
      <style>{`
        @keyframes ob-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ob-enter { animation: ob-rise 0.32s ease forwards; }
      `}</style>

      <div
        className="flex min-h-screen w-full items-center justify-center px-6 py-12"
        style={{ backgroundColor: "#BCC6CC" }}
      >
        <div className="w-full max-w-[520px]">

          {/* ── Card ──────────────────────────────────────── */}
          <div
            className="overflow-hidden rounded-2xl bg-white"
            style={{
              boxShadow: [
                "0 1px 2px rgba(0,0,0,0.06)",
                "0 4px 12px rgba(0,0,0,0.10)",
                "0 16px 48px rgba(0,0,0,0.14)",
                "0 40px 80px rgba(0,0,0,0.10)",
              ].join(", "),
            }}
          >
            {/* Progress bar */}
            <div className="h-1 bg-gray-100">
              <div
                className="h-full bg-[#002855] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="px-10 py-10">

              {/* Header */}
              <div className="mb-10 flex items-center justify-between">
                <img
                  src={bopLogo}
                  alt="Business on Purpose"
                  className="h-6 w-auto opacity-60"
                />
                <span className="text-xs font-medium text-gray-400 tabular-nums">
                  {step} / {TOTAL}
                </span>
              </div>

              {/* Question — re-animates on each step change */}
              <div key={step} className="ob-enter mb-8">
                <h2
                  className="text-2xl font-bold leading-snug text-[#0d1b2a] sm:text-[1.75rem]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {question()}
                </h2>
                {step === 3 && (
                  <p className="mt-2 text-sm text-gray-500">City and State</p>
                )}
              </div>

              {/* Input field */}
              <div className="mb-8">
                {renderInput()}
                {error && (
                  <p className="mt-2 text-xs font-medium text-red-500">{error}</p>
                )}
              </div>

              {/* Navigation */}
              <div className={`flex items-center ${step > 1 ? "justify-between" : "justify-end"}`}>
                {step > 1 && (
                  <button
                    type="button"
                    onClick={back}
                    className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-500 transition-all hover:border-gray-300 hover:text-gray-700"
                  >
                    ← Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={advance}
                  className="rounded-xl bg-[#002855] px-8 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#002855]/90 active:scale-[0.98]"
                >
                  {step === TOTAL ? "Finish →" : "Continue →"}
                </button>
              </div>

            </div>
          </div>

          {/* Footer */}
          <p className="mt-5 text-center text-xs text-[#002855]/40">
            Secured by BOPOS · Business on Purpose Operating System
          </p>

        </div>
      </div>
    </>
  )
}
