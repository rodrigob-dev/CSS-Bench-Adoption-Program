import { AreaExplorer } from "@/components/AreaExplorer";
import { getAllBenches, getAreas } from "@/lib/queries";
import { PARK } from "@/lib/park";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [areas, benches] = await Promise.all([getAreas(), getAllBenches()]);
  const totals = areas.reduce(
    (t, a) => ({
      benches: t.benches + a.benches_total,
      sides: t.sides + a.sides_total,
      open: t.open + a.sides_open,
      slots: t.slots + a.slots_open,
    }),
    { benches: 0, sides: 0, open: 0, slots: 0 },
  );

  return (
    <div className="space-y-8">
      <section className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl">
            Adopt a bench in {PARK.name}
          </h1>
          <p className="max-w-2xl text-lg text-emerald-900/70">
            Honor a loved one, commemorate an occasion, or propose at your favorite spot. Your plaque stays on the
            bench for 10 years. Every bench in the park is on the map: blue is open, grey is taken.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-4 text-center md:text-right">
          <Stat value={totals.benches} label="benches" />
          <Stat value={totals.open} label="sides open" accent />
          <Stat value={totals.slots} label="new-bench spots" />
        </dl>
      </section>

      <AreaExplorer areas={areas} benches={benches} />
    </div>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div>
      <dt className="order-2 text-xs uppercase tracking-wider text-emerald-900/50">{label}</dt>
      <dd className={`text-2xl font-semibold tabular-nums ${accent ? "text-blue-700" : "text-emerald-950"}`}>
        {value.toLocaleString("en-US")}
      </dd>
    </div>
  );
}
