/** Shape of `GET /api/auth/session` (proxied from the FastAPI backend). */
export type AuthSession = {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  tenant_name: string;
};

/** Dispatched on `window` after tenant/org settings change so shell UI can refetch `GET /api/auth/session`. */
export const AUTH_SESSION_REFRESH_EVENT = "sa:auth-session-refresh";

/** HttpOnly cookie set after successful login (validated against the API). */
export const AUTH_SESSION_COOKIE = "sa_session";

/** HttpOnly cookie holding base64(email:password) for server-side API calls (Basic auth). */
export const AUTH_BASIC_COOKIE = "sa_basic";

export const AUTH_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;
