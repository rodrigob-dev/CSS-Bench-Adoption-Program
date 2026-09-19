"use client";

import dynamic from "next/dynamic";
import type { AreaSummary } from "@/lib/types";

// Leaflet touches `window` at import time, so the map is client-only.
const ParkMap = dynamic(() => import("./ParkMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-lg bg-emerald-50 text-sm text-emerald-900/60">
      Loading map…
    </div>
  ),
});

export function MapLoader({ areas }: { areas: AreaSummary[] }) {
  return <ParkMap areas={areas} />;
}
