"use client";

import { useActionState, useState } from "react";
import { adoptBench, type AdoptState } from "@/app/actions";
import { formatUsd } from "@/lib/format";
import { MAX_PLAQUE_CHARS, MAX_PLAQUE_LINES, type Side } from "@/lib/types";

type Props = { benchId: string; side: Side; price: number; balance: number; install: boolean };

export function AdoptForm({ benchId, side, price, balance, install }: Props) {
  const [state, action, pending] = useActionState<AdoptState, FormData>(adoptBench, null);
  const [plaque, setPlaque] = useState("");
  const lines = plaque === "" ? 0 : plaque.split("\n").length;
  const tooLong = lines > MAX_PLAQUE_LINES || plaque.length > MAX_PLAQUE_CHARS;
  const canAfford = balance >= price;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="bench_id" value={benchId} />
      <input type="hidden" name="side" value={side} />

      <label className="block text-sm">
        <span className="font-medium">Donor name</span>
        <input
          name="donor_name"
          required
          maxLength={80}
          className="mt-1 w-full rounded-md border border-emerald-900/20 bg-white px-3 py-2"
          placeholder="Who is adopting this bench?"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium">Plaque text</span>
        <textarea
          name="plaque_text"
          required
          rows={4}
          value={plaque}
          onChange={(e) => setPlaque(e.target.value)}
          className="mt-1 w-full rounded-md border border-emerald-900/20 bg-white px-3 py-2 font-mono text-sm"
          placeholder={"In loving memory of…\nOne line per plaque line"}
        />
        <span className={`mt-1 block text-xs ${tooLong ? "text-red-600" : "text-emerald-900/60"}`}>
          {lines} / {MAX_PLAQUE_LINES} lines · {plaque.length} / {MAX_PLAQUE_CHARS} characters
        </span>
      </label>

      {state?.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || tooLong || !canAfford}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {pending ? "Adopting…" : `${install ? "Install & adopt" : "Adopt"} side ${side} · ${formatUsd(price)}`}
      </button>
      {!canAfford && (
        <p className="text-xs text-emerald-900/60">
          Your wallet has {formatUsd(balance)}. Use the “+ $10,000” button in the header (demo, no real payment).
        </p>
      )}
    </form>
  );
}
