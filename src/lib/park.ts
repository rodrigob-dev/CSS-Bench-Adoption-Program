/**
 * The park. Fictional by design: the brief simulates a bench adoption
 * service for a park whose benches have all been mapped, so every bench gets
 * a position. Coordinates are park-local metres (x east, y north) on a
 * 1000 × 700 canvas, rendered on a schematic map rather than real-world
 * tiles. When a real park is surveyed, swap x/y for lat/lng and the schematic
 * for a tile layer; nothing else changes.
 *
 * This file is the single source of the layout: the seed generator places
 * benches along each area's paths, and the map draws the same shapes.
 */
export type XY = [number, number];

export type Backdrop = "lawn" | "meadow" | "lake" | "woods";

export type ParkArea = {
  id: string;
  name: string;
  short: string;
  description: string;
  /** Background photo behind a bench in this area (public/bench/bg/<backdrop>.jpg). */
  backdrop: Backdrop;
  polygon: XY[];
  /** Paths inside the area; benches are spaced evenly along them. */
  paths: XY[][];
  benches: number;
  /** Share of bench sides that carry an active adoption in the seed. */
  adoptRate: number;
  /** Pre-approved spots for new benches, placed along the area's edge. */
  slots?: number;
};

export const PARK = {
  name: "Riverbend Park",
  width: 1000,
  height: 700,
  lake: [
    [470, 100], [540, 60], [640, 70], [720, 130], [735, 220], [680, 285], [580, 300], [500, 260], [455, 180],
  ] as XY[],
  /** Connector paths between areas; decorative, no benches. */
  mainPaths: [
    [[410, 20], [410, 680]],
    [[780, 20], [780, 680]],
    [[20, 335], [980, 335]],
    [[20, 495], [980, 495]],
  ] as XY[][],
  areas: [
    {
      id: "great-lawn",
      backdrop: "lawn",
      name: "Great Lawn",
      short: "Great Lawn",
      description: "The big open lawn by the main entrance. The busiest part of the park, and the only area with pre-approved spots for new benches along its edge.",
      polygon: [[40, 40], [400, 40], [400, 320], [40, 320]],
      paths: [
        [[65, 65], [375, 65], [375, 295], [65, 295], [65, 65]],
        [[65, 65], [375, 295]],
      ],
      benches: 110,
      adoptRate: 0.6,
      slots: 12,
    },
    {
      id: "willow-lake",
      backdrop: "lake",
      name: "Willow Lake",
      short: "Willow Lake",
      description: "Benches along the lakeshore loop and by the boathouse.",
      polygon: [[430, 40], [770, 40], [770, 320], [430, 320]],
      paths: [
        [[445, 95], [525, 45], [645, 50], [740, 120], [758, 225], [695, 305], [575, 318], [485, 280], [437, 185], [445, 95]],
      ],
      benches: 85,
      adoptRate: 0.55,
    },
    {
      id: "athletic-fields",
      backdrop: "lawn",
      name: "Athletic Fields",
      short: "Fields",
      description: "Ballfields and the running track on the east side.",
      polygon: [[800, 40], [960, 40], [960, 320], [800, 320]],
      paths: [[[820, 60], [940, 60], [940, 300], [820, 300], [820, 60]]],
      benches: 50,
      adoptRate: 0.4,
    },
    {
      id: "playground",
      backdrop: "meadow",
      name: "Meadow Playground",
      short: "Playground",
      description: "Playground, splash pad and the picnic lawn next to it.",
      polygon: [[40, 350], [300, 350], [300, 480], [40, 480]],
      paths: [[[60, 370], [280, 370], [280, 460], [60, 460], [60, 370]]],
      benches: 55,
      adoptRate: 0.5,
    },
    {
      id: "community-garden",
      backdrop: "meadow",
      name: "Community Garden",
      short: "Garden",
      description: "Plots, the greenhouse and the pollinator meadow.",
      polygon: [[330, 350], [560, 350], [560, 480], [330, 480]],
      paths: [
        [[350, 380], [540, 380]],
        [[350, 450], [540, 450]],
      ],
      benches: 35,
      adoptRate: 0.3,
    },
    {
      id: "picnic-groves",
      backdrop: "meadow",
      name: "Picnic Groves",
      short: "Picnic Groves",
      description: "Shaded picnic groves and grills along the east path.",
      polygon: [[590, 350], [960, 350], [960, 480], [590, 480]],
      paths: [[[610, 370], [700, 460], [790, 370], [880, 460], [945, 380]]],
      benches: 65,
      adoptRate: 0.35,
    },
    {
      id: "north-woods",
      backdrop: "woods",
      name: "North Woods",
      short: "North Woods",
      description: "Quiet trail benches under the trees in the north-west.",
      polygon: [[40, 510], [500, 510], [500, 660], [40, 660]],
      paths: [[[60, 540], [160, 640], [260, 540], [360, 640], [480, 560]]],
      benches: 50,
      adoptRate: 0.15,
    },
    {
      id: "old-oak-grove",
      backdrop: "woods",
      name: "Old Oak Grove",
      short: "Oak Grove",
      description: "The oldest trees in the park, around the memorial circle.",
      polygon: [[530, 510], [760, 510], [760, 660], [530, 660]],
      paths: [[[550, 530], [740, 530], [740, 640], [550, 640], [550, 530]]],
      benches: 35,
      adoptRate: 0.3,
    },
    {
      id: "hilltop-overlook",
      backdrop: "lawn",
      name: "Hilltop Overlook",
      short: "Overlook",
      description: "Benches on the ridge path with the view over the lake.",
      polygon: [[790, 510], [960, 510], [960, 660], [790, 660]],
      paths: [[[805, 640], [830, 560], [875, 525], [925, 560], [945, 640]]],
      benches: 35,
      adoptRate: 0.2,
    },
  ] as ParkArea[],
};

export const AREA_BY_ID = Object.fromEntries(PARK.areas.map((a) => [a.id, a])) as Record<string, ParkArea>;

export function polygonBounds(poly: XY[]): [XY, XY] {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
}
