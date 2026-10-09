/**
 * Shared destinations for the public marketing pages.
 *
 * "Build My Career Plan" points at signup rather than /onboarding directly:
 * middleware bounces unauthenticated visitors off /onboarding, so routing
 * through signup reaches the same place without a redirect flash.
 */
export const SIGNUP = "/login?mode=signup";
export const SIGNIN = "/login";

/**
 * Where "Run a pilot" / "Become a design partner" on /networks goes.
 * Swap for a booking link (Calendly, Cal.com) or a team inbox when ready.
 */
export const PILOT_CONTACT =
  "mailto:mosesnura043@gmail.com?subject=ASCENDR%20Networks%20pilot";
