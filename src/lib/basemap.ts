import type { Feature, FeatureCollection, Polygon, LineString, Point } from "geojson";
import { PARK, type XY } from "./park";
import { ring, toLngLat } from "./geo";

/**
 * Everything the map draws besides benches: the city around the park, the
 * park itself, lawns, the river, the lake, paths and tree canopy. Generated
 * once from the layout in park.ts with a seeded PRNG, so it is stable.
 */

/** mulberry32 — tiny seeded PRNG so the "random" trees never move. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const poly = (coords: XY[], props: Record<string, unknown>): Feature<Polygon> => ({
  type: "Feature",
  properties: props,
  geometry: { type: "Polygon", coordinates: ring(coords) },
});
const line = (coords: XY[], props: Record<string, unknown>): Feature<LineString> => ({
  type: "Feature",
  properties: props,
  geometry: { type: "LineString", coordinates: coords.map(toLngLat) },
});
const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/** A polygon band of ±half around a centreline (good enough for a river). */
function band(center: XY[], half: number): XY[] {
  const left: XY[] = [], right: XY[] = [];
  for (let i = 0; i < center.length; i++) {
    const a = center[Math.max(0, i - 1)], b = center[Math.min(center.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    left.push([center[i][0] + nx * half, center[i][1] + ny * half]);
    right.push([center[i][0] - nx * half, center[i][1] - ny * half]);
  }
  return [...left, ...right.reverse()];
}

function pointInPolygon([x, y]: XY, p: XY[]) {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const W = PARK.width, H = PARK.height;
const CITY: [number, number, number, number] = [-700, -520, 1700, 1250];
const river: XY[] = [[-140, -520], [-120, -200], [-160, 120], [-110, 420], [-150, 700], [-100, 950], [-140, 1250]];

export const STREETS: { name: string; at: XY; rotate?: number }[] = [
  { name: "Park Row", at: [500, -38] },
  { name: "Hilltop Road", at: [500, 738] },
  { name: "Meadow Street", at: [1040, 350], rotate: -90 },
  { name: "Riverside Drive", at: [-40, 350], rotate: -90 },
];

export function buildBasemap() {
  const rnd = prng(42);
  const ground: Feature[] = [poly(rect(...CITY), { kind: "city" })];
  const roads: Feature[] = [];
  const blocks: Feature[] = [];
  const buildings: Feature[] = [];

  // street grid around the park; the park occupies one super-block
  const xs = [-700, -500, -300, -60, W + 60, W + 300, W + 500, 1700];
  const ys = [-520, -340, -160, -40, H + 40, H + 220, H + 400, H + 550];
  for (const x of xs.slice(1, -1)) roads.push(line([[x, CITY[1]], [x, CITY[3]]], { major: x === -60 || x === W + 60 }));
  for (const y of ys.slice(1, -1)) roads.push(line([[CITY[0], y], [CITY[2], y]], { major: y === -40 || y === H + 40 }));

  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x0 = xs[i] + 12, x1 = xs[i + 1] - 12, y0 = ys[j] + 12, y1 = ys[j + 1] - 12;
      if (x1 > -60 && x0 < W + 60 && y1 > -40 && y0 < H + 40) continue; // the park
      if (x1 < -60 && x0 < -60 && x1 > -200) continue;                     // the river bank
      blocks.push(poly(rect(x0, y0, x1, y1), { kind: "block" }));
      const cols = 2 + Math.floor(rnd() * 3), rows = 2 + Math.floor(rnd() * 2);
      const cw = (x1 - x0) / cols, rh = (y1 - y0) / rows;
      for (let c = 0; c < cols; c++)
        for (let r = 0; r < rows; r++)
          if (rnd() > 0.15) buildings.push(poly(rect(x0 + c * cw + 8, y0 + r * rh + 8, x0 + (c + 1) * cw - 8, y0 + (r + 1) * rh - 8), { kind: "building" }));
    }
  }

  const water: Feature[] = [poly(band(river, 26), { kind: "river" }), poly(PARK.lake, { kind: "lake" })];
  const park: Feature[] = [poly(rect(-20, -20, W + 20, H + 20), { kind: "park" })];
  const lawns: Feature[] = PARK.areas.map((a) => poly(a.polygon, { kind: "lawn", area: a.id }));
  const paths: Feature[] = [
    ...PARK.mainPaths.map((p) => line(p, { major: true })),
    ...PARK.areas.flatMap((a) => a.paths.map((p) => line(p, { major: false }))),
  ];

  // tree canopy: dense in the wooded areas, a sprinkle elsewhere
  const trees: Feature<Point>[] = [];
  const density: Record<string, number> = { "north-woods": 90, "old-oak-grove": 45, "picnic-groves": 50, "hilltop-overlook": 30 };
  for (const a of PARK.areas) {
    const n = density[a.id] ?? 8;
    const xsA = a.polygon.map((p) => p[0]), ysA = a.polygon.map((p) => p[1]);
    let placed = 0, tries = 0;
    while (placed < n && tries++ < n * 20) {
      const p: XY = [Math.min(...xsA) + rnd() * (Math.max(...xsA) - Math.min(...xsA)), Math.min(...ysA) + rnd() * (Math.max(...ysA) - Math.min(...ysA))];
      if (!pointInPolygon(p, a.polygon)) continue;
      trees.push({ type: "Feature", properties: { r: 5 + rnd() * 7 }, geometry: { type: "Point", coordinates: toLngLat(p) } });
      placed++;
    }
  }

  const fc = (features: Feature[]): FeatureCollection => ({ type: "FeatureCollection", features });
  return { ground: fc(ground), blocks: fc(blocks), buildings: fc(buildings), roads: fc(roads), park: fc(park), lawns: fc(lawns), water: fc(water), paths: fc(paths), trees: fc(trees) };
}
