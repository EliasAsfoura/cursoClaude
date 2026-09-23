import { getGames } from "@/lib/queries";
import { HomeClient } from "@/components/HomeClient";

export default async function Home() {
  const games = await getGames();
  return <HomeClient games={games} />;
}
