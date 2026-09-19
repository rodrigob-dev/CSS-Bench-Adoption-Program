export const formatUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

/** Years left until `iso`, rounded, floored at 0. */
export const yearsLeft = (iso: string) =>
  Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / (365.25 * 24 * 3600 * 1000)));
