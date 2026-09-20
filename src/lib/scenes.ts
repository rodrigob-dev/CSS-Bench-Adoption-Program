import type { Backdrop } from "./park";

/**
 * One real photograph per kind of area, with the bench in it. The plaques are
 * drawn on top at measured positions (percent of the image), so each scene
 * is a coherent photo rather than a cut-out pasted on a background.
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

export const SCENES: Record<Backdrop, Scene> = {
  lawn: {
    src: "/bench/scenes/lawn.jpg",
    aspect: 2400 / 1600,
    credit: "Engina Kyurt / Pexels",
    plaques: { A: [32, 24.3], B: [70, 24.3], single: [51, 24.3] },
    plaqueSize: [8, 3.4],
    bench: [10, 20, 92, 83],
  },
  meadow: {
    src: "/bench/scenes/garden.jpg",
    aspect: 2400 / 1528,
    credit: "Kadir Emir / Pexels",
    plaques: { A: [36, 32.6], B: [64, 32.6], single: [50, 32.6] },
    plaqueSize: [7, 3.2],
    bench: [20, 28, 80, 83],
  },
  woods: {
    src: "/bench/scenes/woods.jpg",
    aspect: 2400 / 1647,
    credit: "Elliott Blair / Unsplash",
    plaques: { A: [36, 43.8], B: [62, 43.8], single: [49, 43.8] },
    plaqueSize: [7.5, 3.1],
    bench: [23, 38, 75, 82],
  },
  lake: {
    src: "/bench/scenes/lake.jpg",
    aspect: 2400 / 1600,
    credit: "RobertKSO / Pexels",
    plaques: { A: [12, 64], B: [34, 64], single: [23, 64] },
    plaqueSize: [7.5, 3.3],
    bench: [1, 61, 48, 84],
  },
};
