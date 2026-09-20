"use client";

import Link from "next/link";
import { useState } from "react";
import { AdoptForm } from "./AdoptForm";
import { BenchScene, type SceneSide } from "./BenchScene";
import { STATUS_LABEL } from "./status";
import { formatDate, formatUsd, yearsLeft } from "@/lib/format";
import { STYLE_LABEL, type Bench, type BenchSide, type Side } from "@/lib/types";

type Props = {
  bench: Bench;
  areaName: string;
  background: string;
  price: number;
  balance: number;
  adoptedJustNow?: string;
};

const sideLabel = (bench: Bench, side: Side) => (bench.sides.length === 1 ? "plaque" : side === "A" ? "left plaque" : "right plaque");

/** The bench page: photo scene on the left, details / adoption form on the right. */
export function BenchExperience({ bench, areaName, background, price, balance, adoptedJustNow }: Props) {
  const [editing, setEditing] = useState<Side | null>(null);
  const [draft, setDraft] = useState("");

  const sides: SceneSide[] = bench.sides.map((s) => ({
    side: s.side,
    status: s.side_status,
    donor_name: s.donor_name,
    honoree_name: s.honoree_name,
    plaque_text: s.plaque_text,
  }));
  const editingSide = editing ? bench.sides.find((s) => s.side === editing) : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-3">
        <BenchScene
          benchId={bench.id}
          sides={sides}
          background={background}
          draft={draft}
          editingSide={editing}
          ghostBench={!bench.installed}
          onPlaqueClick={(s) => setEditing(s)}
          onPickSide={(s) => {
            if (s !== editing) {
              setEditing(null);
              setDraft("");
            }
          }}
        />
        <p className="text-xs text-emerald-900/50">
          {bench.installed
            ? `${bench.size_ft} ft ${STYLE_LABEL[bench.style]} bench in ${areaName}. Photo is representative; plaque positions match the real rail.`
            : `Pre-approved spot in ${areaName}: a new 8 ft World's Fair bench is installed here once adopted.`}
        </p>
      </div>

      <aside className="rounded-2xl border border-emerald-900/10 bg-white p-4 text-sm shadow-sm">
        {adoptedJustNow && (
          <p className="mb-3 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-900">
            Thank you! The {sideLabel(bench, adoptedJustNow as Side)} is yours.{" "}
            {bench.installed ? "The park will install it in about 6–8 weeks." : "The park will be in touch to schedule the installation (about 3 months)."}
          </p>
        )}

        {editingSide ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-emerald-950">Adopt the {sideLabel(bench, editingSide.side)}</h2>
              <button type="button" onClick={() => { setEditing(null); setDraft(""); }} className="text-xs text-emerald-900/60 hover:underline">
                Cancel
              </button>
            </div>
            <p className="text-emerald-900/70">
              {bench.installed ? "Existing bench" : "New bench installation"} · {formatUsd(price)} · 10-year term · fully tax deductible.
              Your text appears on the plaque as you type.
            </p>
            <AdoptForm
              benchId={bench.id}
              side={editingSide.side}
              price={price}
              balance={balance}
              install={!bench.installed}
              onPlaqueChange={setDraft}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="font-mono text-lg font-semibold text-emerald-950">{bench.id}</h2>
              <p className="text-emerald-900/70">
                <Link href={`/areas/${bench.area_id}`} className="underline-offset-2 hover:underline">{areaName}</Link> ·{" "}
                {STATUS_LABEL[bench.status]} · {formatUsd(price)} per plaque
              </p>
            </div>
            <ul className="space-y-3">
              {bench.sides.map((s) => (
                <li key={s.side} className={`rounded-lg border p-3 ${s.side_status === "open" ? "border-blue-300 bg-blue-50/60" : "border-gray-200 bg-gray-50"}`}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium capitalize">{sideLabel(bench, s.side)}</span>
                    <span className={`text-xs font-medium ${s.side_status === "open" ? "text-blue-700" : "text-gray-600"}`}>
                      {s.side_status === "open" ? "Open" : "Adopted"}
                    </span>
                  </div>
                  {s.side_status === "open" ? (
                    <button
                      type="button"
                      onClick={() => setEditing(s.side)}
                      className="mt-2 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      {bench.installed ? "Adopt this plaque" : "Install & adopt"} · {formatUsd(price)}
                    </button>
                  ) : (
                    <AdoptedDetails side={s} />
                  )}
                </li>
              ))}
            </ul>
            {bench.sides.length === 1 && bench.installed && (
              <p className="text-xs text-emerald-900/50">4 ft benches carry a single plaque, centred on the top rail.</p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function AdoptedDetails({ side }: { side: BenchSide }) {
  return (
    <dl className="mt-2 space-y-1 text-xs text-gray-700">
      <div><dt className="inline text-gray-500">Adopted by </dt><dd className="inline font-medium">{side.donor_name}</dd></div>
      {side.honoree_name && <div><dt className="inline text-gray-500">In honor / memory of </dt><dd className="inline">{side.honoree_name}</dd></div>}
      <div>
        <dt className="inline text-gray-500">Term </dt>
        <dd className="inline">
          {side.adopted_at && formatDate(side.adopted_at)} – {side.expires_at && formatDate(side.expires_at)}
          {side.expires_at && <span className="text-gray-500"> · {yearsLeft(side.expires_at)} yrs left</span>}
        </dd>
      </div>
      {side.kind === "install_and_adopt" && <div className="text-gray-500">Installed as a new bench by this donor.</div>}
    </dl>
  );
}
