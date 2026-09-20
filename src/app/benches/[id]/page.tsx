import Link from "next/link";
import { notFound } from "next/navigation";
import { BenchExperience } from "@/components/BenchExperience";
import { AREA_BY_ID } from "@/lib/park";
import { getArea, getBench } from "@/lib/queries";
import { priceFor } from "@/lib/types";
import { getBalance } from "@/lib/wallet";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ adopted?: string }> };

export default async function BenchPage({ params, searchParams }: Props) {
  const [{ id }, { adopted }] = await Promise.all([params, searchParams]);
  const bench = await getBench(id);
  if (!bench) notFound();
  const [area, balance] = await Promise.all([getArea(bench.area_id), getBalance()]);
  const backdrop = AREA_BY_ID[bench.area_id]?.backdrop ?? "lawn";

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-8">
      <nav className="text-sm text-emerald-900/60">
        <Link href="/" className="hover:underline">Park map</Link> /{" "}
        <Link href={`/areas/${bench.area_id}`} className="hover:underline">{area?.name ?? bench.area_id}</Link> /{" "}
        <span className="font-mono">{bench.id}</span>
      </nav>
      <BenchExperience
        bench={bench}
        areaName={area?.name ?? bench.area_id}
        background={`/bench/bg/${backdrop}.jpg`}
        price={priceFor(bench)}
        balance={balance}
        adoptedJustNow={adopted}
      />
    </div>
  );
}
