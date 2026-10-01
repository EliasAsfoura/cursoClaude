import { AuthForm } from "@/components/auth/AuthForm";
import { safeNext } from "@/lib/auth-utils";

const ERRORS: Record<string, string> = {
  oauth: "No se pudo iniciar sesión con el proveedor",
  link: "El enlace expiró o ya se usó. Solicita uno nuevo.",
};

export default async function AuthPage({ searchParams }: PageProps<"/auth">) {
  const { next, error } = await searchParams;
  const initialError = typeof error === "string" ? ERRORS[error] : undefined;
  return <AuthForm next={safeNext(next)} initialError={initialError} />;
}
