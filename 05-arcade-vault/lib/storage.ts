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
