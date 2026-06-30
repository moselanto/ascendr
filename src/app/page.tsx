export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero — tokens-driven, matches Stage 1 design system */}
      <section className="px-6 py-20 md:py-30 text-center max-w-3xl mx-auto">
        <span className="inline-block text-caption font-semibold tracking-wide uppercase text-primary bg-[#eef2ff] rounded-full px-3 py-1">
          The Global AI Career Growth Ecosystem
        </span>
        <h1 className="text-h1 md:text-display mt-6 text-text">
          Accelerate Your Career with AI and World-Class Mentors
        </h1>
        <p className="text-body text-text-secondary mt-5 max-w-xl mx-auto">
          Join a global community of professionals, mentors, employers,
          entrepreneurs, and educators. Learn from verified experts, access
          AI-powered career guidance, build meaningful relationships, and
          accelerate your professional growth.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <a
            href="#"
            className="bg-primary text-white font-semibold rounded-sm px-6 py-3"
          >
            Get started
          </a>
          <a
            href="#"
            className="bg-card text-text font-semibold rounded-sm px-6 py-3 border border-border"
          >
            Explore communities
          </a>
        </div>
      </section>

      {/* Pillars */}
      <section className="px-6 pb-24 max-w-5xl mx-auto grid gap-4 md:grid-cols-3">
        {[
          ["AI Career Coach", "Always-on, personalized guidance, planning, and accountability."],
          ["AI Mentor Clone", "Each expert's knowledge becomes a cited, 24/7 AI product."],
          ["Communities", "Daily-habit spaces with chat, live sessions, and gamification."],
        ].map(([title, body]) => (
          <div
            key={title}
            className="bg-card border border-border rounded-md p-6"
          >
            <h3 className="text-h4 text-text">{title}</h3>
            <p className="text-small text-text-secondary mt-2">{body}</p>
          </div>
        ))}
      </section>

      <footer className="px-6 py-8 text-center text-caption text-text-secondary border-t border-border">
        ASCENDR · Rise. Learn. Connect. Lead.
      </footer>
    </main>
  );
}
