import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresca el token si expiró y reescribe las cookies de sesión.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Con sesión, las pantallas de login/recuperar no tienen sentido.
  // (/auth/callback y /auth/nueva-contrasena quedan fuera: el enlace de recuperación inicia sesión.)
  const { pathname } = request.nextUrl;
  if (user && (pathname === "/auth" || pathname === "/auth/recuperar")) {
    const redirect = NextResponse.redirect(new URL("/", request.url));
    // Conserva las cookies de sesión refrescadas.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
