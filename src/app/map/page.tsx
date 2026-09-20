import { ParkExplorer } from "@/components/ParkExplorer";
import { PARK } from "@/lib/park";
import { getAllBenches, getAreas } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [areas, benches] = await Promise.all([getAreas(), getAllBenches()]);
  const open = areas.reduce((t, a) => t + a.sides_open, 0);
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-emerald-950">Find a bench in {PARK.name}</h1>
          <p className="text-emerald-900/70">Every bench in the park is on the map. Pick an area, then a bench. <span className="font-medium text-blue-700">{open}</span> plaques are open right now.</p>
        </div>
      </section>
      <ParkExplorer areas={areas} benches={benches} />
    </div>
  );
}
