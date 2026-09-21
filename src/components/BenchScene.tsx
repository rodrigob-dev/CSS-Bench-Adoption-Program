"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { sceneFor } from "@/lib/scenes";
import type { Side } from "@/lib/types";

export type SceneSide = {
  side: Side;
  status: "open" | "adopted" | "held" | "pending";
  /** A hold that belongs to this browser behaves like open (resume editing). */
  mine?: boolean;
  donor_name?: string | null;
  honoree_name?: string | null;
  plaque_text?: string | null;
};

type Props = {
  benchId: string;
  sides: SceneSide[];
  /** area id; picks the photograph */
  areaId: string;
  draft?: string;
  editingSide?: Side | null;
  /** Not-yet-installed spot: outline where the bench will go. */
  ghostBench?: boolean;
  /** Start on a plaque instead of the whole bench (deep link). */
  initialView?: Side;
  onPlaqueClick?: (side: Side) => void;
  onPickSide?: (side: Side | null) => void;
};

type View = "overview" | Side;
const EASE = "transition-transform";

/**
 * A real photograph of a bench in this kind of area, with the plaques drawn
 * on its top rail. The "camera" is a CSS transform on the whole photo:
 * overview → slide to a plaque → zoom in to edit it.
 */
export function BenchScene({ benchId, sides, areaId, draft = "", editingSide = null, ghostBench = false, initialView, onPlaqueClick, onPickSide }: Props) {
  const scene = sceneFor(areaId);
  const single = sides.length === 1;
  const [view, setView] = useState<View>(editingSide ?? initialView ?? "overview");
  // Editing starts with a beat on the whole bench (so you see what you are
  // adopting), then the camera glides onto the plaque.
  const [settled, setSettled] = useState(false);
  const [cinematic, setCinematic] = useState(false); // only the first glide after opening the form is slow
  useEffect(() => {
    if (!editingSide) { setSettled(false); setCinematic(false); return; }
    setView("overview");
    setSettled(false);
    const t1 = window.setTimeout(() => { setView(editingSide); setSettled(true); setCinematic(true); }, 650);
    const t2 = window.setTimeout(() => setCinematic(false), 650 + 2300);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [editingSide]);
  const zoomed = editingSide !== null && settled && view === editingSide;
  // the glide onto the plaque when adopting is slow, easing in and out; every
  // other move (slides, zooming out, coming back) is quick and starts at full speed
  const duration = cinematic ? "2200ms" : "700ms";
  const easing = cinematic ? "cubic-bezier(0.4, 0.02, 0.15, 1)" : "cubic-bezier(0.1, 0.7, 0.25, 1)";

  const anchor = (side: Side) => (single ? scene.plaques.single : scene.plaques[side]);
  const [bx0, by0, bx1, by1] = scene.bench;
  const benchCentre: [number, number] = [(bx0 + bx1) / 2, (by0 + by1) / 2];

  // camera: focus point (% of image) and scale per view
  const focus: [number, number] = view === "overview" ? benchCentre : anchor(view);
  const benchSpan = Math.max(bx1 - bx0, ((by1 - by0) / 100) * scene.aspect * 100 * 0.6);
  const overviewScale = Math.min(1.35, Math.max(1, 70 / benchSpan)); // frame the bench, never crop past the photo much
  // zoom so a plaque fills about a third of the frame while editing, whatever its size in the photo
  const editScale = Math.min(6, Math.max(2.8, 30 / scene.plaqueSize[0]));
  const sideScale = Math.min(3.2, Math.max(1.6, editScale * 0.5));
  const camScale = zoomed ? editScale : view === "overview" ? overviewScale : sideScale;
  // never pan past the photo's edge: |t| ≤ 50·(scale − 1)
  const limit = 50 * (camScale - 1);
  const clamp = (v: number) => Math.max(-limit, Math.min(limit, v));
  const tx = clamp((50 - focus[0]) * camScale);
  const ty = clamp((50 - focus[1]) * camScale - (zoomed ? 8 : 0)); // editing: plaque a little above centre

  const go = (v: View) => {
    setView(v);
    onPickSide?.(v === "overview" ? null : v);
  };

  return (
    <div className="@container relative select-none overflow-hidden rounded-2xl bg-forest-deep shadow-lg">
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: scene.aspect }}>
        <div className={`absolute inset-0 ${EASE}`} style={{ transform: `translate(${tx}%, ${ty}%) scale(${camScale})`, transformOrigin: "50% 50%", transitionDuration: duration, transitionTimingFunction: easing }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={scene.src} alt="" className={`block h-full w-full object-cover ${ghostBench ? "saturate-[0.6]" : ""}`} draggable={false} />
          {ghostBench && (
            <div
              className="absolute rounded-lg border-2 border-dashed border-white/90 bg-white/10"
              style={{ left: `${bx0}%`, top: `${by0}%`, width: `${bx1 - bx0}%`, height: `${by1 - by0}%` }}
            >
              <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-white/90 px-2 py-0.5 text-[0.9cqw] font-semibold text-forest-deep">
                A new bench goes here
              </span>
            </div>
          )}
            {/* plaques ride inside the scaled photo so they move in perfect sync with it */}
          {sides.map((s) => (
            <Plaque
              key={s.side}
              data={s}
              centre={anchor(s.side)}
              size={scene.plaqueSize}
              draft={editingSide === s.side ? draft : ""}
              editing={editingSide === s.side}
              dim={view !== "overview" && view !== s.side}
              onClick={() => {
                if (s.status === "adopted" || s.status === "pending" || (s.status === "held" && !s.mine)) return;
                if (editingSide === s.side) { setView(s.side); return; } // already adopting it: just come back, quickly
                // otherwise no camera move here: the editing effect runs the beat + glide once the plaque is held
                onPlaqueClick?.(s.side);
              }}
            />
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 text-sm">
        <Ctl onClick={() => go("A")} active={view === "A"}>{single ? "Plaque" : "Left plaque"}</Ctl>
        <Ctl onClick={() => go("overview")} active={view === "overview"}><span className="font-mono text-xs">{benchId}</span></Ctl>
        {!single && <Ctl onClick={() => go("B")} active={view === "B"}>Right plaque</Ctl>}
      </div>
      <span className="pointer-events-none absolute bottom-3 right-3 text-[10px] text-white/60">Photo: {scene.credit}</span>
    </div>
  );
}

function Ctl({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pointer-events-auto rounded-full px-3 py-1.5 font-semibold shadow-md backdrop-blur ${
        active ? "bg-forest-deep text-white" : "bg-white/90 text-forest-deep hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function Plaque({
  data, centre, size, draft, editing, dim, onClick,
}: { data: SceneSide; centre: [number, number]; size: [number, number]; draft: string; editing: boolean; dim: boolean; onClick: () => void }) {
  const adopted = data.status === "adopted" || (data.status === "pending" && data.mine);
  const heldByOther = (data.status === "held" && !data.mine) || (data.status === "pending" && !data.mine);
  const text = adopted ? data.plaque_text ?? "" : draft;
  const ghost = !adopted && !heldByOther && !editing && !draft;
  const label = ghost ? "Your plaque here" : heldByOther ? "Not available" : text;

  const ref = useRef<HTMLButtonElement>(null);
  const [box, setBox] = useState<[number, number]>([120, 40]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox([e.contentRect.width, e.contentRect.height]));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Size the type to the plate by measuring the real glyphs: lay the text out
  // at a fixed base size, then scale it so no line spills past the plate and
  // all lines fit its height. A two-line dedication reads large, seven lines
  // read small. Scaling (rather than tiny font sizes) keeps the glyphs crisp
  // under the camera zoom and never hits the browser's minimum font size.
  const preRef = useRef<HTMLPreElement>(null);
  useLayoutEffect(() => {
    const el = preRef.current, plate = ref.current;
    if (!el || !plate) return;
    const BASE = 48;
    el.style.fontSize = `${BASE}px`;
    el.style.transform = "none";
    const w = el.scrollWidth || 1, h = el.scrollHeight || 1;
    const s = Math.min(
      (plate.clientWidth * 0.9) / w,
      (plate.clientHeight * 0.86) / h,
      (plate.clientHeight * 0.55) / BASE, // a single short word still shouldn't fill the plate
    );
    el.style.transform = `scale(${s})`;
  }, [label, box]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={adopted || heldByOther}
      title={data.status === "pending" ? (data.mine ? "Your request is waiting for approval" : "Not available") : adopted ? `Adopted by ${data.donor_name}` : heldByOther ? "Not available right now" : "Adopt this plaque"}
      className={`plaque absolute flex items-center justify-center overflow-hidden transition-[opacity,box-shadow] duration-500 ${
        adopted ? "cursor-default" : "cursor-pointer"
      } ${ghost ? "plaque-ghost" : ""} ${heldByOther || data.status === "pending" ? "plaque-held" : ""} ${dim ? "opacity-60" : "opacity-100"} ${editing ? "plaque-editing" : ""}`}
      style={{
        left: `${centre[0]}%`,
        top: `${centre[1]}%`,
        width: `${size[0]}%`,
        height: `${size[1]}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <span className="plaque-screw" style={{ left: "4%", top: "14%" }} />
      <span className="plaque-screw" style={{ right: "4%", top: "14%" }} />
      <span className="plaque-screw" style={{ left: "4%", bottom: "14%" }} />
      <span className="plaque-screw" style={{ right: "4%", bottom: "14%" }} />
      <pre
        ref={preRef}
        className={`plaque-text shrink-0 origin-center whitespace-pre text-center leading-[1.15] ${ghost || heldByOther ? "uppercase tracking-[0.18em]" : ""}`}
      >
        {label || " "}
      </pre>
    </button>
  );
}
