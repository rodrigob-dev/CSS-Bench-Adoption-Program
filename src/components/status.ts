import type { BenchStatus } from "@/lib/types";

/** Brief: grey if taken, blue if open. Partial = one of two sides still open. */
export const STATUS_LABEL: Record<BenchStatus, string> = {
  open: "Open",
  partial: "One side open",
  full: "Adopted",
};

export const STATUS_CARD: Record<BenchStatus, string> = {
  open: "bg-blue-50 text-ink ring-1 ring-blue-300 hover:bg-blue-100",
  partial: "bg-white text-ink ring-1 ring-blue-300 hover:bg-blue-50",
  full: "bg-gray-100 text-gray-500 ring-1 ring-gray-200 hover:bg-gray-200",
};

/** Marker styles for bench pins on the map. */
export const PIN = {
  open: { color: "#1d4ed8", fillColor: "#3b82f6" },
  partial: { color: "#1d4ed8", fillColor: "#ffffff" },
  full: { color: "#6b7280", fillColor: "#9ca3af" },
} as const;

export const SIDE_LABEL: Record<"open" | "adopted" | "held" | "pending", string> = {
  open: "Open",
  adopted: "Adopted",
  held: "Being adopted now",
  pending: "Not available",
};
