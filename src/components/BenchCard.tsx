import Link from "next/link";
import type { Bench } from "@/lib/types";
import { STYLE_LABEL } from "@/lib/types";
import { STATUS_CARD, STATUS_LABEL } from "./status";

/** Small bench glyph, the same shape as the map pins. */
export function BenchGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 18" className={`h-3.5 w-5 ${className}`} fill="currentColor" aria-hidden>
      <rect x="2" y="1" width="24" height="3.5" rx="1" />
      <rect x="5" y="5" width="2" height="4" /><rect x="10" y="5" width="2" height="4" /><rect x="15" y="5" width="2" height="4" /><rect x="20" y="5" width="2" height="4" />
      <rect x="2" y="9.5" width="24" height="4" rx="1" />
      <rect x="4" y="13.5" width="3" height="4.5" /><rect x="21" y="13.5" width="3" height="4.5" />
    </svg>
  );
}

type Props = {
  bench: Bench;
  /** When given, the card is a button (the caller animates, then navigates) instead of a link. */
  onSelect?: (id: string) => void;
};

export function BenchCard({ bench, onSelect }: Props) {
  const className = `block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${STATUS_CARD[bench.status]}`;
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono font-semibold">
          <BenchGlyph className={bench.status === "full" ? "text-gray-400" : "text-blue-700"} />
          {bench.id}
        </span>
        <span className="text-xs">{STATUS_LABEL[bench.status]}</span>
      </div>
      <div className="mt-0.5 text-xs opacity-70">
        {bench.installed ? `${bench.size_ft} ft ${STYLE_LABEL[bench.style]}` : "Spot for a new bench"}
      </div>
      <div className="mt-1.5 flex gap-1">
        {bench.sides.map((s) => (
          <span
            key={s.side}
            className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${
              s.side_status === "open" ? "bg-blue-600 text-white" : s.side_status === "held" ? "bg-amber-400 text-amber-950" : "bg-gray-300 text-gray-700"
            }`}
            title={s.side_status === "open" ? "Open" : s.side_status === "held" ? "Being adopted right now" : s.side_status === "pending" ? "Not available" : `Adopted by ${s.donor_name}`}
          >
            {s.side}
          </span>
        ))}
      </div>
    </>
  );
  return onSelect ? (
    <button type="button" onClick={() => onSelect(bench.id)} className={className}>{body}</button>
  ) : (
    <Link href={`/benches/${bench.id}`} className={className}>{body}</Link>
  );
}
