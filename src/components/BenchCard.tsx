import Link from "next/link";
import type { Bench } from "@/lib/types";
import { STYLE_LABEL } from "@/lib/types";
import { STATUS_CARD, STATUS_LABEL } from "./status";

export function BenchCard({ bench }: { bench: Bench }) {
  return (
    <Link
      href={`/benches/${bench.id}`}
      className={`block rounded-lg border-2 px-3 py-2 text-sm transition ${STATUS_CARD[bench.status]}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono font-semibold">{bench.id}</span>
        <span className="text-xs">{STATUS_LABEL[bench.status]}</span>
      </div>
      <div className="mt-0.5 text-xs opacity-70">
        {bench.installed ? `${bench.size_ft} ft · ${STYLE_LABEL[bench.style]}` : "New bench · install & adopt"}
      </div>
      <div className="mt-1.5 flex gap-1">
        {bench.sides.map((s) => (
          <span
            key={s.side}
            className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${
              s.side_status === "open" ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-700"
            }`}
            title={s.side_status === "open" ? "Open" : `Adopted by ${s.donor_name}`}
          >
            {s.side}
          </span>
        ))}
      </div>
    </Link>
  );
}
