import { getGames, getAllTopScores } from "@/lib/queries";
import { HallOfFameClient } from "@/components/hall/HallOfFameClient";

export default async function HallOfFamePage() {
  const games = await getGames();
  const scoresByGame = await getAllTopScores(12);

  return <HallOfFameClient games={games} scoresByGame={scoresByGame} />;
}
