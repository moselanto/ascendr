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
 * Where "Run a pilot" / "Become a design partner" / "Talk to us" go.
 * A page rather than a bare mailto: link, which silently does nothing when
 * the visitor has no mail app set up. Swap PILOT_EMAIL for a team inbox, or
 * PILOT_CONTACT for a booking link (Calendly, Cal.com), when ready.
 */
export const PILOT_EMAIL = "mosesnura043@gmail.com";
export const PILOT_SUBJECT = "ASCENDR Networks pilot";
export const PILOT_CONTACT = "/networks/pilot";
