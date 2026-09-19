export type Side = "A" | "B";
export type SideStatus = "open" | "adopted";
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
  plaque_text: string | null;
  amount_usd: number | null;
  adopted_at: string | null;
  term_years: number | null;
  expires_at: string | null;
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
export const MAX_PLAQUE_CHARS = 400;

export const STYLE_LABEL: Record<BenchStyle, string> = {
  worlds_fair: "World's Fair",
  concrete: "Concrete base",
};

export const priceFor = (bench: { installed: boolean }) =>
  bench.installed ? PRICE_USD.adopt : PRICE_USD.install_and_adopt;
