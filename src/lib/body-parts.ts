/**
 * Shapes of the anatomical body map, in a 200 x 440 viewBox. Pure data, no React.
 * "right"/"left" are the person's own sides: the figure faces you, so the person's right is on the left of the picture.
 * mirror = draw the same path flipped around x = 100.
 */
export type Part = {
  id: string;
  area: string; // area id used by the log (head, chest, abdomen, back, right_arm, left_arm, right_leg, left_leg)
  kind: "body" | "organ";
  d: string;
  fill?: string; // organs only
  mirror?: boolean;
};

const ARM = "M58,84 C46,86 36,96 33,112 L25,170 C23,182 26,198 29,210 C32,222 46,222 48,212 C50,200 48,184 50,170 L58,124 Z";
const LEG = "M62,236 L99,236 C99,262 98,290 96,316 C95,340 93,364 92,388 L90,418 C90,428 68,428 68,418 L66,388 C64,364 64,340 64,316 C62,290 62,262 62,236 Z";

export const FRONT: Part[] = [
  { id: "head", area: "head", kind: "body", d: "M100,11 C118,11 126,26 125,42 C124,58 114,69 100,69 C86,69 76,58 75,42 C74,26 82,11 100,11 Z" },
  { id: "neck", area: "head", kind: "body", d: "M90,66 L110,66 L112,82 L88,82 Z" },
  { id: "brain", area: "head", kind: "organ", fill: "#d9a0b0", d: "M84,32 C82,20 92,14 100,16 C108,14 118,20 116,32 C118,42 112,50 104,50 C102,52 98,52 96,50 C88,50 82,42 84,32 Z" },

  { id: "chest", area: "chest", kind: "body", d: "M60,82 C72,76 128,76 140,82 L143,118 C142,134 137,146 134,152 L66,152 C63,146 58,134 57,118 Z" },
  { id: "lung-r", area: "chest", kind: "organ", fill: "#eba7ae", d: "M97,92 C84,88 70,98 69,118 C68,134 74,144 85,144 C93,144 97,132 97,120 Z" },
  { id: "lung-l", area: "chest", kind: "organ", fill: "#eba7ae", d: "M103,92 C116,88 130,98 131,118 C132,134 126,144 115,144 C107,144 103,132 103,120 Z" },
  { id: "heart", area: "chest", kind: "organ", fill: "#c0392b", d: "M104,112 C109,104 121,107 119,119 C117,129 110,135 104,141 C98,135 92,129 91,119 C90,107 99,104 104,112 Z" },

  { id: "abdomen", area: "abdomen", kind: "body", d: "M66,154 L134,154 C136,172 139,186 141,200 C143,212 143,224 141,236 L59,236 C57,224 57,212 59,200 C61,186 64,172 66,154 Z" },
  { id: "liver", area: "abdomen", kind: "organ", fill: "#8f3b2c", d: "M64,160 C80,156 104,158 112,164 C110,178 96,186 80,184 C68,182 62,172 64,160 Z" },
  { id: "stomach", area: "abdomen", kind: "organ", fill: "#d98c6b", d: "M112,162 C126,158 138,166 134,180 C130,190 118,192 114,184 C110,178 108,168 112,162 Z" },
  { id: "bowel", area: "abdomen", kind: "organ", fill: "#e8b9a4", d: "M72,196 C72,218 128,218 128,196 C128,189 119,189 119,197 C119,206 81,206 81,197 C81,189 72,189 72,196 Z" },

  { id: "arm-r", area: "right_arm", kind: "body", d: ARM },
  { id: "arm-l", area: "left_arm", kind: "body", d: ARM, mirror: true },
  { id: "leg-r", area: "right_leg", kind: "body", d: LEG },
  { id: "leg-l", area: "left_leg", kind: "body", d: LEG, mirror: true },
];

const spine: Part[] = Array.from({ length: 13 }, (_, i) => {
  const y = 86 + i * 11;
  return { id: `vert-${i}`, area: "back", kind: "organ" as const, fill: "#e9e2d0", d: `M94,${y} h12 a3,3 0 0 1 3,3 v4 a3,3 0 0 1 -3,3 h-12 a3,3 0 0 1 -3,-3 v-4 a3,3 0 0 1 3,-3 Z` };
});

export const BACK: Part[] = [
  { id: "head-b", area: "head", kind: "body", d: FRONT[0]!.d },
  { id: "neck-b", area: "head", kind: "body", d: FRONT[1]!.d },
  { id: "torso-b", area: "back", kind: "body", d: "M60,82 C72,76 128,76 140,82 L143,118 C142,140 138,160 141,200 C143,212 143,224 141,236 L59,236 C57,224 57,212 59,200 C62,160 58,140 57,118 Z" },
  { id: "blade-r", area: "back", kind: "organ", fill: "#cfc3a8", d: "M88,92 C78,90 68,98 68,112 C68,124 76,130 86,126 C90,116 90,102 88,92 Z" },
  { id: "blade-l", area: "back", kind: "organ", fill: "#cfc3a8", d: "M88,92 C78,90 68,98 68,112 C68,124 76,130 86,126 C90,116 90,102 88,92 Z", mirror: true },
  ...spine,
  { id: "kidney-r", area: "back", kind: "organ", fill: "#9c3b3b", d: "M82,164 C72,164 70,180 76,190 C82,196 90,190 90,180 C90,170 88,164 82,164 Z" },
  { id: "kidney-l", area: "back", kind: "organ", fill: "#9c3b3b", d: "M82,164 C72,164 70,180 76,190 C82,196 90,190 90,180 C90,170 88,164 82,164 Z", mirror: true },
  { id: "arm-r-b", area: "right_arm", kind: "body", d: ARM, mirror: true },
  { id: "arm-l-b", area: "left_arm", kind: "body", d: ARM },
  { id: "leg-r-b", area: "right_leg", kind: "body", d: LEG, mirror: true },
  { id: "leg-l-b", area: "left_leg", kind: "body", d: LEG },
];
