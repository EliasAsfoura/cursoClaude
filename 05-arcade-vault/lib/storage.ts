import { DEFAULT_SKIN, isSkin, type Skin } from "./skins";

type Listener = () => void;

// ── Skin por juego ────────────────────────────────────────────────────────────
const skinKey = (gameId: string) => `av_skin_${gameId}`;
const skinListeners = new Set<Listener>();

export function getSkin(gameId: string): Skin {
  try {
    const raw = localStorage.getItem(skinKey(gameId));
    return isSkin(raw) ? raw : DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}

export function getSkinServerSnapshot(): Skin {
  return DEFAULT_SKIN;
}

export function subscribeSkin(listener: Listener): () => void {
  skinListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    skinListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function setSkin(gameId: string, skin: Skin): void {
  try {
    localStorage.setItem(skinKey(gameId), skin);
  } catch {}
  skinListeners.forEach((listener) => listener());
}
