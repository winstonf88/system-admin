import type { AuthSession } from "@/lib/auth-session";

let inFlight: Promise<AuthSession | null> | null = null;

/** Single in-flight GET /api/auth/session; concurrent callers share the same promise. */
export async function fetchAuthSession(): Promise<AuthSession | null> {
  if (inFlight) {
    return inFlight;
  }
  inFlight = (async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      if (!res.ok) {
        return null;
      }
      return (await res.json()) as AuthSession;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Clears in-flight session request state (Vitest only; avoids cross-test leakage). */
export function resetAuthSessionClientForTests(): void {
  inFlight = null;
}
