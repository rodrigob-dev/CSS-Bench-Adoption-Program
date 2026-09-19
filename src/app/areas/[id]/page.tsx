import Link from "next/link";
import { notFound } from "next/navigation";
import { BenchCard } from "@/components/BenchCard";
import { getArea, getBenchesInArea } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AreaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [area, benches] = await Promise.all([getArea(id), getBenchesInArea(id)]);
  if (!area) notFound();

  const installed = benches.filter((b) => b.installed);
  const slots = benches.filter((b) => !b.installed);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-emerald-900/60">
        <Link href="/" className="hover:underline">All areas</Link> / {area.name}
      </nav>

      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-emerald-950">{area.name}</h1>
        <p className="max-w-2xl text-emerald-900/70">{area.description}</p>
        <p className="text-sm text-emerald-900/70">
          {area.benches_total} benches · <span className="font-medium text-blue-700">{area.sides_open}</span> of{" "}
          {area.sides_total} sides open
        </p>
      </section>

      <Legend />

      {slots.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-900/60">
            Install a new bench
          </h2>
          <p className="max-w-2xl text-sm text-emerald-900/70">
            VCPA has pre-approved a limited number of spots on the Parade Ground perimeter for new benches. Adopting one
            installs a new World&apos;s Fair bench with your plaque (about 3 months).
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {slots.map((b) => <BenchCard key={b.id} bench={b} />)}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-900/60">Existing benches</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {installed.map((b) => <BenchCard key={b.id} bench={b} />)}
        </div>
      </section>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-emerald-900/70">
      <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm border-2 border-blue-500 bg-blue-50" /> Open</span>
      <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm border-2 border-dashed border-blue-400 bg-white" /> One side open (8 ft)</span>
      <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm border-2 border-gray-300 bg-gray-100" /> Adopted</span>
      <span className="ml-auto">A / B = bench sides. 8 ft benches have two, 4 ft have one.</span>
    </div>
  );
}
