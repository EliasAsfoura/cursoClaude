"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { resolveUsername } from "@/lib/auth-utils";

export type AuthUser = {
  id: string;
  email: string | null;
  username: string;
};

const LEGACY_USER_KEY = "av_user";

function toAuthUser(user: User | null | undefined): AuthUser | null {
  if (!user) return null;
  return { id: user.id, email: user.email ?? null, username: resolveUsername(user) };
}

// null = sin sesión o todavía cargando.
export function useAuthUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_USER_KEY);
    } catch {}

    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toAuthUser(session?.user));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return user;
}
