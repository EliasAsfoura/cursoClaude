"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-utils";

export function NewPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setExpired(true);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(translateAuthError(error));
        return;
      }
      router.push("/");
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
          <h2>NUEVA CONTRASEÑA</h2>
        </div>

        {expired ? (
          <>
            <div className="auth-msg error" role="alert" style={{ marginTop: 18 }}>
              El enlace expiró o no es válido. Solicita uno nuevo.
            </div>
            <Link
              href="/auth/recuperar"
              className="btn lg"
              style={{ width: "100%", textAlign: "center" }}
            >
              SOLICITAR ENLACE
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
            <div className="field">
              <label htmlFor="new-password">Nueva contraseña</label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>

            {error && (
              <div className="auth-msg error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn lg"
              style={{ width: "100%", marginTop: 8 }}
              disabled={loading}
            >
              {loading ? "CARGANDO…" : "GUARDAR CONTRASEÑA"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
