import "server-only";
import { cookies } from "next/headers";

// Demo wallet: a per-browser balance in a cookie. Not a domain fact, so it
// does not live in the database (see DECISIONS.md #12).
const COOKIE = "wallet_usd";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getBalance(): Promise<number> {
  const raw = (await cookies()).get(COOKIE)?.value;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export async function setBalance(usd: number): Promise<void> {
  (await cookies()).set(COOKIE, String(Math.max(0, Math.floor(usd))), {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: true,
  });
}
