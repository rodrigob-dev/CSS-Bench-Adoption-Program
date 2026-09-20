"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AreaSummary, Bench } from "@/lib/types";
import { BenchCard } from "./BenchCard";
import { MapLegend } from "./MapLegend";
import { MapLoader } from "./MapLoader";

type Props = { areas: AreaSummary[]; benches: Bench[]; initialArea?: string | null };

/**
 * Map + side panel. Click an area → the camera flies in and its open benches
 * pulse; the panel lists that area's benches. Click a bench → its page.
 */
export function ParkExplorer({ areas, benches, initialArea = null }: Props) {
  const router = useRouter();
  const [focus, setFocus] = useState<string | null>(initialArea);
  const [hovered, setHovered] = useState<string | null>(null);
  const area = focus ? areas.find((a) => a.id === focus) ?? null : null;
  const inArea = focus ? benches.filter((b) => b.area_id === focus) : [];

  const selectArea = (id: string | null) => {
    setFocus(id);
    window.history.replaceState(null, "", id ? `/areas/${id}` : "/map");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-emerald-900/10 shadow-sm lg:aspect-auto lg:h-[680px]">
        <MapLoader
          benches={benches}
          areas={areas}
          focusArea={focus}
          hoveredArea={hovered}
          onHoverArea={setHovered}
          onSelectArea={selectArea}
          onSelectBench={(id) => router.push(`/benches/${id}`)}
          areasClickable
        />
        <MapLegend compact={Boolean(focus)} />
        {focus && (
          <button
            type="button"
            onClick={() => selectArea(null)}
            className="absolute left-3 top-3 z-10 rounded-full bg-white/95 px-3 py-1.5 text-sm font-medium text-emerald-950 shadow hover:bg-white"
          >
            ◀ Whole park
          </button>
        )}
      </div>

      <aside className="min-h-0">
        {!area ? (
          <>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-900/50">Pick an area</h2>
            <ul className="space-y-2">
              {areas.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => selectArea(a.id)}
                    onMouseEnter={() => setHovered(a.id)}
                    onMouseLeave={() => setHovered(null)}
                    className={`block w-full rounded-lg border bg-white px-4 py-3 text-left transition ${
                      hovered === a.id ? "border-blue-500 shadow-md" : "border-emerald-900/10 hover:border-blue-400"
                    }`}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-medium text-emerald-950">{a.name}</span>
                      <span className="ml-auto text-sm text-emerald-900/60">{a.benches_total} benches</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      <Meter open={a.sides_open} total={a.sides_total} />
                      <span className="whitespace-nowrap text-emerald-900/70">
                        <span className="font-semibold text-blue-700">{a.sides_open}</span> / {a.sides_total} plaques open
                      </span>
                    </div>
                    {a.slots_open > 0 && <div className="mt-1.5 text-xs font-medium text-emerald-800">+ {a.slots_open} spots for a new bench</div>}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <button type="button" onClick={() => selectArea(null)} className="text-xs text-emerald-900/60 hover:underline">← All areas</button>
              <h2 className="text-xl font-semibold text-emerald-950">{area.name}</h2>
              <p className="text-sm text-emerald-900/70">{area.description}</p>
              <p className="mt-1 text-sm text-emerald-900/70">
                {area.benches_total} benches · <span className="font-semibold text-blue-700">{area.sides_open}</span> of {area.sides_total} plaques open
                {area.slots_open > 0 && <> · {area.slots_open} spots for a new bench</>}
              </p>
            </div>
            <p className="text-xs text-emerald-900/50">Open benches are pulsing on the map. Click one, or pick from the list.</p>
            <div className="grid max-h-[520px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
              {inArea.filter((b) => !b.installed).map((b) => <BenchCard key={b.id} bench={b} />)}
              {inArea.filter((b) => b.installed).map((b) => <BenchCard key={b.id} bench={b} />)}
            </div>
            <Link href={`/areas/${area.id}`} className="block text-xs text-emerald-900/60 hover:underline">Open this area as a page →</Link>
          </div>
        )}
      </aside>
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
