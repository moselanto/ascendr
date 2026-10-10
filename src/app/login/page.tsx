import Link from "next/link";
import { Logo } from "@/components/home/Logo";
import { login, signup } from "./actions";
import PasswordField from "./PasswordField";
import LoginShowcase from "./LoginShowcase";
import { safeNext } from "./safe-next";

export const metadata = { title: "Sign in | ASCENDR" };


export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; mode?: string; next?: string; redirect?: string };
}) {
  const isSignup = searchParams.mode === "signup";

  // `next` is the return path; `redirect` is the legacy name. Both are
  // sanitised so only same-site relative paths survive.
  const rawNext = searchParams.next ?? searchParams.redirect;
  const nextValue = rawNext ? safeNext(rawNext, "") : "";

  const switchParams = new URLSearchParams();
  if (!isSignup) switchParams.set("mode", "signup");
  if (nextValue) switchParams.set("next", nextValue);
  const switchQs = switchParams.toString();
  const switchHref = switchQs ? `/login?${switchQs}` : "/login";

  return (
    <main className="grid min-h-screen bg-surface lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel (left, desktop) */}
      <div className="relative hidden lg:block">
        <div className="sticky top-0 h-screen">
          <LoginShowcase />
        </div>
      </div>

      {/* Form column (right) */}
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:py-8">
        <div className="flex items-center justify-between">
          <Logo />
          <Link href="/" className="text-[13px] font-medium text-text-secondary hover:text-ink">
            {"←"} Back to home
          </Link>
        </div>

        <div className="mt-5 lg:hidden">
          <LoginShowcase variant="banner" />
        </div>

        <div className="flex flex-1 items-center justify-center py-8 lg:py-10">
          <div className="w-full max-w-[420px]">
            <div className="rounded-2xl border border-border bg-white p-6 shadow-card sm:p-8">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">
                {isSignup ? "Create account" : "Sign in"}
              </p>
              <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-ink">
                {isSignup ? (
                  <>
                    Start your <span className="accent-serif">next move</span>
                  </>
                ) : (
                  <>
                    Welcome <span className="accent-serif">back</span>
                  </>
                )}
              </h1>
              <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
                {isSignup
                  ? "Free to join. Set your goal in under two minutes."
                  : "Sign in to pick up where you left off."}
              </p>

              {searchParams.error && (
                <div
                  role="alert"
                  className="mt-5 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2.5 text-[13px] leading-relaxed text-danger"
                >
                  {searchParams.error}
                </div>
              )}

              <form className="mt-6 flex flex-col gap-4">
                {nextValue ? <input type="hidden" name="next" value={nextValue} /> : null}

                {isSignup && (
                  <div>
                    <label htmlFor="full_name" className="mb-1.5 block text-[13px] font-medium text-ink">
                      Full name
                    </label>
                    <input
                      id="full_name"
                      name="full_name"
                      placeholder="Ada Okafor"
                      required
                      autoComplete="name"
                      className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-text-secondary/70 focus:border-ink/40"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-ink">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-text-secondary/70 focus:border-ink/40"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-ink">
                    Password
                  </label>
                  <PasswordField autoComplete={isSignup ? "new-password" : "current-password"} />
                </div>

                <button
                  formAction={isSignup ? signup : login}
                  className="mt-1 w-full rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-ink-700"
                >
                  {isSignup ? "Create account" : "Sign in"}
                </button>
              </form>

              <p className="mt-6 text-center text-[13px] text-text-secondary">
                {isSignup ? "Already have an account? " : "New to ASCENDR? "}
                <Link href={switchHref} className="font-medium text-ink underline-offset-4 hover:underline">
                  {isSignup ? "Sign in" : "Create an account"}
                </Link>
              </p>
            </div>

            <p className="mt-5 text-center text-[12px] text-text-secondary">
              By continuing you agree to use ASCENDR responsibly. Your data stays yours.
            </p>
          </div>
        </div>
      </div>

    </main>
  );
}
