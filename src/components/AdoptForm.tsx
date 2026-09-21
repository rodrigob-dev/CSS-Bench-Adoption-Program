"use client";

import { useActionState, useState } from "react";
import { adoptBench, type AdoptState } from "@/app/actions";
import { formatUsd } from "@/lib/format";
import { MAX_PLAQUE_CHARS, MAX_PLAQUE_LINES, type Side } from "@/lib/types";

type Props = {
  benchId: string;
  side: Side;
  price: number;
  install: boolean;
  /** Lets a parent (the plaque preview) mirror the text as it is typed. */
  onPlaqueChange?: (text: string) => void;
};

const field = "mt-1 w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm";

/** VCPA's form, trimmed to what a request needs. Payment is confirmed by staff after review. */
export function AdoptForm({ benchId, side, price, install, onPlaqueChange }: Props) {
  const [state, action, pending] = useActionState<AdoptState, FormData>(adoptBench, null);
  const [plaque, setPlaque] = useState("");
  const lines = plaque === "" ? 0 : plaque.split("\n").length;
  const tooLong = lines > MAX_PLAQUE_LINES || plaque.length > MAX_PLAQUE_CHARS;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="bench_id" value={benchId} />
      <input type="hidden" name="side" value={side} />

      <label className="block text-sm">
        <span className="font-medium">Plaque text</span>
        <textarea
          name="plaque_text"
          required
          autoFocus
          rows={4}
          value={plaque}
          onChange={(e) => {
            setPlaque(e.target.value);
            onPlaqueChange?.(e.target.value);
          }}
          className={`${field} font-mono`}
          placeholder={"In loving memory of…"}
        />
        <span className={`mt-1 block text-xs ${tooLong ? "text-red-600" : "text-ink/50"}`}>
          Up to {MAX_PLAQUE_LINES} lines and {MAX_PLAQUE_CHARS} characters · {plaque.length} used
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Your name</span>
          <input name="donor_name" required maxLength={80} autoComplete="name" className={field} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Email</span>
          <input name="donor_email" type="email" required autoComplete="email" className={field} />
        </label>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-ink/60">More options</summary>
        <div className="mt-2 space-y-3">
          <label className="block">
            <span className="font-medium">In honor or in memory of</span>
            <input name="honoree_name" maxLength={120} className={field} />
          </label>
          <label className="block">
            <span className="font-medium">Anything we should know?</span>
            <textarea name="notes" rows={2} maxLength={1000} className={field} />
          </label>
        </div>
      </details>

      <label className="flex items-start gap-2 text-sm">
        <input name="timeline_ack" type="checkbox" required className="mt-1" />
        <span>I understand the plaque takes 6–8 weeks{install && ", and a new bench about 3 months"}.</span>
      </label>

      {state?.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || tooLong}
        className="btn-pop w-full rounded-full bg-lime px-4 py-2.5 font-display text-base font-bold uppercase tracking-wide text-ink disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
      >
        {pending ? "Sending…" : `Request this plaque · ${formatUsd(price)}`}
      </button>
      <p className="text-xs text-ink/50">No payment now. Park staff confirm your gift when they review the request.</p>
    </form>
  );
}
