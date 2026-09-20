/**
 * One real photograph per area, with a bench in it. The plaques are drawn on
 * top at measured positions (percent of the image), so each scene is a
 * coherent photo rather than a cut-out pasted on a background.
 */
export type Scene = {
  src: string;
  /** image aspect ratio, width / height */
  aspect: number;
  credit: string;
  /** plaque centres, % of image; `single` is used by 4 ft benches */
  plaques: { A: [number, number]; B: [number, number]; single: [number, number] };
  /** plaque width as % of image width, height as % of image height */
  plaqueSize: [number, number];
  /** bounding box of the bench, % of image (x0, y0, x1, y1), for framing */
  bench: [number, number, number, number];
};

/** Keyed by area id (src/lib/park.ts). */
export const SCENES: Record<string, Scene> = {
  "great-lawn": {
    src: "/bench/scenes/great-lawn.jpg", aspect: 2400 / 1600, credit: "Engina Kyurt / Pexels",
    plaques: { A: [32, 24.3], B: [70, 24.3], single: [51, 24.3] }, plaqueSize: [8, 3.4], bench: [10, 20, 92, 83],
  },
  "willow-lake": {
    src: "/bench/scenes/willow-lake.jpg", aspect: 1958 / 1474, credit: "Michael Bitter / Pexels",
    plaques: { A: [44.5, 57.6], B: [57.5, 57.6], single: [51, 57.6] }, plaqueSize: [4.5, 2.6], bench: [37, 55, 65, 72],
  },
  "athletic-fields": {
    src: "/bench/scenes/athletic-fields.jpg", aspect: 3 / 2, credit: "Pexels",
    plaques: { A: [46, 40], B: [62, 40], single: [54, 40] }, plaqueSize: [6, 2.8], bench: [24, 37, 72, 88],
  },
  "playground": {
    src: "/bench/scenes/playground.jpg", aspect: 4231 / 2380, credit: "Kadir Emir / Pexels",
    plaques: { A: [35, 24], B: [65, 24], single: [50, 24] }, plaqueSize: [8, 3.4], bench: [10, 20, 90, 80],
  },
  "community-garden": {
    src: "/bench/scenes/community-garden.jpg", aspect: 3478 / 2576, credit: "Simge Tek / Pexels",
    plaques: { A: [43.3, 42], B: [60, 42], single: [51.5, 42] }, plaqueSize: [6.7, 3.2], bench: [22, 38, 67, 90],
  },
  "picnic-groves": {
    src: "/bench/scenes/picnic-groves.jpg", aspect: 6000 / 3400, credit: "Omar Castro / Pexels",
    plaques: { A: [25, 49.8], B: [44, 49.8], single: [34.5, 49.8] }, plaqueSize: [5, 2.4], bench: [16, 47, 53, 81],
  },
  "north-woods": {
    src: "/bench/scenes/north-woods.jpg", aspect: 2400 / 1647, credit: "Elliott Blair / Unsplash",
    plaques: { A: [36, 43.8], B: [62, 43.8], single: [49, 43.8] }, plaqueSize: [7.5, 3.1], bench: [23, 38, 75, 82],
  },
  "old-oak-grove": {
    src: "/bench/scenes/old-oak-grove.jpg", aspect: 2400 / 1528, credit: "Kadir Emir / Pexels",
    plaques: { A: [36, 32.6], B: [64, 32.6], single: [50, 32.6] }, plaqueSize: [7, 3.2], bench: [20, 28, 80, 83],
  },
  "hilltop-overlook": {
    src: "/bench/scenes/hilltop-overlook.jpg", aspect: 2994 / 2335, credit: "Fidan Nazim Qizi / Pexels",
    plaques: { A: [38, 60.2], B: [58, 60.2], single: [48, 60.2] }, plaqueSize: [6, 2.6], bench: [29, 57, 67, 84],
  },
};

export const sceneFor = (areaId: string): Scene => SCENES[areaId] ?? SCENES["great-lawn"];
