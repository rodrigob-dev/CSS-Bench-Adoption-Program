import type { XY } from "./park";

/**
 * Park-local metres → lng/lat. The park is fictional, so it is pinned to an
 * arbitrary origin; the map renders only our own geometry, never real tiles.
 * A real survey would store lng/lat directly and skip this.
 */
const ORIGIN = { lat: 40.895, lng: -73.895 };
const M_PER_DEG_LAT = 111_320;
const M_PER_DEG_LNG = 111_320 * Math.cos((ORIGIN.lat * Math.PI) / 180);

export const toLngLat = ([x, y]: XY): [number, number] => [
  ORIGIN.lng + x / M_PER_DEG_LNG,
  ORIGIN.lat + y / M_PER_DEG_LAT,
];

export const ring = (poly: XY[]) => [[...poly, poly[0]].map(toLngLat)];

export function bboxOf(poly: XY[]): [[number, number], [number, number]] {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return [toLngLat([Math.min(...xs), Math.min(...ys)]), toLngLat([Math.max(...xs), Math.max(...ys)])];
}

export function centroid(poly: XY[]): XY {
  const n = poly.length;
  return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n];
}
