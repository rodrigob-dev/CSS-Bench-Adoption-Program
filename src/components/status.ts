import type { BenchStatus } from "@/lib/types";

/** Brief: grey if taken, blue if open. Partial = one of two sides still open. */
export const STATUS_LABEL: Record<BenchStatus, string> = {
  open: "Open",
  partial: "One side open",
  full: "Adopted",
};

export const STATUS_CARD: Record<BenchStatus, string> = {
  open: "border-blue-500 bg-blue-50 hover:bg-blue-100",
  partial: "border-blue-400 border-dashed bg-white hover:bg-blue-50",
  full: "border-gray-300 bg-gray-100 text-gray-500 hover:bg-gray-200",
};

/** Marker styles for bench pins on the map. */
export const PIN = {
  open: { color: "#1d4ed8", fillColor: "#3b82f6" },
  partial: { color: "#1d4ed8", fillColor: "#ffffff" },
  full: { color: "#6b7280", fillColor: "#9ca3af" },
} as const;
