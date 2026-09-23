import Link from "next/link";
import { notFound } from "next/navigation";
import { getGame, getTopScores } from "@/lib/queries";

export default async function GameDetailPage({ params }: PageProps<"/juego/[id]">) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) notFound();

  const rows = await getTopScores(id, 12);

  return (
    <div className="av-detail fade-in">
      <div className="detail-cover">
        <div className={"cover-bg " + game.cover}></div>
      </div>

      <div className="detail-info">
        <div className="detail-tags">
          <span>{game.cat}</span>
          <span>{game.plays} PARTIDAS</span>
        </div>
        <h2>{game.title}</h2>
        <p>{game.long}</p>

        <div className="stat-strip">
          <div>
            <div className="l">Mejor puntuación</div>
            <div className="v">{game.best.toLocaleString("es-ES")}</div>
          </div>
          <div>
            <div className="l">Categoría</div>
            <div className="v">{game.cat}</div>
          </div>
          <div>
            <div className="l">Partidas jugadas</div>
            <div className="v">{game.plays}</div>
          </div>
        </div>

        <div className="detail-actions">
          <Link href={`/jugar/${game.id}`} className="btn xl pulse">
            JUGAR
          </Link>
          <Link href="/" className="btn ghost lg">
            Volver a la biblioteca
          </Link>
        </div>
      </div>

      <div className="leaderboard">
        <h3>Mejores puntuaciones</h3>
        {rows.map((r) => (
          <div
            key={r.name + r.rank}
            className={"lb-row" + (r.rank === 1 ? " top1" : r.rank === 2 ? " top2" : r.rank === 3 ? " top3" : "")}
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">{r.name}</div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
