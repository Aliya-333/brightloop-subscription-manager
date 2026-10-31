import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export type Role = "Admin" | "Staff" | "Viewer";
export type Profile = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "Active" | "Inactive";
};

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  canWrite: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string | undefined) => {
    if (!uid) return setProfile(null);
    const { data } = await supabase
      .from("profiles").select("id,name,email,role,status").eq("id", uid).maybeSingle();
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // defer: never await supabase calls inside this callback (deadlock risk)
      setTimeout(() => void loadProfile(s?.user.id), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const active = profile?.status === "Active";
  const value: AuthState = {
    session,
    profile,
    loading,
    canWrite: active && (profile?.role === "Admin" || profile?.role === "Staff"),
    isAdmin: active && profile?.role === "Admin",
    signOut: async () => { await supabase.auth.signOut(); },
    refreshProfile: () => loadProfile(session?.user.id),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
