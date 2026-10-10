"use client";

import { useEffect, useState } from "react";

/**
 * Brand side of the sign-in page: full-bleed photos that slowly pan and
 * crossfade behind the "Career intelligence" message, with the message
 * rotating in step. Pauses on hover and respects reduced-motion settings.
 */

const SLIDES = [
  {
    image: "/login/mentoring.jpg",
    title: "Learn from people",
    accent: "a step ahead.",
    body: "Mentors, communities and live sessions that move you toward the role you want.",
  },
  {
    image: "/login/group.jpg",
    title: "Your network. Your skills.",
    accent: "Your next opportunity.",
    body: "One place to see where you stand, who can help, and what to do next.",
  },
  {
    image: "/login/focused.jpg",
    title: "See your gap,",
    accent: "skill by skill.",
    body: "Compare what you know with what your target role really needs, then close it in order.",
  },
  {
    image: "/login/workshop.jpg",
    title: "Get matched to",
    accent: "real openings.",
    body: "Opportunities ranked by how ready you are today, not by keywords.",
  },
];

const POINTS = ["See your gap", "Learn from mentors", "Get matched to real openings"];

const INTERVAL = 6000;

export default function LoginShowcase({ variant = "panel" }: { variant?: "panel" | "banner" }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setStill(mq.matches);
  }, []);

  useEffect(() => {
    if (paused || still) return;
    const t = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), INTERVAL);
    return () => clearInterval(t);
  }, [paused, still]);

  const slide = SLIDES[active];

  const images = (
    <div aria-hidden className="absolute inset-0">
      {SLIDES.map((s, i) => (
        <div
          key={s.image}
          className="absolute inset-0 transition-opacity duration-[1400ms] ease-out"
          style={{ opacity: i === active ? 1 : 0 }}
        >
          <div
            className={`absolute inset-0 bg-cover bg-top ${i === active && still === false ? "login-kenburns" : ""}`}
            style={{ backgroundImage: `url('${s.image}')` }}
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-ink/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/10" />
      <style>{`
        @keyframes loginKenburns {
          from { transform: scale(1.02) translate3d(0, 0, 0); }
          to   { transform: scale(1.12) translate3d(-1.5%, -1%, 0); }
        }
        .login-kenburns { animation: loginKenburns 9s ease-out forwards; will-change: transform; }
        @keyframes loginRise {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-rise { animation: loginRise .7s ease both; }
        @keyframes loginFill { from { width: 0%; } to { width: 100%; } }
      `}</style>
    </div>
  );

  if (variant === "banner") {
    return (
      <div className="relative h-56 overflow-hidden rounded-2xl text-white shadow-card">
        {images}
        <div className="relative flex h-full flex-col justify-end p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Career intelligence</p>
          <p key={active} className="login-rise mt-1.5 text-[20px] font-semibold leading-tight tracking-tight">
            {slide.title} <span className="accent-serif text-brand-200">{slide.accent}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full min-h-screen flex-col overflow-hidden text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {images}

      <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-14">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Career intelligence
        </span>

        <div className="max-w-[520px]">
          <div className="min-h-[190px]">
            <h2 key={`t-${active}`} className="login-rise text-[40px] font-semibold leading-[1.08] tracking-[-0.02em] xl:text-[46px]">
              {slide.title} <span className="accent-serif text-brand-200">{slide.accent}</span>
            </h2>
            <p key={`b-${active}`} className="login-rise mt-4 max-w-[440px] text-[16px] leading-relaxed text-white/75" style={{ animationDelay: "120ms" }}>
              {slide.body}
            </p>
          </div>

          <ul className="mt-8 flex flex-wrap gap-2">
            {POINTS.map((p) => (
              <li
                key={p}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-[13px] text-white/90 backdrop-blur"
              >
                <span aria-hidden className="text-accent">{"\u2713"}</span>
                {p}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex items-center gap-2" role="tablist" aria-label="Highlights">
            {SLIDES.map((s, i) => (
              <button
                key={s.image}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Show highlight ${i + 1}`}
                onClick={() => setActive(i)}
                className="relative h-1 w-10 overflow-hidden rounded-full bg-white/25"
              >
                {i === active && (
                  <span
                    key={`f-${active}-${paused ? "p" : "r"}`}
                    className="absolute inset-y-0 left-0 rounded-full bg-white"
                    style={
                      paused || still
                        ? { width: "100%" }
                        : { animation: `loginFill ${INTERVAL}ms linear forwards` }
                    }
                  />
                )}
                {i < active && <span className="absolute inset-0 rounded-full bg-white/70" />}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[12px] text-white/55">Skills data from the European Commission&apos;s ESCO framework.</p>
      </div>
    </div>
  );
}
