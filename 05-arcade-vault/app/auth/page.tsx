"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setUser } from "@/lib/storage";

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = username.trim() || "JUGADOR";
    setUser({ name });
    router.push("/");
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2>{tab === "login" ? "INICIAR SESIÓN" : "CREAR CUENTA"}</h2>
        </div>

        <div className="auth-tabs">
          <button className={tab === "login" ? "on" : ""} onClick={() => setTab("login")}>
            INICIAR SESIÓN
          </button>
          <button className={tab === "register" ? "on" : ""} onClick={() => setTab("register")}>
            REGISTRARSE
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Nombre de usuario</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="PX_KAI"
              required
            />
          </div>

          {tab === "register" && (
            <div className="field">
              <label>Correo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
              />
            </div>
          )}

          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn lg" style={{ width: "100%", marginTop: 8 }}>
            {tab === "login" ? "ENTRAR" : "CREAR CUENTA"}
          </button>
        </form>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button className="btn ghost" type="button" onClick={handleSubmit}>
            GOOGLE
          </button>
          <button className="btn ghost" type="button" onClick={handleSubmit}>
            DISCORD
          </button>
        </div>
      </div>
    </div>
  );
}
