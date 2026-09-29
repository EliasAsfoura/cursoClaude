import { DEFAULT_SKIN, isSkin, type Skin } from "./skins";

export type User = {
  name: string;
};

const USER_KEY = "av_user";

type Listener = () => void;
const userListeners = new Set<Listener>();
let cachedRaw: string | null = null;
let cachedUser: User | null = null;

function notifyUserChanged() {
  userListeners.forEach((listener) => listener());
}

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedUser = raw ? JSON.parse(raw) : null;
    }
    return cachedUser;
  } catch {
    return null;
  }
}

export function getUserServerSnapshot(): User | null {
  return null;
}

export function subscribeUser(listener: Listener): () => void {
  userListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    userListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function setUser(user: User): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
  notifyUserChanged();
}

export function clearUser(): void {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {}
  notifyUserChanged();
}

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
