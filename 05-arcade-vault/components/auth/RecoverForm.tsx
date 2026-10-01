"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-utils";

export function RecoverForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/nueva-contrasena")}`,
      });
      if (error) {
        setError(translateAuthError(error));
        return;
      }
      setSent(true);
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
          <h2>RECUPERAR CONTRASEÑA</h2>
        </div>

        {sent ? (
          <div className="auth-msg info" role="status" style={{ marginTop: 18 }}>
            Revisa tu correo. Si el email existe, te enviamos un enlace para crear una nueva
            contraseña.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
            <div className="field">
              <label htmlFor="recover-email">Correo</label>
              <input
                id="recover-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
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
              {loading ? "CARGANDO…" : "ENVIAR ENLACE"}
            </button>
          </form>
        )}

        <div className="auth-divider">O</div>
        <Link href="/auth" className="btn ghost" style={{ width: "100%", textAlign: "center" }}>
          VOLVER A INICIAR SESIÓN
        </Link>
      </div>
    </div>
  );
}
