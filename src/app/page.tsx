import { ParkExplorer } from "@/components/ParkExplorer";
import { PARK } from "@/lib/park";
import { getAllBenches, getAreas } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [areas, benches] = await Promise.all([getAreas(), getAllBenches()]);
  const open = areas.reduce((t, a) => t + a.sides_open, 0);
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-forest">Adopt a bench in {PARK.name}</h1>
          <p className="text-ink/70">
            Every bench is on the map. Blue is open, grey is adopted. <span className="font-semibold text-blue-700">{open}</span> plaques open now.
            $3,500 for ten years, or $5,500 for a new bench. <a href="/about" className="underline underline-offset-2">How it works</a>
          </p>
        </div>
      </section>
      <ParkExplorer areas={areas} benches={benches} />
    </div>
  );
}
