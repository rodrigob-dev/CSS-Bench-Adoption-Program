"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatDate, formatUsd, yearsLeft } from "@/lib/format";
import { PARK } from "@/lib/park";
import { STYLE_LABEL, priceFor, type AreaSummary, type Bench, type Side } from "@/lib/types";
import { BenchCard, BenchGlyph } from "./BenchCard";
import { MapLegend } from "./MapLegend";
import { MapLoader } from "./MapLoader";
import { SIDE_LABEL } from "./status";

type Props = { areas: AreaSummary[]; benches: Bench[]; initialArea?: string | null };

/**
 * The whole site fits in this screen: map on the left, one panel on the right.
 * See who adopted what: click a pin (or a bench in the list) — details show
 * here, no page change. Adopt: one more click opens the form with the plaque
 * already held. Search jumps straight to a bench id or an area.
 */
export function ParkExplorer({ areas, benches, initialArea = null }: Props) {
  const router = useRouter();
  const [focus, setFocus] = useState<string | null>(initialArea);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);

  const area = focus ? areas.find((a) => a.id === focus) ?? null : null;
  const bench = selected ? benches.find((b) => b.id === selected) ?? null : null;
  const areaName = useMemo(() => Object.fromEntries(PARK.areas.map((a) => [a.id, a.name])), []);

  const selectArea = (id: string | null) => {
    setFocus(id);
    setSelected(null);
    window.history.replaceState(null, "", id ? `/areas/${id}` : "/");
  };
  const selectBench = (id: string) => {
    const b = benches.find((x) => x.id === id);
    if (!b) return;
    if (focus !== b.area_id) setFocus(b.area_id);
    setSelected(id);
  };

  // search: a bench id jumps to the bench, an area name to the area
  const q = query.trim().toLowerCase();
  const matches = q
    ? benches.filter((b) => b.id.toLowerCase().includes(q)).slice(0, 6)
    : [];
  const areaMatches = q ? areas.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 3) : [];

  const listed = (focus ? benches.filter((b) => b.area_id === focus) : []).filter((b) => !onlyOpen || b.status !== "full");

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-black/10 shadow-sm lg:aspect-auto lg:h-[640px]">
        <MapLoader
          benches={benches}
          areas={areas}
          focusArea={focus}
          focusBench={selected ?? undefined}
          hoveredArea={hovered}
          onHoverArea={setHovered}
          onSelectArea={selectArea}
          onSelectBench={selectBench}
          areasClickable
        />
        <MapLegend compact={Boolean(focus)} />
        {focus && (
          <button type="button" onClick={() => selectArea(null)} className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-white/95 py-1.5 pl-2.5 pr-3.5 text-sm font-semibold text-forest-deep shadow hover:bg-white">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
            Back to whole park
          </button>
        )}
      </div>

      <aside className="flex min-h-0 flex-col gap-3">
        {/* search */}
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Bench id (RB-0042) or area"
            aria-label="Search benches and areas"
            className="w-full rounded-full border border-black/15 bg-white px-4 py-2 text-sm"
          />
          {q && (matches.length > 0 || areaMatches.length > 0) && (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
              {areaMatches.map((a) => (
                <li key={a.id}><button type="button" onClick={() => { selectArea(a.id); setQuery(""); }} className="block w-full px-4 py-2 text-left text-sm hover:bg-sand">{a.name} <span className="text-ink/50">· {a.sides_open} open</span></button></li>
              ))}
              {matches.map((b) => (
                <li key={b.id}><button type="button" onClick={() => { selectBench(b.id); setQuery(""); }} className="block w-full px-4 py-2 text-left font-mono text-sm hover:bg-sand">{b.id} <span className="font-sans text-ink/50">· {areaName[b.area_id]}</span></button></li>
              ))}
            </ul>
          )}
        </div>

        {bench ? (
          <BenchPanel bench={bench} areaName={areaName[bench.area_id]} onBack={() => setSelected(null)} onAdopt={(side) => router.push(`/benches/${bench.id}?adopt=${side}`)} />
        ) : !area ? (
          <>
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-forest">Pick an area</h2>
            <ul className="divide-y divide-black/10 border-y border-black/10">
              {areas.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => selectArea(a.id)}
                    onMouseEnter={() => setHovered(a.id)}
                    onMouseLeave={() => setHovered(null)}
                    className={`block w-full px-3 py-2.5 text-left transition-colors ${hovered === a.id ? "bg-blue-50" : "hover:bg-sand"}`}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-semibold text-ink">{a.name}</span>
                      <span className="ml-auto text-sm text-ink/70"><span className="font-semibold text-blue-700">{a.sides_open}</span> of {a.sides_total} open</span>
                    </div>
                    <div className="mt-1.5"><Meter open={a.sides_open} total={a.sides_total} /></div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="flex min-h-0 flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-forest">{area.name}</h2>
              <span className="text-sm text-ink/70"><span className="font-semibold text-blue-700">{area.sides_open}</span> of {area.sides_total} plaques open</span>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> Only benches with an open plaque
            </label>
            <div className="grid max-h-[480px] grid-cols-2 gap-3 overflow-y-auto p-1 pr-3 [scrollbar-gutter:stable] sm:grid-cols-3">
              {listed.filter((b) => !b.installed).map((b) => <BenchCard key={b.id} bench={b} onSelect={selectBench} />)}
              {listed.filter((b) => b.installed).map((b) => <BenchCard key={b.id} bench={b} onSelect={selectBench} />)}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

/** Everything about one bench, in place. */
function BenchPanel({ bench, areaName, onBack, onAdopt }: { bench: Bench; areaName: string; onBack: () => void; onAdopt: (side: Side) => void }) {
  const price = priceFor(bench);
  const single = bench.sides.length === 1;
  const name = (side: Side) => (single ? "Plaque" : side === "A" ? "Left plaque" : "Right plaque");
  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-lg">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-xs text-ink/60 hover:underline">
        <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
        Back to {areaName}
      </button>
      <div className="flex items-center gap-2">
        <BenchGlyph className="text-forest" />
        <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-forest">{bench.id}</h2>
      </div>
      <p className="text-sm text-ink/70">
        {bench.installed ? `${bench.size_ft} ft ${STYLE_LABEL[bench.style]} bench` : "Spot for a new bench"} in the {areaName}. {formatUsd(price)} a plaque, ten years.
      </p>
      <ul className="space-y-2">
        {bench.sides.map((s) => (
          <li key={s.side} className={`rounded-lg border p-3 text-sm ${s.side_status === "open" ? "border-blue-300 bg-blue-50/60" : "border-black/10 bg-sand"}`}>
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">{name(s.side)}</span>
              <span className={`text-xs font-semibold uppercase tracking-wide ${s.side_status === "open" ? "text-blue-700" : "text-ink/60"}`}>{SIDE_LABEL[s.side_status]}</span>
            </div>
            {s.side_status === "adopted" && (
              <p className="mt-1 text-ink/80">
                {s.donor_name}{s.honoree_name && <> · for {s.honoree_name}</>}
                <span className="block text-xs text-ink/50">
                  {s.adopted_at && formatDate(s.adopted_at)} – {s.expires_at && formatDate(s.expires_at)} · {s.expires_at ? yearsLeft(s.expires_at) : 0} years left
                </span>
              </p>
            )}
            {s.side_status === "open" && (
              <button type="button" onClick={() => onAdopt(s.side)} className="btn-pop mt-2 w-full rounded-full bg-lime px-3 py-2 font-display text-sm font-bold uppercase tracking-wide text-ink">
                {bench.installed ? "Adopt this plaque" : "Install a bench here"}
              </button>
            )}
          </li>
        ))}
      </ul>
      <Link href={`/benches/${bench.id}`} className="block text-xs text-ink/60 hover:underline">See the bench up close</Link>
    </div>
  );
}

function Meter({ open, total }: { open: number; total: number }) {
  const pct = total ? Math.round((open / total) * 100) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-gray-200" aria-hidden>
      <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
