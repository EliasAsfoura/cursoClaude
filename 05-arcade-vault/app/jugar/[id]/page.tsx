import { notFound } from "next/navigation";
import { getGame } from "@/lib/queries";
import { GamePlayerClient } from "@/components/player/GamePlayerClient";

export default async function GamePlayerPage({ params }: PageProps<"/jugar/[id]">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  return <GamePlayerClient game={game} />;
}
