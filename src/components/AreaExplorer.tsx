"use client";

import Link from "next/link";
import { useState } from "react";
import type { AreaSummary, Bench } from "@/lib/types";
import { MapLoader } from "./MapLoader";
import { MapLegend } from "./MapLegend";

/** Park map + area list with shared hover state. */
export function AreaExplorer({ areas, benches }: { areas: AreaSummary[]; benches: Bench[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="relative aspect-[10/7] overflow-hidden rounded-xl border border-emerald-900/10 shadow-sm">
        <MapLoader benches={benches} areas={areas} hoveredArea={hovered} onHoverArea={setHovered} areasClickable />
        <MapLegend />
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-900/50">
          Pick an area
        </h2>
        <ul className="space-y-2">
          {areas.map((a) => {
            const active = hovered === a.id;
            return (
              <li key={a.id}>
                <Link
                  href={`/areas/${a.id}`}
                  onMouseEnter={() => setHovered(a.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`block rounded-lg border bg-white px-4 py-3 transition ${
                    active ? "border-blue-500 shadow-md" : "border-emerald-900/10 hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-medium text-emerald-950">{a.name}</span>
                    <span className="ml-auto text-sm text-emerald-900/60">{a.benches_total} benches</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    <Meter open={a.sides_open} total={a.sides_total} />
                    <span className="whitespace-nowrap text-emerald-900/70">
                      <span className="font-semibold text-blue-700">{a.sides_open}</span> / {a.sides_total} sides open
                    </span>
                  </div>
                  {a.slots_open > 0 && (
                    <div className="mt-1.5 text-xs font-medium text-emerald-800">
                      + {a.slots_open} pre-approved spots for a new bench
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Meter({ open, total }: { open: number; total: number }) {
  const pct = total ? Math.round((open / total) * 100) : 0;
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200" aria-hidden>
      <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
