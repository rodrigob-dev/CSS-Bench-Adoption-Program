"use client";

import { useActionState, useState } from "react";
import { adoptBench, type AdoptState } from "@/app/actions";
import { formatUsd } from "@/lib/format";
import { MAX_PLAQUE_CHARS, MAX_PLAQUE_LINES, type Side } from "@/lib/types";

type Props = {
  benchId: string;
  side: Side;
  price: number;
  balance: number;
  install: boolean;
  /** Lets a parent (the plaque preview) mirror the text as it is typed. */
  onPlaqueChange?: (text: string) => void;
};

const field = "mt-1 w-full rounded-md border border-emerald-900/20 bg-white px-3 py-2 text-sm";

/** The fields of VCPA's adoption form, minus payment and the "drop a pin" step (the map is the pin). */
export function AdoptForm({ benchId, side, price, balance, install, onPlaqueChange }: Props) {
  const [state, action, pending] = useActionState<AdoptState, FormData>(adoptBench, null);
  const [plaque, setPlaque] = useState("");
  const lines = plaque === "" ? 0 : plaque.split("\n").length;
  const tooLong = lines > MAX_PLAQUE_LINES || plaque.length > MAX_PLAQUE_CHARS;
  const canAfford = balance >= price;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="bench_id" value={benchId} />
      <input type="hidden" name="side" value={side} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">First and last name *</span>
          <input name="donor_name" required maxLength={80} autoComplete="name" className={field} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Email address *</span>
          <input name="donor_email" type="email" required autoComplete="email" className={field} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium">Is your bench in honor or in memory of someone?</span>
        <input name="honoree_name" maxLength={120} placeholder="Their name (optional)" className={field} />
      </label>

      <label className="block text-sm">
        <span className="font-medium">Plaque text *</span>
        <textarea
          name="plaque_text"
          required
          rows={4}
          value={plaque}
          onChange={(e) => {
            setPlaque(e.target.value);
            onPlaqueChange?.(e.target.value);
          }}
          className={`${field} font-mono`}
          placeholder={"In loving memory of…\nOne line per plaque line"}
        />
        <span className={`mt-1 block text-xs ${tooLong ? "text-red-600" : "text-emerald-900/60"}`}>
          {plaque.length} / {MAX_PLAQUE_CHARS} characters · {lines} / {MAX_PLAQUE_LINES} lines
        </span>
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input name="timeline_ack" type="checkbox" required className="mt-1" />
        <span>
          I understand that creating and installing the plaque takes at least 6–8 weeks from submission
          {install && ", and that a new bench takes about 3 months and is subject to approval"}. *
        </span>
      </label>

      <label className="block text-sm">
        <span className="font-medium">Any additional questions?</span>
        <textarea name="notes" rows={2} maxLength={1000} className={field} />
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
