/** HttpOnly cookie set after successful login (validated against the API). */
export const AUTH_SESSION_COOKIE = "sa_session";

/** HttpOnly cookie holding base64(email:password) for server-side API calls (Basic auth). */
export const AUTH_BASIC_COOKIE = "sa_basic";

export const AUTH_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;
