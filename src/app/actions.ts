"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getBalance, setBalance } from "@/lib/wallet";
import { formatUsd } from "@/lib/format";
import { MAX_PLAQUE_CHARS, MAX_PLAQUE_LINES, priceFor } from "@/lib/types";

const TOP_UP_USD = 10_000;

export async function addFunds(): Promise<void> {
  await setBalance((await getBalance()) + TOP_UP_USD);
  revalidatePath("/", "layout");
}

export type AdoptState = { error: string } | null;

export async function adoptBench(_prev: AdoptState, formData: FormData): Promise<AdoptState> {
  const benchId = String(formData.get("bench_id") ?? "");
  const side = String(formData.get("side") ?? "");
  const donorName = String(formData.get("donor_name") ?? "").trim();
  const plaqueText = String(formData.get("plaque_text") ?? "")
    .replace(/\r\n/g, "\n")
    .trim();

  // Friendly validation first; the database enforces the same rules with
  // check constraints, so a bypassed form still cannot write bad rows.
  if (side !== "A" && side !== "B") return { error: "Pick a side." };
  if (!donorName || donorName.length > 80) {
    return { error: "Donor name is required (max 80 characters)." };
  }
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
  const { error } = await supabase.rpc("adopt_bench", {
    p_bench_id: benchId,
    p_side: side,
    p_donor_name: donorName,
    p_plaque_text: plaqueText,
  });

  if (error) {
    switch (error.code) {
      case "23505":
        return { error: "Someone just adopted this side. Pick another one." };
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
