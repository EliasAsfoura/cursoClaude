"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveScoreAction(gameId: string, name: string, score: number): Promise<void> {
  const supabase = await createClient();
  await supabase.from("scores").insert({ game_id: gameId, name, score });
}
