/**
 * Shared destinations for the public marketing pages.
 *
 * "Build My Career Plan" points at signup rather than /onboarding directly:
 * middleware bounces unauthenticated visitors off /onboarding, so routing
 * through signup reaches the same place without a redirect flash.
 */
export const SIGNUP = "/login?mode=signup";
export const SIGNIN = "/login";
