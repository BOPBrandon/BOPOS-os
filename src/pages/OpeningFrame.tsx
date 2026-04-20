import bopLogo from "@/assets/bop-logo.png"

interface OpeningFrameProps {
  onEnter: () => void
}

export function OpeningFrame({ onEnter }: OpeningFrameProps) {
  return (
    <>
      <style>{`
        @keyframes of-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .of-fade { opacity: 0; animation: of-fade-up 0.7s ease forwards; }
        .of-d1   { animation-delay: 0.10s; }
        .of-d2   { animation-delay: 0.30s; }
        .of-d3   { animation-delay: 0.55s; }
        .of-d4   { animation-delay: 0.80s; }
        .of-d5   { animation-delay: 1.10s; }
      `}</style>

      <div
        className="flex min-h-screen w-full flex-col items-center justify-center px-6 py-16"
        style={{ backgroundColor: "#002855" }}
      >
        <div className="flex w-full max-w-[640px] flex-col items-center text-center">

          {/* Logo */}
          <div className="of-fade of-d1 mb-12">
            <img
              src={bopLogo}
              alt="Business on Purpose"
              style={{ height: 44, width: "auto", filter: "brightness(0) invert(1)" }}
            />
          </div>

          {/* Eyebrow */}
          <p className="of-fade of-d1 mb-5 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/30">
            Business on Purpose Operating System
          </p>

          {/* Headline */}
          <h1
            className="of-fade of-d2 text-4xl font-bold leading-tight text-white sm:text-5xl"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700 }}
          >
            Welcome to BOPOS.
          </h1>

          {/* CPR paragraph */}
          <p className="of-fade of-d3 mt-7 text-base leading-relaxed text-white/55 sm:text-lg">
            Most businesses don't fail from a lack of ambition. They fail from a lack of{" "}
            <span className="font-semibold text-white">Clarity</span>,{" "}
            <span className="font-semibold text-white">Process</span>, and{" "}
            <span className="font-semibold text-white">Repetition</span>.
            {" "}BOPOS was built to restore all three.
          </p>

          {/* CPR chips */}
          <div className="of-fade of-d3 mt-6 flex items-center gap-3">
            {[
              { letter: "C", label: "Clarity"    },
              { letter: "P", label: "Process"    },
              { letter: "R", label: "Repetition" },
            ].map(({ letter, label }) => (
              <div
                key={letter}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5"
              >
                <span
                  className="text-sm font-bold text-white"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {letter}
                </span>
                <span className="text-xs text-white/50">{label}</span>
              </div>
            ))}
          </div>

          {/* Scott Beebe quote */}
          <div className="of-fade of-d4 mt-14 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-7 text-left">
            <p
              className="text-lg italic leading-relaxed text-white/80 sm:text-xl"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              "Your process is your product. If it is not written down, it does not exist — and if it does not exist, you cannot improve it."
            </p>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
              — Scott Beebe · Business on Purpose
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={onEnter}
            className="of-fade of-d5 mt-10 rounded-xl bg-white px-10 py-4 text-sm font-bold text-[#002855] shadow-lg transition-all duration-150 hover:bg-white/90 active:scale-[0.99]"
          >
            Enter the Operating System →
          </button>

          {/* Footer note */}
          <p className="of-fade of-d5 mt-6 text-[11px] text-white/20">
            Secured by BOPOS · Business on Purpose Operating System
          </p>

        </div>
      </div>
    </>
  )
}
