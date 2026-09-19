"use client";

import { useRouter } from "next/navigation";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { AreaSummary } from "@/lib/types";
import { areaColor } from "./status";

const PARK_CENTER: [number, number] = [40.8945, -73.888];

/**
 * Areas are the navigation layer: one marker per area, sized by bench count
 * and coloured by how many sides are still open. Clicking opens the area.
 */
export default function ParkMap({ areas }: { areas: AreaSummary[] }) {
  const router = useRouter();
  return (
    <MapContainer center={PARK_CENTER} zoom={14} scrollWheelZoom={false} className="rounded-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {areas.map((a) => (
        <CircleMarker
          key={a.id}
          center={[a.lat, a.lng]}
          radius={10 + Math.sqrt(a.benches_total) * 2}
          pathOptions={{
            color: areaColor(a.sides_open, a.sides_total),
            fillColor: areaColor(a.sides_open, a.sides_total),
            fillOpacity: 0.45,
            weight: 2,
          }}
          eventHandlers={{ click: () => router.push(`/areas/${a.id}`) }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <div className="text-sm">
              <div className="font-semibold">{a.name}</div>
              <div>
                {a.sides_open} of {a.sides_total} sides open · {a.benches_total} benches
              </div>
              {a.slots_open > 0 && <div>{a.slots_open} spots for a new bench</div>}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
