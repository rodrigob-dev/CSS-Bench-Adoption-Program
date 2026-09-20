"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ensureHoldToken, getHoldToken } from "@/lib/session";
import { getBalance, setBalance } from "@/lib/wallet";
import { formatUsd } from "@/lib/format";
import { MAX_PLAQUE_CHARS, MAX_PLAQUE_LINES, priceFor } from "@/lib/types";

const TOP_UP_USD = 10_000;

export async function addFunds(): Promise<void> {
  await setBalance((await getBalance()) + TOP_UP_USD);
  revalidatePath("/", "layout");
}

export type HoldResult = { until: string } | { error: string };

/**
 * Reserve a plaque for 10 minutes while the form is filled in. Called the
 * moment the plaque is clicked. Two people cannot hold the same side: the
 * partial unique index rejects the second hold with 23505.
 */
export async function holdPlaque(benchId: string, side: string): Promise<HoldResult> {
  if (side !== "A" && side !== "B") return { error: "Pick a side." };
  const token = await ensureHoldToken();
  const { data, error } = await supabase.rpc("hold_plaque", { p_bench_id: benchId, p_side: side, p_token: token });
  if (error) {
    switch (error.code) {
      case "23505":
        return { error: "Someone is adopting this plaque right now. It frees up in 10 minutes if they don't finish — or pick another." };
      case "P0001":
        return { error: "That plaque is not available on this bench." };
      default:
        console.error("hold_plaque failed", error);
        return { error: "Could not reserve the plaque. Please try again." };
    }
  }
  revalidatePath(`/benches/${encodeURIComponent(benchId)}`);
  return { until: data as string };
}

/** Free a hold early (the person cancelled). */
export async function releaseHold(benchId: string, side: string): Promise<void> {
  const token = await getHoldToken();
  if (!token) return;
  await supabase.rpc("release_hold", { p_bench_id: benchId, p_side: side, p_token: token });
  revalidatePath(`/benches/${encodeURIComponent(benchId)}`);
}

export type AdoptState = { error: string } | null;

export async function adoptBench(_prev: AdoptState, formData: FormData): Promise<AdoptState> {
  const benchId = String(formData.get("bench_id") ?? "");
  const side = String(formData.get("side") ?? "");
  const donorName = String(formData.get("donor_name") ?? "").trim();
  const donorEmail = String(formData.get("donor_email") ?? "").trim();
  const honoreeName = String(formData.get("honoree_name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const timelineAck = formData.get("timeline_ack") === "on";
  const plaqueText = String(formData.get("plaque_text") ?? "")
    .replace(/\r\n/g, "\n")
    .trim();

  // Friendly validation first; the database enforces the same rules with
  // check constraints, so a bypassed form still cannot write bad rows.
  if (side !== "A" && side !== "B") return { error: "Pick a side." };
  if (!donorName || donorName.length > 80) {
    return { error: "Donor name is required (max 80 characters)." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(donorEmail)) return { error: "A valid email address is required." };
  if (honoreeName.length > 120) return { error: "Honoree name is too long (max 120 characters)." };
  if (notes.length > 1000) return { error: "Additional questions are too long (max 1000 characters)." };
  if (!timelineAck) return { error: "Please confirm you understand the 6–8 week timeline." };
  if (!plaqueText) return { error: "Plaque text is required." };
  if (plaqueText.split("\n").length > MAX_PLAQUE_LINES) {
    return { error: `Plaque text can have at most ${MAX_PLAQUE_LINES} lines.` };
  }
  if (plaqueText.length > MAX_PLAQUE_CHARS) {
    return { error: `Plaque text can have at most ${MAX_PLAQUE_CHARS} characters.` };
  }

  const { data: bench } = await supabase
    .from("benches")
    .select("installed")
    .eq("id", benchId)
    .maybeSingle();
  if (!bench) return { error: "Bench not found." };

  const price = priceFor(bench);
  const balance = await getBalance();
  if (balance < price) {
    return { error: `This adoption is ${formatUsd(price)}; your wallet has ${formatUsd(balance)}. Add funds first.` };
  }

  // Single write path. A concurrent adoption of the same side is rejected by
  // the partial unique index inside this call (SQLSTATE 23505).
  // Converts this browser's hold into the adoption; without a hold it inserts
  // directly and the partial unique index still guarantees at most one.
  const { error } = await supabase.rpc("adopt_bench", {
    p_bench_id: benchId,
    p_side: side,
    p_donor_name: donorName,
    p_donor_email: donorEmail,
    p_plaque_text: plaqueText,
    p_honoree_name: honoreeName || null,
    p_notes: notes || null,
    p_timeline_ack: timelineAck,
    p_token: await getHoldToken(),
  });

  if (error) {
    switch (error.code) {
      case "23505":
        return { error: "Someone else is adopting this plaque right now. Pick another one." };
      case "P0001":
        return { error: "That side is not available on this bench." };
      case "P0002":
        return { error: "Bench not found." };
      default:
        console.error("adopt_bench failed", error);
        return { error: "Could not save the adoption. Please try again." };
    }
  }

  await setBalance(balance - price);
  revalidatePath("/", "layout");
  redirect(`/benches/${encodeURIComponent(benchId)}?adopted=${side}`);
}
