import { ConfirmLink } from "@/components/auth/ConfirmLink";
import { safeNext } from "@/lib/auth-utils";

const TYPES = ["recovery", "signup", "email"] as const;

export default async function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  const { token_hash, type, next } = await searchParams;
  const hash = typeof token_hash === "string" ? token_hash : null;
  const otpType = TYPES.find((t) => t === type) ?? null;

  return <ConfirmLink tokenHash={hash} type={otpType} next={safeNext(next)} />;
}
