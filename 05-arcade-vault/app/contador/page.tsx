import type { Metadata } from "next";
import { ContadorClient } from "@/components/contador/ContadorClient";

export const metadata: Metadata = { title: "Contador Pokémon · Arcade Vault" };

export default function ContadorPage() {
  return <ContadorClient />;
}
