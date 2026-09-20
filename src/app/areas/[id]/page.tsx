import { notFound } from "next/navigation";
import { ParkExplorer } from "@/components/ParkExplorer";
import { getAllBenches, getArea, getAreas } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Deep link to an area: the explorer, already flown in. */
export default async function AreaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [area, areas, benches] = await Promise.all([getArea(id), getAreas(), getAllBenches()]);
  if (!area) notFound();
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight text-emerald-950">{area.name}</h1>
      <ParkExplorer areas={areas} benches={benches} initialArea={id} />
    </div>
  );
}
