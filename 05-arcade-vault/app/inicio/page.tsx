import { getGame, getTopScores } from "@/lib/queries";
import { InicioClient } from "@/components/InicioClient";

export default async function Inicio() {
  const game = await getGame("rocas");
  const topScores = game ? await getTopScores(game.id, 7) : [];

  return game ? <InicioClient game={game} topScores={topScores} /> : null;
}
