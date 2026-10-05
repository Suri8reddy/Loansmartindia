import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "customer" | "dsa" | "rm" | "loan_executive" | "team_leader";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  rolesLoading: boolean;
  isAdmin: boolean;
  isTeam: boolean;
  isCustomer: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);

  const loadRoles = async (uid: string | undefined) => {
    if (!uid) { setRoles([]); setRolesLoading(false); return; }
    setRolesLoading(true);
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r) => r.role as AppRole));
    setRolesLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) setRolesLoading(true); else setRolesLoading(false);
      setTimeout(() => { loadRoles(s?.user?.id); }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      loadRoles(data.session?.user?.id).finally(() => setLoading(false));
    });
    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    user, session, roles, loading, rolesLoading,
    isAdmin: roles.includes("admin"),
    isTeam: roles.some((r) => ["admin", "dsa", "rm", "loan_executive", "team_leader"].includes(r)),
    isCustomer: roles.includes("customer"),
    signOut: async () => { await supabase.auth.signOut(); },
    refreshRoles: () => loadRoles(user?.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
