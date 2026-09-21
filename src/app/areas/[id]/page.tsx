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
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-forest">{area.name}</h1>
      <ParkExplorer areas={areas} benches={benches} initialArea={id} />
    </div>
  );
}
