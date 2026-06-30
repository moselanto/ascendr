import { login, signup } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; mode?: string; redirect?: string };
}) {
  const isSignup = searchParams.mode === "signup";
  return (
    <main className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-end p-12 text-white bg-gradient-to-br from-primary to-dark-bg">
        <div className="text-2xl font-black">ASCEND<span className="text-[#a5b4fc]">R</span></div>
        <h1 className="text-h2 mt-auto font-extrabold leading-tight">
          Accelerate Your Career with AI and World-Class Mentors
        </h1>
        <p className="text-[#c7d2fe] mt-3 max-w-sm">
          Learning, mentorship, community, and AI coaching — in one ecosystem.
        </p>
      </div>
      <div className="flex flex-col justify-center p-8 md:p-16 bg-card">
        <h2 className="text-h3 font-bold">{isSignup ? "Create your account" : "Welcome back"}</h2>
        <p className="text-text-secondary text-small mt-1">
          {isSignup ? "Join the ASCENDR community." : "Sign in to continue."}
        </p>

        {searchParams.error && (
          <div className="mt-4 text-small text-danger bg-[#fef2f2] border border-[#fecaca] rounded-sm px-3 py-2">
            {searchParams.error}
          </div>
        )}

        <form className="mt-6 flex flex-col gap-3">
          <input type="hidden" name="redirect" value={searchParams.redirect ?? "/app"} />
          {isSignup && (
            <input
              name="full_name"
              placeholder="Full name"
              required
              className="border border-border rounded-sm px-4 py-3 text-body"
            />
          )}
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="border border-border rounded-sm px-4 py-3 text-body"
          />
          <input
            name="password"
            type="password"
            placeholder="Password (min 6 chars)"
            required
            minLength={6}
            className="border border-border rounded-sm px-4 py-3 text-body"
          />
          <button
            formAction={isSignup ? signup : login}
            className="bg-primary text-white font-semibold rounded-sm px-4 py-3 mt-1"
          >
            {isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="text-small text-text-secondary mt-5">
          {isSignup ? (
            <>Already have an account? <a className="text-primary font-semibold" href="/login">Sign in</a></>
          ) : (
            <>New to ASCENDR? <a className="text-primary font-semibold" href="/login?mode=signup">Create an account</a></>
          )}
        </p>
      </div>
    </main>
  );
}
