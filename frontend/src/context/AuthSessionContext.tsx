"use client";

import { AUTH_SESSION_REFRESH_EVENT, type AuthSession } from "@/lib/auth-session";
import { fetchAuthSession } from "@/lib/auth-session-client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type AuthSessionContextValue = {
  session: AuthSession | null;
  sessionLoaded: boolean;
  refreshSession: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(
  undefined,
);

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  const refreshSession = useCallback(async () => {
    const data = await fetchAuthSession();
    setSession(data);
    setSessionLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const data = await fetchAuthSession();
      if (cancelled) {
        return;
      }
      setSession(data);
      setSessionLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onRefresh = () => {
      void refreshSession();
    };
    window.addEventListener(AUTH_SESSION_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(AUTH_SESSION_REFRESH_EVENT, onRefresh);
  }, [refreshSession]);

  return (
    <AuthSessionContext.Provider value={{ session, sessionLoaded, refreshSession }}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }
  return ctx;
}
