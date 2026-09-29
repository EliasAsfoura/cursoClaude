export type Skin = "clasico" | "neon" | "retro";

export const DEFAULT_SKIN: Skin = "clasico";

export const SKINS: { id: Skin; label: string }[] = [
  { id: "clasico", label: "CLÁSICO" },
  { id: "neon", label: "NEÓN" },
  { id: "retro", label: "RETRO" },
];

export function isSkin(value: unknown): value is Skin {
  return SKINS.some((s) => s.id === value);
}
