import { useState } from "react"
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import bopLogo from "@/assets/bop-logo.png"

interface SignInProps {
  onSignIn:        () => void
  onCreateAccount: () => void
  onDevBypass?:    () => void
}

export function SignIn({ onSignIn, onCreateAccount, onDevBypass }: SignInProps) {
  const [mode,      setMode]      = useState<"signin" | "signup">("signin")
  const [email,     setEmail]     = useState("")
  const [password,  setPassword]  = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [showPw,    setShowPw]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [info,      setInfo]      = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (mode === "signup" && password !== confirmPw) {
      setError("Passwords don't match.")
      return
    }

    setIsLoading(true)
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) {
          setError(
            err.message.toLowerCase().includes("api key") || err.message.toLowerCase().includes("invalid")
              ? "Supabase API key is invalid. Update VITE_SUPABASE_ANON_KEY in your .env file with the anon public key from your Supabase dashboard (Settings → API)."
              : err.message
          )
          return
        }
        onSignIn()
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password })
        if (err) { setError(err.message); return }
        // Supabase may require email confirmation depending on project settings.
        // If auto-confirm is enabled the user lands immediately; otherwise show a message.
        setInfo("Account created! Check your email to confirm, then sign in.")
        setMode("signin")
        setPassword("")
        setConfirmPw("")
      }
    } finally {
      setIsLoading(false)
    }
  }

  function switchMode(next: "signin" | "signup") {
    setMode(next)
    setError(null)
    setInfo(null)
    setPassword("")
    setConfirmPw("")
  }

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center p-6"
      style={{ backgroundColor: "#BCC6CC" }}
    >
      <div
        className="flex w-full flex-col lg:flex-row overflow-hidden"
        style={{
          maxWidth: 900,
          borderRadius: 4,
          boxShadow: [
            "0 1px 2px rgba(0,0,0,0.06)",
            "0 4px 12px rgba(0,0,0,0.10)",
            "0 16px 48px rgba(0,0,0,0.14)",
            "0 40px 80px rgba(0,0,0,0.10)",
          ].join(", "),
        }}
      >

        {/* ══ LEFT PANEL — Brand ════════════════════════════ */}
        <div
          className="flex flex-col lg:w-[45%]"
          style={{ backgroundColor: "#003D73" }}
        >
          <div className="flex flex-1 items-center justify-center px-10 py-16">
            <img
              src={bopLogo}
              alt="Business on Purpose"
              style={{ width: 212, height: "auto" }}
            />
          </div>

          <div className="border-t border-white/10 px-10 pb-10 pt-6">
            <h1
              className="text-xl font-bold leading-snug text-white"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700 }}
            >
              Welcome to BOPOS.
            </h1>
            <p
              className="mt-0.5 text-sm font-normal text-white/60"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Business on Purpose Operating System.
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-white/40">
              Your journey to Business On Purpose starts here.
            </p>
          </div>
        </div>

        {/* ══ RIGHT PANEL — Action ══════════════════════════ */}
        <div
          className="flex flex-1 flex-col px-10 py-10"
          style={{ backgroundColor: "#002855" }}
        >

          <div className="flex flex-1 flex-col justify-center">

            <div className="mb-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
                Business on Purpose
              </p>
              <h2
                className="mt-1 text-2xl text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700 }}
              >
                {mode === "signin" ? "Sign In" : "Create Account"}
              </h2>
              <p className="mt-1 text-sm text-white/40">
                {mode === "signin"
                  ? "Enter your credentials to continue."
                  : "Choose an email and password to get started."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="email"
                  className="text-[10px] font-semibold uppercase tracking-widest text-white/40"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className={cn(
                      "w-full rounded-xl py-3 pl-10 pr-4 text-sm",
                      "bg-white/5 text-white placeholder:text-white/25",
                      "border transition-all duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/50",
                      error ? "border-red-400/40" : "border-white/10 hover:border-white/20"
                    )}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="password"
                  className="text-[10px] font-semibold uppercase tracking-widest text-white/40"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={cn(
                      "w-full rounded-xl py-3 pl-10 pr-10 text-sm",
                      "bg-white/5 text-white placeholder:text-white/25",
                      "border transition-all duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/50",
                      error ? "border-red-400/40" : "border-white/10 hover:border-white/20"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password — signup only */}
              {mode === "signup" && (
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="confirmPw"
                    className="text-[10px] font-semibold uppercase tracking-widest text-white/40"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      id="confirmPw"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="••••••••"
                      className={cn(
                        "w-full rounded-xl py-3 pl-10 pr-4 text-sm",
                        "bg-white/5 text-white placeholder:text-white/25",
                        "border transition-all duration-150",
                        "focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/50",
                        error ? "border-red-400/40" : "border-white/10 hover:border-white/20"
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-xs text-red-300">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Info (e.g. confirmation email sent) */}
              {info && (
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-xs text-emerald-300">
                  {info}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className={cn(
                  "mt-1 w-full rounded-xl py-3 text-sm font-bold transition-all duration-150",
                  "bg-white text-[#002855]",
                  "hover:bg-white/90 active:scale-[0.99]",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  isLoading && "cursor-wait"
                )}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-[#002855]/20 border-t-[#002855] animate-spin" />
                    {mode === "signin" ? "Signing in…" : "Creating account…"}
                  </span>
                ) : (
                  mode === "signin" ? "Sign In" : "Create Account"
                )}
              </button>
            </form>
          </div>

          {/* ── Dev Bypass ───────────────────────────────── */}
          {onDevBypass && (
            <button
              type="button"
              onClick={onDevBypass}
              className="mt-4 w-full rounded-xl border border-amber-400/30 bg-amber-400/10 py-2.5 text-xs font-semibold text-amber-300 hover:bg-amber-400/20 transition-colors"
            >
              Developer Bypass — Enter Dashboard
            </button>
          )}

          {/* ── Bottom links ─────────────────────────────── */}
          <div className="mt-8 border-t border-white/10 pt-5 space-y-3">
            {mode === "signin" && (
              <div className="flex items-center gap-4 text-xs text-white/30">
                <button
                  type="button"
                  className="hover:text-white/60 transition-colors"
                  onClick={() => alert("Password reset coming soon. Contact your BOPOS administrator.")}
                >
                  Forgot Password
                </button>
                <span className="text-white/10">|</span>
                <button
                  type="button"
                  className="hover:text-white/60 transition-colors"
                  onClick={() => alert("Request access at mybusinessonpurpose.com")}
                >
                  Request Access
                </button>
              </div>
            )}

            <p className="text-xs text-white/30">
              {mode === "signin" ? (
                <>
                  New to BOPOS?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="text-white/55 underline-offset-2 hover:text-white/80 hover:underline transition-colors"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="text-white/55 underline-offset-2 hover:text-white/80 hover:underline transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
