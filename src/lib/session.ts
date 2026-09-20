import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

// A random per-browser secret that identifies "me" for plaque holds. There are
// no accounts, so this is the whole identity: whoever holds the token holds
// the reservation. It is httpOnly and never rendered.
const COOKIE = "hold_token";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getHoldToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

/** Only callable from a server action / route handler (cookies are writable there). */
export async function ensureHoldToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing) return existing;
  const token = randomUUID();
  jar.set(COOKIE, token, { path: "/", maxAge: ONE_YEAR, sameSite: "lax", httpOnly: true });
  return token;
}
