/**
 * Race test: fire N concurrent adoptions at the same open bench side and
 * assert that exactly one succeeds and the rest fail with SQLSTATE 23505
 * (the partial unique index). Calls the same `adopt_bench` function the UI
 * uses, so it tests the real write path.
 *
 *   npx tsx scripts/race-test.mts
 *
 * The winning adoption is cancelled afterwards so the seed stays clean.
 */
import { createClient } from "@supabase/supabase-js";

const N = 8;
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
const db = createClient(url, key, { auth: { persistSession: false } });

const { data: target, error: findError } = await db
  .from("bench_sides")
  .select("bench_id, side")
  .eq("side_status", "open")
  .eq("installed", true)
  .limit(1)
  .single();
if (findError || !target) throw findError ?? new Error("no open side found");

console.log(`Firing ${N} concurrent adoptions at ${target.bench_id} side ${target.side}…`);

const results = await Promise.all(
  Array.from({ length: N }, (_, i) =>
    db.rpc("adopt_bench", {
      p_bench_id: target.bench_id,
      p_side: target.side,
      p_donor_name: `Racer ${i + 1}`,
      p_plaque_text: `Racer ${i + 1} was here`,
    }),
  ),
);

const winners = results.filter((r) => !r.error);
const rejected = results.filter((r) => r.error?.code === "23505");
const other = results.filter((r) => r.error && r.error.code !== "23505");

console.log(`winners: ${winners.length}, rejected with 23505: ${rejected.length}, other errors: ${other.length}`);
for (const r of other) console.log("  unexpected:", r.error);

const { count } = await db
  .from("adoptions")
  .select("*", { count: "exact", head: true })
  .eq("bench_id", target.bench_id)
  .eq("side", target.side)
  .eq("status", "active");
console.log(`active rows on that side in the database: ${count}`);

// clean up: cancel the winner so the seed is unchanged
for (const w of winners) {
  await db.from("adoptions").update({ status: "cancelled" }).eq("id", w.data.id);
}

const ok = winners.length === 1 && rejected.length === N - 1 && count === 1;
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
