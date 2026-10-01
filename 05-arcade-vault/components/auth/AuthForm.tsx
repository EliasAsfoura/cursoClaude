"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext, translateAuthError } from "@/lib/auth-utils";

type Tab = "login" | "register";

export function AuthForm({ next, initialError }: { next: string; initialError?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [info, setInfo] = useState("");

  const target = safeNext(next);

  const switchTab = (t: Tab) => {
    setTab(t);
    setError("");
    setInfo("");
  };

  const handleOAuth = async (provider: "google" | "github") => {
    if (loading) return;
    setLoading(true);
    setError("");
    setInfo("");
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`,
      },
    });
    // Si no hay error el navegador ya está redirigiendo al proveedor.
    if (error) {
      setError(translateAuthError(error));
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setInfo("");

    const supabase = createClient();

    try {
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(translateAuthError(error));
          return;
        }
      } else {
        const name = username.trim();
        if (!name) {
          setError("Escribe un nombre de usuario");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: name } },
        });
        if (error) {
          setError(translateAuthError(error));
          return;
        }
        // Email ya registrado: Supabase devuelve un usuario sin identidades.
        if (data.user && data.user.identities?.length === 0) {
          setError("Ese email ya está registrado");
          return;
        }
        if (!data.session) {
          setInfo("Cuenta creada. Revisa tu correo para confirmarla.");
          return;
        }
      }

      router.push(target);
      router.refresh();
    } catch (err) {
      setError(translateAuthError(err as Error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2>{tab === "login" ? "INICIAR SESIÓN" : "CREAR CUENTA"}</h2>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={tab === "login" ? "on" : ""}
            onClick={() => switchTab("login")}
          >
            INICIAR SESIÓN
          </button>
          <button
            type="button"
            className={tab === "register" ? "on" : ""}
            onClick={() => switchTab("register")}
          >
            REGISTRARSE
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {tab === "register" && (
            <div className="field">
              <label htmlFor="auth-username">Nombre de usuario</label>
              <input
                id="auth-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="PX_KAI"
                autoComplete="username"
                required
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="auth-email">Correo</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="auth-password">Contraseña</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              minLength={tab === "register" ? 6 : undefined}
              required
            />
          </div>

          {error && (
            <div className="auth-msg error" role="alert">
              {error}
            </div>
          )}
          {info && (
            <div className="auth-msg info" role="status">
              {info}
            </div>
          )}

          {tab === "login" && (
            <div style={{ textAlign: "right", marginBottom: 4 }}>
              <Link
                href="/auth/recuperar"
                style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          )}

          <button
            type="submit"
            className="btn lg"
            style={{ width: "100%", marginTop: 8 }}
            disabled={loading}
          >
            {loading ? "CARGANDO…" : tab === "login" ? "ENTRAR" : "CREAR CUENTA"}
          </button>
        </form>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button
            className="btn ghost"
            type="button"
            disabled={loading}
            onClick={() => handleOAuth("google")}
          >
            GOOGLE
          </button>
          <button
            className="btn ghost"
            type="button"
            disabled={loading}
            onClick={() => handleOAuth("github")}
          >
            GITHUB
          </button>
        </div>
      </div>
    </div>
  );
}
