import { createClient } from "@/lib/supabase/server";
import type { Game, ScoreRow } from "@/lib/data";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("games").select("*");
  return data ?? [];
}

export async function getGame(id: string): Promise<Game | undefined> {
  const supabase = await createClient();
  const { data } = await supabase.from("games").select("*").eq("id", id).maybeSingle();
  return data ?? undefined;
}

export async function getTopScores(gameId: string, limit = 12): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}

export async function getAllTopScores(limit = 12): Promise<Record<string, ScoreRow[]>> {
  const games = await getGames();
  const entries = await Promise.all(
    games.map(async (game) => [game.id, await getTopScores(game.id, limit)] as const)
  );
  return Object.fromEntries(entries);
}
