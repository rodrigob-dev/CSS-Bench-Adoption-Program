import Link from "next/link";
import { notFound } from "next/navigation";
import { BenchExperience } from "@/components/BenchExperience";
import { getArea, getBench } from "@/lib/queries";
import { priceFor } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ adopted?: string; adopt?: string; view?: string }> };

export default async function BenchPage({ params, searchParams }: Props) {
  const [{ id }, { adopted, adopt, view }] = await Promise.all([params, searchParams]);
  const bench = await getBench(id);
  if (!bench) notFound();
  const area = await getArea(bench.area_id);

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 py-6">
      <Link href={`/areas/${bench.area_id}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/95 py-1.5 pl-2.5 pr-3.5 text-sm font-semibold text-forest-deep shadow hover:bg-white">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
        Back to {area?.name ?? bench.area_id}
      </Link>
      <BenchExperience
        bench={bench}
        areaName={area?.name ?? bench.area_id}
        price={priceFor(bench)}
        adoptedJustNow={adopted}
        startWith={adopt === "A" || adopt === "B" ? adopt : undefined}
        viewSide={view === "A" || view === "B" ? view : undefined}
      />
    </div>
  );
}
