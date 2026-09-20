export type Side = "A" | "B";
export type SideStatus = "open" | "adopted" | "held" | "pending";
export type BenchStyle = "worlds_fair" | "concrete";
export type AdoptionKind = "adopt" | "install_and_adopt";

/** One row of the `area_summary` view. */
export type AreaSummary = {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  benches_total: number;
  sides_total: number;
  sides_open: number;
  sides_pending: number;
  slots_open: number;
};

/** One row of the `bench_sides` view: a single adoptable side. */
export type BenchSide = {
  bench_id: string;
  area_id: string;
  style: BenchStyle;
  size_ft: 4 | 8;
  installed: boolean;
  pos_x: number;
  pos_y: number;
  side: Side;
  side_status: SideStatus;
  adoption_id: string | null;
  kind: AdoptionKind | null;
  donor_name: string | null;
  honoree_name: string | null;
  plaque_text: string | null;
  amount_usd: number | null;
  adopted_at: string | null;
  term_years: number | null;
  expires_at: string | null;
  /** While someone is filling in the form for this side (10-minute hold). */
  held_until: string | null;
  /** True when the hold belongs to this browser (computed server-side). */
  held_by_me?: boolean;
};

export type BenchStatus = "open" | "partial" | "full";

/** A bench with its sides grouped, as the UI consumes it. */
export type Bench = {
  id: string;
  area_id: string;
  style: BenchStyle;
  size_ft: 4 | 8;
  installed: boolean;
  pos_x: number;
  pos_y: number;
  sides: BenchSide[];
  status: BenchStatus;
};

export const PRICE_USD = { adopt: 3500, install_and_adopt: 5500 } as const;
export const MAX_PLAQUE_LINES = 7;
export const MAX_PLAQUE_CHARS = 300;

export const STYLE_LABEL: Record<BenchStyle, string> = {
  worlds_fair: "World's Fair",
  concrete: "Concrete base",
};

/** One row of the `admin_queue` view. */
export type QueueItem = {
  id: string;
  bench_id: string;
  area_id: string;
  side: Side;
  kind: AdoptionKind;
  status: "held" | "pending" | "active";
  donor_name: string | null;
  donor_email: string | null;
  honoree_name: string | null;
  plaque_text: string | null;
  notes: string | null;
  amount_usd: number | null;
  submitted_at: string;
  reviewed_at: string | null;
  adopted_at: string;
  held_until: string | null;
  installed: boolean;
};

export const priceFor = (bench: { installed: boolean }) =>
  bench.installed ? PRICE_USD.adopt : PRICE_USD.install_and_adopt;
