"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const user = useAuthUser();

  const isActive = (name: "inicio" | "biblioteca" | "salon" | "about" | "auth") => {
    if (name === "inicio") return pathname === "/inicio";
    if (name === "biblioteca") {
      return pathname === "/" || pathname.startsWith("/juego") || pathname.startsWith("/jugar");
    }
    if (name === "salon") return pathname.startsWith("/salon");
    if (name === "about") return pathname.startsWith("/about");
    return pathname.startsWith("/auth");
  };

  const close = () => setOpen(false);

  const handleSignOut = async () => {
    await createClient().auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo">
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/inicio" className={isActive("inicio") ? "active" : ""}>
            Inicio
          </Link>
          <Link href="/" className={isActive("biblioteca") ? "active" : ""}>
            Biblioteca
          </Link>
          <Link href="/salon" className={isActive("salon") ? "active" : ""}>
            Salón de la Fama
          </Link>
          <Link href="/about" className={isActive("about") ? "active" : ""}>
            Acerca de
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <div className="nav-user">
            <span className="nav-user-name">{user.username}</span>
            <button type="button" className="nav-signout" onClick={handleSignOut}>
              cerrar sesión
            </button>
          </div>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button className="btn ghost hamburger" onClick={() => setOpen(true)} aria-label="Menú">
          ≡
        </button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close}></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <Link href="/inicio" className={isActive("inicio") ? "active" : ""} onClick={close}>
          Inicio
        </Link>
        <Link href="/" className={isActive("biblioteca") ? "active" : ""} onClick={close}>
          Biblioteca
        </Link>
        <Link href="/salon" className={isActive("salon") ? "active" : ""} onClick={close}>
          Salón de la Fama
        </Link>
        <Link href="/about" className={isActive("about") ? "active" : ""} onClick={close}>
          Acerca de
        </Link>
        {user ? (
          <a onClick={handleSignOut}>Cerrar sesión</a>
        ) : (
          <Link href="/auth" className={isActive("auth") ? "active" : ""} onClick={close}>
            Iniciar Sesión
          </Link>
        )}
        <div style={{ flex: 1 }}></div>
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
