"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminCookie, isAdmin, setAdminCookie } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

export async function adminLogin(_prev: { error?: string } | null, formData: FormData) {
  const ok = await setAdminCookie(String(formData.get("key") ?? ""));
  if (!ok) return { error: "That key is not right." };
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  await clearAdminCookie();
  redirect("/admin");
}

/** Approve or reject a pending request. */
export async function reviewAdoption(id: string, action: "approve" | "reject"): Promise<void> {
  if (!(await isAdmin())) return;
  const { error } = await supabase.rpc("review_adoption", { p_id: id, p_action: action });
  if (error) console.error("review_adoption failed", error);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

/** Record that a new bench has been built on a pre-approved spot. */
export async function markInstalled(benchId: string, installed: boolean): Promise<void> {
  if (!(await isAdmin())) return;
  const { error } = await supabase.rpc("set_installed", { p_bench_id: benchId, p_installed: installed });
  if (error) console.error("set_installed failed", error);
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}
