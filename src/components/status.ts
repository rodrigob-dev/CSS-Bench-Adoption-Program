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

export const STATUS_DOT: Record<BenchStatus, string> = {
  open: "bg-blue-500",
  partial: "bg-blue-400 ring-2 ring-white outline outline-blue-400",
  full: "bg-gray-400",
};

/** Map marker colour from the share of open sides in an area. */
export function areaColor(open: number, total: number): string {
  if (total === 0) return "#9ca3af";
  const share = open / total;
  if (share >= 0.5) return "#2563eb";
  if (share > 0) return "#60a5fa";
  return "#9ca3af";
}
