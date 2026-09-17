export type User = {
  name: string;
};

export type SavedScore = {
  gameId: string;
  name: string;
  score: number;
  at: number;
};

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

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

export function getScores(): SavedScore[] {
  try {
    return JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveScore(entry: Omit<SavedScore, "at">): void {
  try {
    const all = getScores();
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {}
}
