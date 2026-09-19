import Link from "next/link";
import { MapLoader } from "@/components/MapLoader";
import { getAreas } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const areas = await getAreas();
  const totals = areas.reduce(
    (t, a) => ({
      benches: t.benches + a.benches_total,
      sides: t.sides + a.sides_total,
      open: t.open + a.sides_open,
    }),
    { benches: 0, sides: 0, open: 0 },
  );

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-emerald-950">
          Adopt a bench in Van Cortlandt Park
        </h1>
        <p className="max-w-2xl text-emerald-900/70">
          Honor a loved one, commemorate an occasion, or propose at your favorite spot. Adoption places a
          personalized plaque on a bench for 10 years. {totals.benches} benches across {areas.length} areas;{" "}
          <span className="font-medium text-blue-700">{totals.open}</span> of {totals.sides} bench sides are open right now.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="h-[420px] overflow-hidden rounded-lg border border-emerald-900/10 bg-white lg:h-[560px]">
          <MapLoader areas={areas} />
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-900/60">Pick an area</h2>
          <ul className="space-y-2">
            {areas.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/areas/${a.id}`}
                  className="block rounded-lg border border-emerald-900/10 bg-white px-4 py-3 hover:border-blue-400 hover:bg-blue-50"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-emerald-950">{a.name}</span>
                    <span className="text-sm text-emerald-900/60">{a.benches_total} benches</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm">
                    <Meter open={a.sides_open} total={a.sides_total} />
                    <span className="whitespace-nowrap text-emerald-900/70">
                      <span className="font-medium text-blue-700">{a.sides_open}</span> / {a.sides_total} sides open
                    </span>
                  </div>
                  {a.slots_open > 0 && (
                    <div className="mt-1 text-xs text-emerald-800">
                      {a.slots_open} pre-approved spots for a new bench
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Meter({ open, total }: { open: number; total: number }) {
  const pct = total ? Math.round((open / total) * 100) : 0;
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200" aria-hidden>
      <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
