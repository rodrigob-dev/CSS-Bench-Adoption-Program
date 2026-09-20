"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

// MapLibre touches `window` at import time, so the map is client-only.
const ParkMap = dynamic(() => import("./ParkMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-[#eef0e9] text-sm text-emerald-900/60">Loading map…</div>,
});

export function MapLoader(props: ComponentProps<typeof ParkMap>) {
  return <ParkMap {...props} />;
}
