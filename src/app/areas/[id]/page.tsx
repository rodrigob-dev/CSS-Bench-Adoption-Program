import Link from "next/link";
import { notFound } from "next/navigation";
import { BenchCard } from "@/components/BenchCard";
import { MapLegend } from "@/components/MapLegend";
import { MapLoader } from "@/components/MapLoader";
import { getAllBenches, getArea, getAreas } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AreaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [area, areas, allBenches] = await Promise.all([getArea(id), getAreas(), getAllBenches()]);
  if (!area) notFound();

  const benches = allBenches.filter((b) => b.area_id === id);
  const installed = benches.filter((b) => b.installed);
  const slots = benches.filter((b) => !b.installed);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-emerald-900/60">
        <Link href="/" className="hover:underline">Park map</Link> / {area.name}
      </nav>

      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-emerald-950">{area.name}</h1>
        <p className="max-w-2xl text-emerald-900/70">{area.description}</p>
        <p className="text-sm text-emerald-900/70">
          {area.benches_total} benches · <span className="font-medium text-blue-700">{area.sides_open}</span> of{" "}
          {area.sides_total} sides open
          {slots.length > 0 && <> · {area.slots_open} spots for a new bench</>}
        </p>
      </section>

      <div className="relative h-[380px] overflow-hidden rounded-xl border border-emerald-900/10 shadow-sm lg:h-[440px]">
        <MapLoader benches={allBenches} areas={areas} focusArea={id} />
        <MapLegend compact />
      </div>

      {slots.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-900/60">Install a new bench</h2>
          <p className="max-w-2xl text-sm text-emerald-900/70">
            The park has pre-approved a limited number of spots along the edge of the {area.name} for new benches.
            Adopting one installs a new World&apos;s Fair bench with your plaque (about 3 months).
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {slots.map((b) => <BenchCard key={b.id} bench={b} />)}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-900/60">Benches</h2>
        <p className="text-xs text-emerald-900/60">A / B = bench sides. 8 ft benches have two, 4 ft have one.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {installed.map((b) => <BenchCard key={b.id} bench={b} />)}
        </div>
      </section>
    </div>
  );
}
