// Solo rutas internas: empiezan con "/" y no con "//" ni "/\".
export function safeNext(next: string | string[] | null | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  return value;
}

// Username para mostrar/guardar: user_metadata.username; fallback email antes de "@" en mayúsculas.
export function resolveUsername(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
  const meta = user.user_metadata?.username;
  if (typeof meta === "string" && meta.trim()) return meta.trim();
  return (user.email?.split("@")[0] ?? "JUGADOR").toUpperCase();
}

// Username de un usuario OAuth: user_name (GitHub) / name (Google), 16 chars en mayúsculas.
export function providerUsername(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
  const meta = user.user_metadata ?? {};
  const claims = (meta.custom_claims ?? {}) as Record<string, unknown>;
  const candidates = [
    meta.user_name,
    meta.preferred_username,
    meta.name,
    meta.full_name,
    claims.global_name,
    user.email?.split("@")[0],
  ];
  const raw = candidates.find((c): c is string => typeof c === "string" && c.trim() !== "");
  return (raw ?? "JUGADOR").trim().slice(0, 16).toUpperCase();
}

type AuthErrorLike = { code?: string; message?: string; status?: number } | null | undefined;

export function translateAuthError(error: AuthErrorLike): string {
  if (!error) return "";
  switch (error.code) {
    case "invalid_credentials":
      return "Email o contraseña incorrectos";
    case "user_already_exists":
    case "email_exists":
      return "Ese email ya está registrado";
    case "weak_password":
      return "La contraseña debe tener al menos 6 caracteres";
    case "email_address_invalid":
    case "validation_failed":
      return "Email inválido";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Demasiados intentos. Espera un momento e inténtalo de nuevo";
    case "same_password":
      return "La nueva contraseña debe ser distinta a la actual";
  }
  const msg = (error.message ?? "").toLowerCase();
  if (msg.includes("invalid login credentials")) return "Email o contraseña incorrectos";
  if (msg.includes("already registered")) return "Ese email ya está registrado";
  if (msg.includes("at least 6")) return "La contraseña debe tener al menos 6 caracteres";
  if (msg.includes("fetch") || msg.includes("network") || error.status === 0) {
    return "Error de red. Revisa tu conexión";
  }
  return "Algo salió mal. Inténtalo de nuevo";
}
