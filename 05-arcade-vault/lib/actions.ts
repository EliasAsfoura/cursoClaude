"use server";

import { createClient } from "@/lib/supabase/server";
import { resolveUsername } from "@/lib/auth-utils";

export type SaveScoreResult = { ok: true } | { ok: false; error: "no-session" | "db" };

export async function saveScoreAction(gameId: string, score: number): Promise<SaveScoreResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "no-session" };

  if (typeof gameId !== "string" || !Number.isFinite(score) || score < 0) {
    return { ok: false, error: "db" };
  }

  // El nombre sale del servidor (metadata del usuario), nunca del cliente.
  const { error } = await supabase.from("scores").insert({
    game_id: gameId,
    name: resolveUsername(user),
    score: Math.floor(score),
    user_id: user.id,
  });
  return error ? { ok: false, error: "db" } : { ok: true };
}
