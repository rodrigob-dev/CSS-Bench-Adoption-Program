"use client";

import { useState } from "react";
import type { Side } from "@/lib/types";

export type SceneSide = {
  side: Side;
  status: "open" | "adopted";
  donor_name?: string | null;
  honoree_name?: string | null;
  plaque_text?: string | null;
};

type Props = {
  benchId: string;
  sides: SceneSide[];
  /** Background photo for this bench's area. */
  background: string;
  draft?: string;
  editingSide?: Side | null;
  /** Not-yet-installed spot: show the bench translucent. */
  ghostBench?: boolean;
  onPlaqueClick?: (side: Side) => void;
  onPickSide?: (side: Side | null) => void;
};

/**
 * Photo composition: one cut-out bench (always the same image, so plaque
 * positions are fixed) over a per-area background photo. "Camera" moves are
 * CSS transforms with parallax: the background shifts less than the bench.
 *
 *   overview → slide to the left/right plaque → zoom into a plaque to edit
 *
 * Plaque geometry is a percentage of the bench image (1688 × 923):
 * the top rail runs x 70–1500, y 68–140.
 */
const PLAQUE = {
  A: { left: 28.5, top: 11.3 },   // left half of the top rail
  B: { left: 71.5, top: 11.3 },   // right half
  w: 15,                          // % of bench width  (≈ 10 in on a 6 ft rail)
  h: 7.4,                         // % of bench height
};

type View = "overview" | Side;

export function BenchScene({ benchId, sides, background, draft = "", editingSide = null, ghostBench = false, onPlaqueClick, onPickSide }: Props) {
  const [view, setView] = useState<View>(editingSide ?? "overview");
  const single = sides.length === 1;
  const zoomed = editingSide !== null;

  // camera: where the bench sits and how big, per view
  const focus = view === "overview" ? 50 : view === "A" ? PLAQUE.A.left : PLAQUE.B.left;
  const camScale = zoomed ? 2.6 : view === "overview" ? 1 : 1.45;
  // translate so the focused x (in bench %) lands at the stage centre
  const benchW = 90; // bench width as % of stage
  const benchLeft = 5; // bench left offset as % of stage
  const focusStageX = benchLeft + (focus / 100) * benchW; // in stage %
  const focusStageY = zoomed ? 27 : 50;
  const tx = (50 - focusStageX) * camScale;
  const ty = (50 - focusStageY) * camScale;

  const go = (v: View) => {
    setView(v);
    onPickSide?.(v === "overview" ? null : v);
  };

  return (
    <div className="@container relative select-none overflow-hidden rounded-2xl bg-[#c9d6c0] shadow-lg">
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {/* background photo — parallax: moves and scales less than the bench, so it stays sharp */}
        <div
          className="absolute inset-[-10%] bg-cover bg-[center_60%] transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,0.9,0.25,1)]"
          style={{
            backgroundImage: `url(${background})`,
            transform: `translate(${tx * 0.45}%, ${ty * 0.45}%) scale(${1 + (camScale - 1) * 0.3})`,
          }}
        />
        {/* ground shadow + bench + plaques move together */}
        <div
          className="absolute inset-0 transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,0.9,0.25,1)]"
          style={{ transform: `translate(${tx}%, ${ty}%) scale(${camScale})`, transformOrigin: "50% 50%" }}
        >
          <div
            className="absolute rounded-[50%] bg-black/35 blur-xl"
            style={{ left: `${benchLeft + 4}%`, width: `${benchW - 8}%`, top: "84%", height: "10%" }}
          />
          <div className="absolute" style={{ left: `${benchLeft}%`, width: `${benchW}%`, top: "16%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/bench/bench.png"
              alt=""
              className={`block w-full drop-shadow-[0_10px_10px_rgba(0,0,0,0.25)] ${ghostBench ? "opacity-55 saturate-50" : ""}`}
              draggable={false}
            />
            {sides.map((s) => (
              <Plaque
                key={s.side}
                data={s}
                pos={single ? { left: 50, top: PLAQUE.A.top } : PLAQUE[s.side]}
                draft={editingSide === s.side ? draft : ""}
                editing={editingSide === s.side}
                dim={view !== "overview" && view !== s.side}
                onClick={() => {
                  if (s.status === "adopted") return;
                  go(s.side);
                  onPlaqueClick?.(s.side);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 text-sm">
        <Ctl onClick={() => go("A")} active={view === "A"}>◀ {single ? "Plaque" : "Left plaque"}</Ctl>
        <Ctl onClick={() => go("overview")} active={view === "overview"}>
          <span className="font-mono text-xs">{benchId}</span>
        </Ctl>
        {!single && <Ctl onClick={() => go("B")} active={view === "B"}>Right plaque ▶</Ctl>}
      </div>
    </div>
  );
}

function Ctl({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pointer-events-auto rounded-full px-3 py-1.5 font-medium shadow backdrop-blur ${
        active ? "bg-emerald-950/85 text-white" : "bg-white/85 text-emerald-950 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function Plaque({
  data, pos, draft, editing, dim, onClick,
}: { data: SceneSide; pos: { left: number; top: number }; draft: string; editing: boolean; dim: boolean; onClick: () => void }) {
  const adopted = data.status === "adopted";
  const text = adopted ? data.plaque_text ?? "" : draft;
  const ghost = !adopted && !editing && !draft;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={adopted}
      title={adopted ? `Adopted by ${data.donor_name}` : "Adopt this plaque"}
      className={`plaque absolute overflow-hidden transition-[opacity,box-shadow,filter] duration-500 ${
        adopted ? "cursor-default" : "cursor-pointer"
      } ${ghost ? "plaque-ghost" : ""} ${dim ? "opacity-60" : "opacity-100"} ${editing ? "plaque-editing" : ""}`}
      style={{
        left: `${pos.left}%`,
        top: `${pos.top}%`,
        width: `${PLAQUE.w}%`,
        height: `${PLAQUE.h}%`,
        transform: "translate(-50%, -50%) perspective(700px) rotateX(5deg)",
      }}
    >
      <span className="plaque-screw" style={{ left: "5%", top: "16%" }} />
      <span className="plaque-screw" style={{ right: "5%", top: "16%" }} />
      <span className="plaque-screw" style={{ left: "5%", bottom: "16%" }} />
      <span className="plaque-screw" style={{ right: "5%", bottom: "16%" }} />
      <span className="absolute inset-[9%_11%] flex items-center justify-center">
        {ghost ? (
          <span className="plaque-text whitespace-nowrap text-[0.9cqw] uppercase tracking-[0.22em]">
            Your plaque here
          </span>
        ) : (
          <pre className="plaque-text max-h-full whitespace-pre-wrap break-words text-center text-[0.74cqw] leading-[1.22]">
            {text || " "}
          </pre>
        )}
      </span>
    </button>
  );
}
