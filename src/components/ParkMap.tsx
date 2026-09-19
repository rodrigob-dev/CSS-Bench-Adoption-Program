"use client";

import { CRS, type LatLngBoundsExpression, type LatLngTuple } from "leaflet";
import { useRouter } from "next/navigation";
import { CircleMarker, MapContainer, Polygon, Polyline, Rectangle, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { PARK, polygonBounds, type XY } from "@/lib/park";
import type { AreaSummary, Bench } from "@/lib/types";
import { PIN, STATUS_LABEL } from "./status";

/** Park coordinates are (x, y); Leaflet's CRS.Simple wants [y, x]. */
const ll = ([x, y]: XY): LatLngTuple => [y, x];
const llPath = (p: XY[]) => p.map(ll);
const PARK_BOUNDS: LatLngBoundsExpression = [[0, 0], [PARK.height, PARK.width]];

type Props = {
  benches: Bench[];
  areas: AreaSummary[];
  /** Area to frame; omit to show the whole park. */
  focusArea?: string;
  /** Bench to frame and highlight. */
  focusBench?: string;
  hoveredArea?: string | null;
  onHoverArea?: (id: string | null) => void;
  /** Whether area zones are clickable (home) or just outlines (area/bench pages). */
  areasClickable?: boolean;
};

/**
 * Schematic park map. Every bench is a pin: blue = open, hollow = one side
 * open, grey = adopted, dashed = pre-approved spot for a new bench.
 */
export default function ParkMap({
  benches,
  areas,
  focusArea,
  focusBench,
  hoveredArea = null,
  onHoverArea,
  areasClickable = false,
}: Props) {
  const router = useRouter();
  const byId = new Map(areas.map((a) => [a.id, a]));

  let bounds: LatLngBoundsExpression = PARK_BOUNDS;
  if (focusBench) {
    const b = benches.find((x) => x.id === focusBench);
    if (b) bounds = [[b.pos_y - 70, b.pos_x - 110], [b.pos_y + 70, b.pos_x + 110]];
  } else if (focusArea) {
    const area = PARK.areas.find((a) => a.id === focusArea);
    if (area) {
      const [[x0, y0], [x1, y1]] = polygonBounds(area.polygon);
      bounds = [[y0 - 15, x0 - 15], [y1 + 15, x1 + 15]];
    }
  }

  return (
    <MapContainer
      crs={CRS.Simple}
      bounds={bounds}
      boundsOptions={{ padding: [10, 10] }}
      maxBounds={[[-40, -40], [PARK.height + 40, PARK.width + 40]]}
      maxBoundsViscosity={1}
      minZoom={-1}
      maxZoom={3}
      zoomSnap={0}
      zoomDelta={0.5}
      scrollWheelZoom={false}
      attributionControl={false}
      preferCanvas
      className="h-full w-full"
      style={{ background: "#dfe9d6" }}
    >
      {/* ground */}
      <Rectangle bounds={PARK_BOUNDS} pathOptions={{ color: "#a7b99a", weight: 2, fillColor: "#e7efdf", fillOpacity: 1 }} interactive={false} />

      {/* area zones */}
      {PARK.areas.map((a) => {
        const active = hoveredArea === a.id;
        const dim = focusArea && focusArea !== a.id;
        return (
          <Polygon
            key={a.id}
            positions={llPath(a.polygon)}
            pathOptions={{
              color: active ? "#1e40af" : "#8fa385",
              weight: active ? 2.5 : 1,
              dashArray: active ? undefined : "4 4",
              fillColor: active ? "#bfdbfe" : "#f3f7ee",
              fillOpacity: dim ? 0.2 : active ? 0.55 : 0.7,
            }}
            interactive={areasClickable}
            eventHandlers={
              areasClickable
                ? {
                    click: () => router.push(`/areas/${a.id}`),
                    mouseover: () => onHoverArea?.(a.id),
                    mouseout: () => onHoverArea?.(null),
                  }
                : undefined
            }
          >
            {!focusBench && (
              <Tooltip permanent direction="center" className="area-label" interactive={false}>
                <span className="area-label__name">{a.short}</span>
                {byId.get(a.id) && (
                  <span className="area-label__count">{byId.get(a.id)!.sides_open} open</span>
                )}
              </Tooltip>
            )}
          </Polygon>
        );
      })}

      {/* lake */}
      <Polygon positions={llPath(PARK.lake)} pathOptions={{ color: "#7fb0d8", weight: 1.5, fillColor: "#b7d4ec", fillOpacity: 1 }} interactive={false} />

      {/* paths */}
      {PARK.mainPaths.map((p, i) => (
        <Polyline key={`m${i}`} positions={llPath(p)} pathOptions={{ color: "#d6cbb3", weight: 6, lineCap: "round" }} interactive={false} />
      ))}
      {PARK.areas.flatMap((a) =>
        a.paths.map((p, i) => (
          <Polyline key={`${a.id}${i}`} positions={llPath(p)} pathOptions={{ color: "#d6cbb3", weight: 3.5, lineCap: "round" }} interactive={false} />
        )),
      )}

      {/* benches */}
      {benches.map((b) => {
        const selected = b.id === focusBench;
        const pin = PIN[b.status];
        const dim = focusArea && b.area_id !== focusArea;
        return (
          <CircleMarker
            key={b.id}
            center={[b.pos_y, b.pos_x]}
            radius={selected ? 9 : focusArea || focusBench ? 6.5 : 4.5}
            pathOptions={{
              color: selected ? "#111827" : pin.color,
              fillColor: pin.fillColor,
              fillOpacity: dim ? 0.3 : 1,
              opacity: dim ? 0.3 : 1,
              weight: selected ? 3 : b.installed ? 1.5 : 2,
              dashArray: b.installed ? undefined : "2 2",
            }}
            eventHandlers={{ click: () => router.push(`/benches/${b.id}`) }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1}>
              <div className="text-xs">
                <div className="font-mono font-semibold">{b.id}</div>
                <div>
                  {b.installed ? `${b.size_ft} ft · ${STATUS_LABEL[b.status]}` : `New bench spot · ${STATUS_LABEL[b.status]}`}
                </div>
                {b.sides
                  .filter((s) => s.side_status === "adopted")
                  .map((s) => (
                    <div key={s.side} className="text-gray-600">
                      Side {s.side}: {s.donor_name}
                    </div>
                  ))}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
