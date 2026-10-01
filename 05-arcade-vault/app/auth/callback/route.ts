import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { providerUsername, safeNext } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  // Detrás de un proxy/CDN el origin real viene en x-forwarded-host.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base =
    process.env.NODE_ENV !== "development" && forwardedHost
      ? `https://${forwardedHost}`
      : origin;

  // Supabase devuelve error_code (p. ej. otp_expired) cuando el enlace ya se usó o venció.
  if (searchParams.get("error_code")) return NextResponse.redirect(`${base}/auth?error=link`);
  if (!code) return NextResponse.redirect(`${base}/auth?error=oauth`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    console.error("[auth/callback] exchangeCodeForSession:", error?.code, error?.message);
    return NextResponse.redirect(`${base}/auth?error=oauth`);
  }

  // Usuario OAuth sin username: se toma del proveedor.
  const meta = data.user.user_metadata ?? {};
  if (typeof meta.username !== "string" || !meta.username.trim()) {
    const username = providerUsername(data.user);
    await supabase.auth.updateUser({ data: { username } });
  }

  return NextResponse.redirect(`${base}${next}`);
}
