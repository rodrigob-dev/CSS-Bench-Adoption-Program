"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { holdPlaque, releaseHold } from "@/app/actions";
import { AdoptForm } from "./AdoptForm";
import { BenchScene, type SceneSide } from "./BenchScene";
import { SIDE_LABEL, STATUS_LABEL } from "./status";
import { formatDate, formatUsd, yearsLeft } from "@/lib/format";
import type { Backdrop } from "@/lib/park";
import { STYLE_LABEL, type Bench, type BenchSide, type Side } from "@/lib/types";

type Props = {
  bench: Bench;
  areaName: string;
  backdrop: Backdrop;
  price: number;
  balance: number;
  adoptedJustNow?: string;
};

const plaqueName = (bench: Bench, side: Side) => (bench.sides.length === 1 ? "plaque" : side === "A" ? "left plaque" : "right plaque");

/**
 * The bench page. Clicking an open plaque takes a 10-minute hold on it (server
 * action) before the form opens, so two people cannot fill in the same plaque
 * at once; cancelling releases it; submitting converts it into the adoption.
 */
export function BenchExperience({ bench, areaName, backdrop, price, balance, adoptedJustNow }: Props) {
  const [editing, setEditing] = useState<Side | null>(null);
  const [holdUntil, setHoldUntil] = useState<string | null>(null); // null while editing = no hold (unmigrated db)
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();

  const sides: SceneSide[] = bench.sides.map((s) => ({
    side: s.side,
    status: s.side_status,
    mine: s.held_by_me,
    donor_name: s.donor_name,
    honoree_name: s.honoree_name,
    plaque_text: s.plaque_text,
  }));
  const editingSide = editing ? bench.sides.find((s) => s.side === editing) : null;

  const beginAdoption = (side: Side) => {
    setNotice(null);
    const existing = bench.sides.find((s) => s.side === side);
    if (existing?.held_by_me && existing.held_until) {
      setEditing(side);
      setHoldUntil(existing.held_until);
      return;
    }
    start(async () => {
      const r = await holdPlaque(bench.id, side);
      if ("error" in r) {
        setNotice(r.error);
        return;
      }
      setEditing(side);
      setHoldUntil(r.until);
    });
  };

  const cancel = (message?: string) => {
    if (editing) start(() => releaseHold(bench.id, editing));
    setEditing(null);
    setHoldUntil(null);
    setDraft("");
    if (message) setNotice(message);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      <div>
        <BenchScene
          benchId={bench.id}
          sides={sides}
          backdrop={backdrop}
          draft={draft}
          editingSide={editing}
          ghostBench={!bench.installed}
          onPlaqueClick={beginAdoption}
          onPickSide={(s) => {
            if (editing && s !== editing) cancel();
          }}
        />
        <p className="mt-2 text-xs text-ink/50">
          {bench.installed
            ? `${bench.size_ft} ft ${STYLE_LABEL[bench.style]} bench. The photo stands in for the real bench; plaques sit where they would on its rail.`
            : `Pre-approved spot in the ${areaName}. The park installs a new 8 ft World's Fair bench here once it is adopted.`}
        </p>
      </div>

      <aside className="rounded-2xl border border-black/10 bg-white p-5 text-sm shadow-lg">
        {adoptedJustNow && (
          <p className="mb-3 rounded-md border border-lime/60 bg-lime-soft/40 px-3 py-2 text-forest-deep">
            Thank you! The {plaqueName(bench, adoptedJustNow as Side)} is yours.{" "}
            {bench.installed ? "The park will install it in about 6–8 weeks." : "The park will be in touch to schedule the installation (about 3 months)."}
          </p>
        )}
        {notice && (
          <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900" role="status">
            {notice}
          </p>
        )}

        {editingSide ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-forest">
                Adopt the {plaqueName(bench, editingSide.side)}
              </h2>
              <button type="button" onClick={() => cancel()} className="text-xs text-ink/60 hover:underline">Cancel</button>
            </div>
            {holdUntil && (
              <HoldTimer until={holdUntil} onExpire={() => cancel("Your 10-minute reservation ran out. Click the plaque again to start over.")} />
            )}
            <p className="text-ink/70">
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
              <h2 className="font-display text-3xl font-extrabold uppercase tracking-wide text-forest">{bench.id}</h2>
              <p className="text-ink/70">
                {STATUS_LABEL[bench.status]} bench in the{" "}
                <Link href={`/areas/${bench.area_id}`} className="underline-offset-2 hover:underline">{areaName}</Link>.{" "}
                {formatUsd(price)} per plaque, 10-year term, fully tax deductible.
              </p>
            </div>
            <ul className="space-y-3">
              {bench.sides.map((s) => {
                const tone = s.side_status === "open" ? "border-blue-300 bg-blue-50/60" : s.side_status === "held" ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-gray-50";
                return (
                  <li key={s.side} className={`rounded-lg border p-3 ${tone}`}>
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold capitalize">{plaqueName(bench, s.side)}</span>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${s.side_status === "open" ? "text-blue-700" : s.side_status === "held" ? "text-amber-700" : "text-gray-600"}`}>
                        {s.held_by_me ? "Reserved for you" : SIDE_LABEL[s.side_status]}
                      </span>
                    </div>
                    {s.side_status === "open" || s.held_by_me ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => beginAdoption(s.side)}
                        className="mt-2 w-full rounded-full bg-lime px-3 py-2 font-display text-base font-bold uppercase tracking-wide text-ink hover:brightness-95 disabled:opacity-50"
                      >
                        {pending ? "Reserving…" : s.held_by_me ? "Continue your adoption" : bench.installed ? `Adopt this plaque for ${formatUsd(price)}` : `Install a bench here for ${formatUsd(price)}`}
                      </button>
                    ) : s.side_status === "held" ? (
                      <p className="mt-2 text-xs text-amber-800">
                        Someone is filling in the form for this plaque. If they don&apos;t finish, it frees up
                        {s.held_until ? ` at ${new Date(s.held_until).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : " within 10 minutes"}.
                      </p>
                    ) : (
                      <AdoptedDetails side={s} />
                    )}
                  </li>
                );
              })}
            </ul>
            {bench.sides.length === 1 && bench.installed && (
              <p className="text-xs text-ink/50">4 ft benches carry a single plaque, centred on the top rail.</p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function HoldTimer({ until, onExpire }: { until: string; onExpire: () => void }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(until).getTime() - Date.now()));
  useEffect(() => {
    const id = setInterval(() => {
      const ms = new Date(until).getTime() - Date.now();
      setLeft(Math.max(0, ms));
      if (ms <= 0) {
        clearInterval(id);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [until, onExpire]);
  const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
  return (
    <p className="rounded-md bg-forest/10 px-3 py-2 text-xs text-forest-deep">
      Reserved for you for <span className="font-mono font-semibold">{m}:{String(s).padStart(2, "0")}</span>. Nobody else can take this plaque while you fill in the form.
    </p>
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
