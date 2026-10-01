"use client";

import { useState } from "react";

const TOTAL_POKEMON = 1025;

function artworkUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

export function ContadorClient() {
  const [count, setCount] = useState(0);
  // Cicla 1..TOTAL_POKEMON a partir del primer clic
  const id = ((count - 1) % TOTAL_POKEMON) + 1;

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-8 px-6 py-12">
      <div className="flex h-72 w-72 items-center justify-center border-2 border-cyan/40 bg-bg-2 shadow-[0_0_32px_rgba(0,245,255,0.15)]">
        {count === 0 ? (
          <p className="px-6 text-center text-ink-dim">
            Haz clic para descubrir tu primer Pokémon
          </p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={id}
            src={artworkUrl(id)}
            alt={`Pokémon número ${id}`}
            width={256}
            height={256}
            className="h-64 w-64 object-contain"
          />
        )}
      </div>

      <p className="font-pixel text-5xl text-yellow tabular-nums">{count}</p>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setCount((c) => c + 1)}
          className="cursor-pointer border-2 border-cyan bg-transparent px-8 py-4 font-pixel text-xs text-cyan transition hover:bg-cyan hover:text-bg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-magenta"
        >
          Sumar 1
        </button>
        <button
          type="button"
          onClick={() => setCount(0)}
          disabled={count === 0}
          className="cursor-pointer border-2 border-ink-faint px-6 py-4 font-pixel text-xs text-ink-dim transition hover:border-magenta hover:text-magenta disabled:cursor-default disabled:opacity-40 disabled:hover:border-ink-faint disabled:hover:text-ink-dim"
        >
          Reiniciar
        </button>
      </div>
    </section>
  );
}
