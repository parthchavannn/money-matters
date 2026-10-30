import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthResult {
  error?: string;
  /** sign-up created the account but the user must confirm their email first */
  needsConfirmation?: boolean;
}

interface Auth {
  /** false → no backend configured; app runs local-only */
  enabled: boolean;
  loading: boolean;
  user: User | null;
  /** user arrived from a password-reset email and must choose a new password */
  recovering: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<AuthResult>;
  setNewPassword: (password: string) => Promise<AuthResult>;
  deleteAccount: () => Promise<AuthResult>;
}

const Ctx = createContext<Auth | undefined>(undefined);

const redirectTo = () => `${window.location.origin}${window.location.pathname}`;

/** Supabase errors are written for developers; show people something they can act on. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("already registered") || m.includes("already been registered")) return "An account with this email already exists. Try signing in.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("password") && m.includes("characters")) return "Password must be at least 8 characters.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Can't reach the server. Check your connection and try again.";
  return message;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(supabase !== null);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "SIGNED_OUT") setRecovering(false);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback<Auth["signIn"]>(async (email, password) => {
    if (!supabase) return { error: "Backend not configured." };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { error: friendly(error.message) } : {};
  }, []);

  const signUp = useCallback<Auth["signUp"]>(async (email, password) => {
    if (!supabase) return { error: "Backend not configured." };
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) return { error: friendly(error.message) };
    // With email confirmation on, a session isn't issued until the link is clicked.
    // (An obfuscated "already registered" response also has no session and an empty identities list.)
    if (!data.session) return { needsConfirmation: true };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const sendResetEmail = useCallback<Auth["sendResetEmail"]>(async (email) => {
    if (!supabase) return { error: "Backend not configured." };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectTo() });
    return error ? { error: friendly(error.message) } : {};
  }, []);

  const setNewPassword = useCallback<Auth["setNewPassword"]>(async (password) => {
    if (!supabase) return { error: "Backend not configured." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: friendly(error.message) };
    setRecovering(false);
    return {};
  }, []);

  const deleteAccount = useCallback<Auth["deleteAccount"]>(async () => {
    if (!supabase) return { error: "Backend not configured." };
    const { error } = await supabase.rpc("delete_my_account");
    if (error) return { error: friendly(error.message) };
    await supabase.auth.signOut({ scope: "local" });
    return {};
  }, []);

  const value = useMemo<Auth>(
    () => ({ enabled: supabase !== null, loading, user, recovering, signIn, signUp, signOut, sendResetEmail, setNewPassword, deleteAccount }),
    [loading, user, recovering, signIn, signUp, signOut, sendResetEmail, setNewPassword, deleteAccount]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
};
