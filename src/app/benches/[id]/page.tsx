import Link from "next/link";
import { notFound } from "next/navigation";
import { AdoptForm } from "@/components/AdoptForm";
import { MapLoader } from "@/components/MapLoader";
import { STATUS_LABEL } from "@/components/status";
import { formatDate, formatUsd, yearsLeft } from "@/lib/format";
import { getAllBenches, getArea, getAreas, getBench } from "@/lib/queries";
import { STYLE_LABEL, priceFor, type BenchSide } from "@/lib/types";
import { getBalance } from "@/lib/wallet";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ adopted?: string }> };

export default async function BenchPage({ params, searchParams }: Props) {
  const [{ id }, { adopted }] = await Promise.all([params, searchParams]);
  const bench = await getBench(id);
  if (!bench) notFound();
  const [area, areas, allBenches, balance] = await Promise.all([
    getArea(bench.area_id),
    getAreas(),
    getAllBenches(),
    getBalance(),
  ]);
  const price = priceFor(bench);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-emerald-900/60">
        <Link href="/" className="hover:underline">Park map</Link> /{" "}
        <Link href={`/areas/${bench.area_id}`} className="hover:underline">{area?.name ?? bench.area_id}</Link> /{" "}
        <span className="font-mono">{bench.id}</span>
      </nav>

      {adopted && (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Thank you! Side {adopted} is now adopted.{" "}
          {bench.installed
            ? "The park will install your plaque in about 6–8 weeks."
            : "The park will be in touch to schedule the installation (about 3 months)."}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
      <section className="space-y-1">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-emerald-950">{bench.id}</h1>
        <p className="text-emerald-900/70">
          {bench.installed ? (
            <>
              {bench.size_ft} ft {STYLE_LABEL[bench.style]} bench in {area?.name}.{" "}
              {bench.size_ft === 8 ? "Two independently adoptable sides." : "One adoptable side."}
            </>
          ) : (
            <>
              Pre-approved spot for a new 8 ft World&apos;s Fair bench on the edge of the {area?.name}. The bench is
              installed once adopted; the second side opens after installation.
            </>
          )}
        </p>
        <p className="text-sm text-emerald-900/70">
          Status: <span className="font-medium">{STATUS_LABEL[bench.status]}</span> · {formatUsd(price)} per side ·
          10-year term · fully tax deductible
        </p>
      </section>
      <div className="h-[200px] overflow-hidden rounded-xl border border-emerald-900/10 shadow-sm">
        <MapLoader benches={allBenches} areas={areas} focusBench={bench.id} />
      </div>
      </div>

      <div className={`grid gap-4 ${bench.sides.length > 1 ? "md:grid-cols-2" : "max-w-xl"}`}>
        {bench.sides.map((s) => (
          <SidePanel key={s.side} side={s} balance={balance} price={price} install={!bench.installed} />
        ))}
      </div>
    </div>
  );
}

function SidePanel({ side, balance, price, install }: { side: BenchSide; balance: number; price: number; install: boolean }) {
  const open = side.side_status === "open";
  return (
    <section
      className={`rounded-lg border-2 p-4 ${open ? "border-blue-500 bg-white" : "border-gray-300 bg-gray-50"}`}
    >
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-semibold">Side {side.side}</h2>
        <span className={`text-xs font-medium ${open ? "text-blue-700" : "text-gray-600"}`}>
          {open ? "Open" : "Adopted"}
        </span>
      </div>

      {open ? (
        <AdoptForm benchId={side.bench_id} side={side.side} price={price} balance={balance} install={install} />
      ) : (
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-gray-500">Adopted by</dt>
            <dd className="font-medium">{side.donor_name}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Plaque</dt>
            <dd className="mt-1 whitespace-pre-line rounded border border-amber-300 bg-amber-50 px-3 py-2 font-serif text-amber-950">
              {side.plaque_text}
            </dd>
          </div>
          <div className="flex gap-6">
            <div>
              <dt className="text-gray-500">Since</dt>
              <dd>{side.adopted_at && formatDate(side.adopted_at)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Until</dt>
              <dd>
                {side.expires_at && formatDate(side.expires_at)}
                {side.expires_at && <span className="text-gray-500"> · {yearsLeft(side.expires_at)} yrs left</span>}
              </dd>
            </div>
          </div>
          {side.kind === "install_and_adopt" && (
            <p className="text-xs text-gray-500">Installed as a new bench by this donor.</p>
          )}
        </dl>
      )}
    </section>
  );
}
