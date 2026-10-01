"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-utils";

type OtpType = "recovery" | "signup" | "email";

// La verificación ocurre al pulsar el botón (no al cargar la página):
// así los escáneres de enlaces del correo no consumen el token de un solo uso.
export function ConfirmLink({
  tokenHash,
  type,
  next,
}: {
  tokenHash: string | null;
  type: OtpType | null;
  next: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const invalid = !tokenHash || !type;
  const isRecovery = type === "recovery";

  const handleConfirm = async () => {
    if (loading || !tokenHash || !type) return;
    setLoading(true);
    setError("");
    try {
      const { error } = await createClient().auth.verifyOtp({ type, token_hash: tokenHash });
      if (error) {
        setError(
          error.code === "otp_expired" || /expired|invalid/i.test(error.message)
            ? "El enlace expiró o ya se usó. Solicita uno nuevo."
            : translateAuthError(error),
        );
        return;
      }
      router.push(next);
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
          <h2>{isRecovery ? "RECUPERAR CONTRASEÑA" : "CONFIRMAR CUENTA"}</h2>
        </div>

        {invalid ? (
          <div className="auth-msg error" role="alert" style={{ marginTop: 18 }}>
            El enlace no es válido. Solicita uno nuevo.
          </div>
        ) : (
          <>
            <p className="mono" style={{ fontSize: 12, color: "var(--ink-dim)", margin: "18px 0" }}>
              {isRecovery
                ? "Pulsa continuar para elegir una nueva contraseña."
                : "Pulsa continuar para confirmar tu cuenta."}
            </p>
            {error && (
              <div className="auth-msg error" role="alert">
                {error}
              </div>
            )}
            <button
              type="button"
              className="btn lg"
              style={{ width: "100%" }}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "CARGANDO…" : "CONTINUAR"}
            </button>
          </>
        )}

        {(invalid || error) && isRecovery && (
          <Link
            href="/auth/recuperar"
            className="btn ghost"
            style={{ width: "100%", textAlign: "center", marginTop: 12 }}
          >
            SOLICITAR ENLACE NUEVO
          </Link>
        )}
      </div>
    </div>
  );
}
