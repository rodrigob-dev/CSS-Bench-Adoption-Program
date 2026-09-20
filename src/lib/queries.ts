import "server-only";
import { getHoldToken } from "./session";
import { supabase } from "./supabase";
import type { AreaSummary, Bench, BenchSide, BenchStatus, QueueItem } from "./types";

function benchStatus(sides: BenchSide[]): BenchStatus {
  const open = sides.filter((s) => s.side_status === "open").length;
  if (open === sides.length) return "open";
  if (open === 0) return "full";
  return "partial";
}

/** Group `bench_sides` rows into one Bench per bench_id, sides in A/B order. */
function groupSides(rows: BenchSide[]): Bench[] {
  const byBench = new Map<string, BenchSide[]>();
  for (const row of rows) {
    const list = byBench.get(row.bench_id) ?? [];
    list.push(row);
    byBench.set(row.bench_id, list);
  }
  return [...byBench.entries()].map(([id, sides]) => {
    sides.sort((a, b) => a.side.localeCompare(b.side));
    const { area_id, style, size_ft, installed, pos_x, pos_y } = sides[0];
    return { id, area_id, style, size_ft, installed, pos_x, pos_y, sides, status: benchStatus(sides) };
  });
}

export async function getAreas(): Promise<AreaSummary[]> {
  const { data, error } = await supabase
    .from("area_summary")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data as AreaSummary[];
}

export async function getArea(id: string): Promise<AreaSummary | null> {
  const { data, error } = await supabase
    .from("area_summary")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as AreaSummary | null;
}

/** Every bench in the park (≈530 benches / ≈930 sides) for the park map. */
export async function getAllBenches(): Promise<Bench[]> {
  const { data, error } = await supabase
    .from("bench_sides")
    .select("*")
    .order("bench_id")
    .limit(5000);
  if (error) throw error;
  return groupSides(data as BenchSide[]);
}

export async function getBenchesInArea(areaId: string): Promise<Bench[]> {
  const { data, error } = await supabase
    .from("bench_sides")
    .select("*")
    .eq("area_id", areaId)
    .order("bench_id")
    .limit(5000);
  if (error) throw error;
  return groupSides(data as BenchSide[]);
}

export async function getBench(id: string): Promise<Bench | null> {
  const { data, error } = await supabase
    .from("bench_sides")
    .select("*")
    .eq("bench_id", id);
  if (error) throw error;
  const rows = data as BenchSide[];
  if (!rows.length) return null;

  // Which of the live holds on this bench are mine? Compared server-side so
  // the token never leaves the server.
  const token = await getHoldToken();
  if (token && rows.some((r) => r.side_status === "held")) {
    const { data: mine } = await supabase
      .from("adoptions")
      .select("side")
      .eq("bench_id", id)
      .eq("status", "held")
      .eq("hold_token", token);
    const mySides = new Set((mine ?? []).map((m) => m.side as string));
    for (const r of rows) r.held_by_me = r.side_status === "held" && mySides.has(r.side);
  }
  return groupSides(rows)[0];
}

/** Staff queue: every live request, pending first. */
export async function getQueue(): Promise<QueueItem[]> {
  const { data, error } = await supabase.from("admin_queue").select("*").limit(2000);
  if (error) throw error;
  return data as QueueItem[];
}
