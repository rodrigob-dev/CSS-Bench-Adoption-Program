"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Layer, Marker, Popup, Source, type MapRef } from "react-map-gl/maplibre";
import type { Map as MapLibreMap, MapLayerMouseEvent, MapLibreEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { buildBasemap, STREETS } from "@/lib/basemap";
import { bboxOf, centroid, toLngLat } from "@/lib/geo";
import { PARK } from "@/lib/park";
import type { AreaSummary, Bench } from "@/lib/types";
import { STATUS_LABEL } from "./status";

type Props = {
  benches: Bench[];
  areas: AreaSummary[];
  /** Area to frame (animated); undefined = whole park. */
  focusArea?: string | null;
  /** Bench to frame and ring. */
  focusBench?: string;
  hoveredArea?: string | null;
  onHoverArea?: (id: string | null) => void;
  onSelectArea?: (id: string) => void;
  onSelectBench?: (id: string) => void;
  areasClickable?: boolean;
};

const PARK_BBOX = bboxOf([[0, 0], [PARK.width, PARK.height]]);
const CITY = bboxOf([[-700, -520], [1700, 1250]]);
const CITY_BBOX: [number, number, number, number] = [CITY[0][0], CITY[0][1], CITY[1][0], CITY[1][1]];
const EASE = { duration: 1600, essential: true } as const;
const BASE_STYLE = {
  version: 8 as const,
  sources: {},
  layers: [{ id: "bg", type: "background" as const, paint: { "background-color": "#eef0e9" } }],
};

/** Bench pin icons drawn on a canvas so the symbol layer needs no sprite. */
function makeIcons(map: MapLibreMap) {
  const size = 44, r = 15, c = size / 2;
  const draw = (fn: (ctx: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    fn(ctx);
    return ctx.getImageData(0, 0, size, size);
  };
  const disc = (ctx: CanvasRenderingContext2D, fill: string, stroke: string, dashed = false) => {
    ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = "#ffffff"; ctx.stroke();
    ctx.beginPath(); ctx.arc(c, c, r - 3, 0, Math.PI * 2);
    ctx.lineWidth = 3; ctx.strokeStyle = stroke; if (dashed) ctx.setLineDash([4, 3]); ctx.stroke();
  };
  const icons: Record<string, ImageData> = {
    open: draw((ctx) => disc(ctx, "#2563eb", "#1e40af")),
    partial: draw((ctx) => {
      disc(ctx, "#ffffff", "#1e40af");
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, c, size); ctx.clip();
      ctx.beginPath(); ctx.arc(c, c, r - 4, 0, Math.PI * 2); ctx.fillStyle = "#2563eb"; ctx.fill(); ctx.restore();
    }),
    full: draw((ctx) => disc(ctx, "#9ca3af", "#6b7280")),
    slot: draw((ctx) => disc(ctx, "#ffffff", "#1e40af", true)),
    "slot-full": draw((ctx) => disc(ctx, "#e5e7eb", "#6b7280", true)),
  };
  for (const [name, data] of Object.entries(icons)) {
    if (!map.hasImage(name)) map.addImage(name, data, { pixelRatio: 2 });
  }
}

export default function ParkMap({
  benches, areas, focusArea = null, focusBench, hoveredArea = null,
  onHoverArea, onSelectArea, onSelectBench, areasClickable = false,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const [ready, setReady] = useState(false);
  const [hoverBench, setHoverBench] = useState<Bench | null>(null);
  const basemap = useMemo(() => buildBasemap(), []);
  const byId = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);

  const benchGeo = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: benches.map((b) => ({
        type: "Feature" as const,
        id: b.id,
        properties: {
          id: b.id,
          area_id: b.area_id,
          status: b.status,
          icon: b.installed ? b.status : b.status === "full" ? "slot-full" : "slot",
          open: b.status !== "full",
        },
        geometry: { type: "Point" as const, coordinates: toLngLat([b.pos_x, b.pos_y]) },
      })),
    }),
    [benches],
  );

  // camera --------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (focusBench) {
      const b = benches.find((x) => x.id === focusBench);
      if (b) map.flyTo({ center: toLngLat([b.pos_x, b.pos_y]), zoom: 18.6, pitch: 55, bearing: -20, ...EASE });
      return;
    }
    if (focusArea) {
      const area = PARK.areas.find((a) => a.id === focusArea);
      if (area) map.fitBounds(bboxOf(area.polygon), { padding: 48, pitch: 48, bearing: -12, ...EASE });
      return;
    }
    map.fitBounds(PARK_BBOX, { padding: 24, pitch: 0, bearing: 0, ...EASE });
  }, [focusArea, focusBench, ready, benches]);

  // pulse the open benches of the focused area --------------------------
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !ready || !focusArea || focusBench) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = (Math.sin((t - t0) / 380) + 1) / 2; // 0..1
      if (map.getLayer("bench-pulse")) {
        map.setPaintProperty("bench-pulse", "circle-radius", 10 + k * 10);
        map.setPaintProperty("bench-pulse", "circle-opacity", 0.45 - k * 0.4);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [focusArea, focusBench, ready]);

  // interaction ---------------------------------------------------------
  const onLoad = useCallback((e: MapLibreEvent) => {
    makeIcons(e.target);
    if (process.env.NODE_ENV !== "production") (window as unknown as { __parkMap?: MapLibreMap }).__parkMap = e.target;
    setReady(true);
  }, []);

  const onMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      const map = mapRef.current?.getMap();
      if (map) map.getCanvas().style.cursor = f ? "pointer" : "";
      if (f?.layer.id === "benches") {
        setHoverBench(benches.find((b) => b.id === f.properties.id) ?? null);
        onHoverArea?.(null);
      } else {
        setHoverBench(null);
        onHoverArea?.(f?.layer.id === "lawns" ? (f.properties.area as string) : null);
      }
    },
    [benches, onHoverArea],
  );

  const onClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      if (f.layer.id === "benches") onSelectBench?.(f.properties.id as string);
      else if (f.layer.id === "lawns" && areasClickable) onSelectArea?.(f.properties.area as string);
    },
    [areasClickable, onSelectArea, onSelectBench],
  );

  const showLabels = !focusBench;
  const dimOthers = Boolean(focusArea) && !focusBench;

  return (
    <MapGL
      ref={mapRef}
      initialViewState={{ bounds: PARK_BBOX, fitBoundsOptions: { padding: 24 } }}
      mapStyle={BASE_STYLE}
      maxBounds={CITY_BBOX}
      minZoom={13.5}
      maxZoom={19.5}
      attributionControl={false}
      interactiveLayerIds={ready ? ["benches", ...(areasClickable ? ["lawns"] : [])] : []}
      onLoad={onLoad}
      onMouseMove={onMouseMove}
      onMouseLeave={() => { setHoverBench(null); onHoverArea?.(null); }}
      onClick={onClick}
      style={{ width: "100%", height: "100%" }}
    >
      {/* city */}
      <Source id="ground" type="geojson" data={basemap.ground}><Layer id="ground" type="fill" paint={{ "fill-color": "#f1efe9" }} /></Source>
      <Source id="blocks" type="geojson" data={basemap.blocks}><Layer id="blocks" type="fill" paint={{ "fill-color": "#e8e6df" }} /></Source>
      <Source id="buildings" type="geojson" data={basemap.buildings}>
        <Layer id="buildings" type="fill" paint={{ "fill-color": "#dedbd2", "fill-outline-color": "#cfcbc0" }} />
      </Source>
      <Source id="roads" type="geojson" data={basemap.roads}>
        <Layer id="roads-casing" type="line" paint={{ "line-color": "#d6d2c8", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 14, 3, 18, 22] }} layout={{ "line-cap": "round" }} />
        <Layer id="roads" type="line" paint={{ "line-color": ["case", ["get", "major"], "#fdf3d0", "#ffffff"], "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 14, 2, 18, 18] }} layout={{ "line-cap": "round" }} />
      </Source>

      {/* park */}
      <Source id="park" type="geojson" data={basemap.park}>
        <Layer id="park" type="fill" paint={{ "fill-color": "#d5e8c8", "fill-outline-color": "#b4cca5" }} />
      </Source>
      <Source id="lawns" type="geojson" data={basemap.lawns}>
        <Layer
          id="lawns"
          type="fill"
          paint={{
            "fill-color": ["case", ["==", ["get", "area"], hoveredArea ?? ""], "#c7dcff", ["==", ["get", "area"], focusArea ?? ""], "#e6f2da", "#deedd0"],
            "fill-opacity": dimOthers ? ["case", ["==", ["get", "area"], focusArea ?? ""], 1, 0.55] : 1,
          }}
        />
        <Layer id="lawns-outline" type="line" paint={{ "line-color": "#9fbb8f", "line-width": 1.2, "line-dasharray": [3, 2] }} />
      </Source>
      <Source id="water" type="geojson" data={basemap.water}>
        <Layer id="water" type="fill" paint={{ "fill-color": "#b9d8f2", "fill-outline-color": "#93bde3" }} />
      </Source>
      <Source id="paths" type="geojson" data={basemap.paths}>
        <Layer id="paths-casing" type="line" paint={{ "line-color": "#c9b993", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 14, 2.5, 18, 14] }} layout={{ "line-cap": "round", "line-join": "round" }} />
        <Layer id="paths" type="line" paint={{ "line-color": "#f4ecd8", "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 14, 1.2, 18, 10] }} layout={{ "line-cap": "round", "line-join": "round" }} />
      </Source>
      <Source id="trees" type="geojson" data={basemap.trees}>
        <Layer
          id="trees"
          type="circle"
          paint={{
            "circle-color": "#9ccc86",
            "circle-stroke-color": "#7fb069",
            "circle-stroke-width": 1,
            "circle-opacity": 0.9,
            "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 14, ["/", ["get", "r"], 7.2], 19, ["/", ["get", "r"], 0.22]],
          }}
        />
      </Source>

      {/* benches */}
      <Source id="benches" type="geojson" data={benchGeo}>
        {focusArea && !focusBench && (
          <Layer
            id="bench-pulse"
            type="circle"
            filter={["all", ["==", ["get", "area_id"], focusArea], ["get", "open"]]}
            paint={{ "circle-color": "#3b82f6", "circle-radius": 12, "circle-opacity": 0.3, "circle-blur": 0.6 }}
          />
        )}
        {focusBench && (
          <Layer
            id="bench-ring"
            type="circle"
            filter={["==", ["get", "id"], focusBench]}
            paint={{ "circle-color": "#111827", "circle-opacity": 0, "circle-radius": 18, "circle-stroke-color": "#111827", "circle-stroke-width": 3 }}
          />
        )}
        {ready && (
          <Layer
            id="benches"
            type="symbol"
            layout={{
              "icon-image": ["get", "icon"],
              "icon-size": ["interpolate", ["linear"], ["zoom"], 14, 0.32, 16, 0.55, 18, 0.95],
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
            }}
            paint={{ "icon-opacity": dimOthers ? ["case", ["==", ["get", "area_id"], focusArea ?? ""], 1, 0.3] : 1 }}
          />
        )}
      </Source>

      {/* labels */}
      {showLabels &&
        PARK.areas.map((a) => {
          const [x, y] = centroid(a.polygon);
          const [lng, lat] = toLngLat([x, y]);
          const s = byId.get(a.id);
          const dim = dimOthers && a.id !== focusArea;
          return (
            <Marker key={a.id} longitude={lng} latitude={lat} anchor="center" style={{ pointerEvents: "none" }}>
              <div className={`text-center leading-tight transition-opacity ${dim ? "opacity-40" : ""}`}>
                <div className="text-[11px] font-semibold text-emerald-950 [text-shadow:0_0_3px_#fff,0_0_3px_#fff,0_0_6px_#fff]">{a.short}</div>
                {s && <div className="text-[10px] text-blue-800 [text-shadow:0_0_3px_#fff,0_0_3px_#fff]">{s.sides_open} open</div>}
              </div>
            </Marker>
          );
        })}
      {showLabels && !focusArea &&
        STREETS.map((st) => {
          const [lng, lat] = toLngLat(st.at);
          return (
            <Marker key={st.name} longitude={lng} latitude={lat} anchor="center" style={{ pointerEvents: "none" }}>
              <div className="whitespace-nowrap text-[9px] uppercase tracking-wider text-gray-500" style={{ transform: st.rotate ? `rotate(${st.rotate}deg)` : undefined }}>
                {st.name}
              </div>
            </Marker>
          );
        })}

      {hoverBench && (
        <Popup longitude={toLngLat([hoverBench.pos_x, hoverBench.pos_y])[0]} latitude={toLngLat([hoverBench.pos_x, hoverBench.pos_y])[1]} anchor="bottom" offset={14} closeButton={false} closeOnClick={false}>
          <div className="text-xs">
            <div className="font-mono font-semibold">{hoverBench.id}</div>
            <div>{hoverBench.installed ? `${hoverBench.size_ft} ft · ${STATUS_LABEL[hoverBench.status]}` : `Spot for a new bench · ${STATUS_LABEL[hoverBench.status]}`}</div>
            {hoverBench.sides.filter((s) => s.side_status === "adopted").map((s) => (
              <div key={s.side} className="text-gray-600">{hoverBench.sides.length > 1 ? (s.side === "A" ? "Left" : "Right") : "Plaque"}: {s.donor_name}</div>
            ))}
          </div>
        </Popup>
      )}
    </MapGL>
  );
}
