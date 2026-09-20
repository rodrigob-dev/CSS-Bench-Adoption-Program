"use client";

import { useTransition } from "react";
import { markInstalled, reviewAdoption } from "./actions";
import { formatDate, formatUsd } from "@/lib/format";
import type { QueueItem } from "@/lib/types";

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function QueueRow({ item, areaName }: { item: QueueItem; areaName: string }) {
  const [pending, start] = useTransition();
  const plaque = item.side === "A" ? "left" : "right";
  return (
    <li className={`grid gap-3 rounded-xl bg-white p-4 shadow-[0_8px_24px_-16px_rgba(30,30,30,0.35)] md:grid-cols-[1fr_auto] ${pending ? "opacity-60" : ""}`}>
      <div className="min-w-0 space-y-1 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono font-semibold">{item.bench_id}</span>
          <span className="text-ink/70">{areaName}, {plaque} plaque</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${item.status === "pending" ? "bg-amber-100 text-amber-900" : item.status === "held" ? "bg-sand text-ink/60" : "bg-lime-soft/60 text-forest-deep"}`}>
            {item.status === "held" ? "form open" : item.status}
          </span>
          {item.kind === "install_and_adopt" && <span className="text-xs text-ink/60">new bench</span>}
        </div>
        {item.status === "held" ? (
          <p className="text-ink/60">Someone has the form open. Frees at {item.held_until ? when(item.held_until) : "—"}.</p>
        ) : (
          <>
            <p>
              <span className="font-semibold">{item.donor_name}</span> · {item.donor_email}
              {item.honoree_name && <> · for {item.honoree_name}</>} · {item.amount_usd ? formatUsd(item.amount_usd) : ""}
            </p>
            <pre className="whitespace-pre-wrap rounded bg-sand px-3 py-2 font-serif text-sm">{item.plaque_text}</pre>
            {item.notes && <p className="text-ink/70">Note from donor: {item.notes}</p>}
            <p className="text-xs text-ink/50">
              Submitted {when(item.submitted_at)}
              {item.status === "active" && <> · approved {item.reviewed_at ? when(item.reviewed_at) : ""} · term to {formatDate(new Date(new Date(item.adopted_at).setFullYear(new Date(item.adopted_at).getFullYear() + 10)).toISOString())}</>}
            </p>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-start gap-2 md:flex-col">
        {item.status === "pending" && (
          <>
            <button type="button" disabled={pending} onClick={() => start(() => reviewAdoption(item.id, "approve"))} className="btn-pop rounded-full bg-lime px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-ink">
              Approve
            </button>
            <button type="button" disabled={pending} onClick={() => start(() => reviewAdoption(item.id, "reject"))} className="rounded-full border border-black/15 px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-ink/70 hover:bg-sand">
              Reject
            </button>
          </>
        )}
        {item.status === "active" && item.kind === "install_and_adopt" && !item.installed && (
          <button type="button" disabled={pending} onClick={() => start(() => markInstalled(item.bench_id, true))} className="rounded-full border border-forest px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-forest hover:bg-forest hover:text-white">
            Mark bench installed
          </button>
        )}
      </div>
    </li>
  );
}
