import { login, signup } from "./actions";
import BrandSlideshow from "./BrandSlideshow";
import PasswordField from "./PasswordField";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; mode?: string; redirect?: string };
}) {
  const isSignup = searchParams.mode === "signup";
  return (
    <main className="min-h-screen grid md:grid-cols-2 bg-[#EEF1F6]">
      {/* Brand panel */}
      <div className="relative hidden md:flex flex-col justify-end overflow-hidden p-12 text-white">
        {/* Hero photo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/login-hero.png')" }}
          aria-hidden
        />
        {/* Brand gradient wash for legibility + on-brand color */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary/85 to-dark-bg/95"
          aria-hidden
        />

        <div className="relative flex h-full flex-col">
          <div className="text-2xl font-black">
            ASCEND<span className="text-[#a5b4fc]">R</span>
          </div>
          <BrandSlideshow />
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col bg-card md:justify-center">
        {/* Mobile hero banner — mirrors the desktop photo above the form */}
        <div className="relative flex h-40 flex-col justify-end overflow-hidden p-6 text-white md:hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/login-hero.png')" }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/85 to-dark-bg/95" aria-hidden />
          <div className="relative">
            <div className="text-xl font-black">
              ASCEND<span className="text-[#a5b4fc]">R</span>
            </div>
            <p className="mt-1 text-caption text-[#c7d2fe]">Rise. Learn. Connect. Lead.</p>
          </div>
        </div>

        <div className="flex flex-col p-8 md:p-16 md:justify-center">
        <h2 className="text-h3 font-bold">
          {isSignup ? "Create your account" : "Welcome back"}
        </h2>
        <p className="text-text-secondary text-small mt-1">
          {isSignup ? "Join the ASCENDR community." : "Sign in to continue."}
        </p>

        {searchParams.error && (
          <div className="mt-4 text-small text-danger bg-[#fef2f2] border border-[#fecaca] rounded-sm px-3 py-2">
            {searchParams.error}
          </div>
        )}

        <form className="mt-6 flex flex-col gap-3">
          <input
            type="hidden"
            name="redirect"
            value={searchParams.redirect ?? (isSignup ? "/onboarding" : "/app")}
          />
          {isSignup && (
            <input
              name="full_name"
              placeholder="Full name"
              required
              autoComplete="name"
              className="rounded-sm border border-border px-4 py-3 text-body focus:outline-none focus:border-primary"
            />
          )}
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            autoComplete="email"
            className="rounded-sm border border-border px-4 py-3 text-body focus:outline-none focus:border-primary"
          />
          <PasswordField
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
          <button
            formAction={isSignup ? signup : login}
            className="bg-primary text-white font-semibold rounded-sm px-4 py-3 mt-1 hover:opacity-95"
          >
            {isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="text-small text-text-secondary mt-5">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <a className="text-primary font-semibold" href="/login">
                Sign in
              </a>
            </>
          ) : (
            <>
              New to ASCENDR?{" "}
              <a className="text-primary font-semibold" href="/login?mode=signup">
                Create an account
              </a>
            </>
          )}
        </p>
        </div>
      </div>
    </main>
  );
}
