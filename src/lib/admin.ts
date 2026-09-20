import "server-only";
import { cookies } from "next/headers";

// Staff access. There are no accounts in this demo, so /admin is gated by a
// shared key from the environment; the key is kept in an httpOnly cookie.
const COOKIE = "admin_key";
export const ADMIN_KEY = process.env.ADMIN_KEY ?? "";

export async function isAdmin(): Promise<boolean> {
  if (!ADMIN_KEY) return false;
  return (await cookies()).get(COOKIE)?.value === ADMIN_KEY;
}

export async function setAdminCookie(key: string): Promise<boolean> {
  if (!ADMIN_KEY || key !== ADMIN_KEY) return false;
  (await cookies()).set(COOKIE, key, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  return true;
}

export async function clearAdminCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
