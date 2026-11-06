import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { isDemoMode } from "@/lib/backend";

export interface AppSession {
  user: { email?: string };
}

interface AuthState {
  session: AppSession | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, loading: true });

/* ------------------------------------------------------------------ */
/* Demo auth: any email/password signs in; session kept in localStorage */
/* ------------------------------------------------------------------ */

const DEMO_KEY = "tutorflow-demo-session";
const demoListeners = new Set<(s: AppSession | null) => void>();

function readDemoSession(): AppSession | null {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? (JSON.parse(raw) as AppSession) : null;
  } catch {
    return null;
  }
}

function setDemoSession(s: AppSession | null) {
  try {
    if (s) localStorage.setItem(DEMO_KEY, JSON.stringify(s));
    else localStorage.removeItem(DEMO_KEY);
  } catch {
    /* ignore */
  }
  demoListeners.forEach((fn) => fn(s));
}

/* ------------------------------------------------------------------ */
/* Auth actions used by the UI (Supabase or demo)                       */
/* ------------------------------------------------------------------ */

export const auth = {
  async signIn(email: string, password: string): Promise<{ error: unknown }> {
    if (isDemoMode) {
      setDemoSession({ user: { email } });
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  },
  async signOut() {
    if (isDemoMode) return setDemoSession(null);
    await supabase.auth.signOut();
  },
  async updatePassword(password: string): Promise<{ error: unknown }> {
    if (isDemoMode) return { error: null };
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    isDemoMode ? { session: readDemoSession(), loading: false } : { session: null, loading: true },
  );

  useEffect(() => {
    if (isDemoMode) {
      const fn = (session: AppSession | null) => setState({ session, loading: false });
      demoListeners.add(fn);
      return () => void demoListeners.delete(fn);
    }
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, loading: false }));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setState({ session, loading: false }));
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
