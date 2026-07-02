"use client";

import { useEffect, useState } from "react";

/**
 * Auto-scrolling brand slideshow for the login/signup panel.
 *
 * Replaces the old static dots (which looked like a broken carousel) with a
 * real rotating message set. The dots now reflect the active slide and are
 * clickable; the deck advances every 5s and pauses on hover.
 */

const SLIDES = [
  {
    title: "Accelerate your career with AI and world-class mentors",
    body: "Learning, mentorship, community, and AI coaching — in one ecosystem.",
  },
  {
    title: "Your always-on AI Career Coach",
    body: "A personalized plan and the single next best step, grounded in your goal.",
  },
  {
    title: "Grow with a global community",
    body: "Live Q&A, realtime chat, streaks, and leaderboards that keep momentum going.",
  },
];

export default function BrandSlideshow() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, [paused]);

  const slide = SLIDES[active];

  return (
    <div
      className="mt-auto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Crossfading message. Fixed min-height prevents layout jump between slides. */}
      <div className="min-h-[132px]">
        <h1 key={`t-${active}`} className="text-h2 font-extrabold leading-tight max-w-md animate-[fadeIn_.5s_ease]">
          {slide.title}
        </h1>
        <p key={`b-${active}`} className="text-[#c7d2fe] text-small mt-3 max-w-sm animate-[fadeIn_.6s_ease]">
          {slide.body}
        </p>
      </div>

      {/* Dots — reflect + control the active slide. */}
      <div className="flex gap-2 mt-8" role="tablist" aria-label="Highlights">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={`Slide ${i + 1}`}
            onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active ? "w-9 bg-white" : "w-4 bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
