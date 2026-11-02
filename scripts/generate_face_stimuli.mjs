// Generate the 8 SVG face stimuli for the flicker change-detection prototype.
// Run with: node scripts/generate_face_stimuli.mjs
// Output: assets/face-change-stimuli/*.svg
import { mkdir, writeFile } from "node:fs/promises";

const outputDir = new URL("../assets/face-change-stimuli/", import.meta.url);
await mkdir(outputDir, { recursive: true });

function makeFaceSvg({ gaze = "center", mouth = "neutral", brows = "flat", nose = "normal" } = {}) {
  const ink = "#263342";
  const skin = "#E9C7A8";
  const hairColor = "#34465A";
  const bg = "#F7F4EE";
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<rect width="512" height="512" fill="${bg}"/>`
  ];

  const hairPath = "M126 230 Q112 102 256 86 Q400 102 386 230 L374 302 Q356 258 344 224 Q256 184 168 224 Q156 258 138 302 Z";
  parts.push(`<path d="${hairPath}" fill="${hairColor}" stroke="${ink}" stroke-width="9" stroke-linejoin="round"/>`);
  parts.push(`<ellipse cx="142" cy="278" rx="27" ry="43" fill="${skin}" stroke="${ink}" stroke-width="8"/>`);
  parts.push(`<ellipse cx="370" cy="278" rx="27" ry="43" fill="${skin}" stroke="${ink}" stroke-width="8"/>`);
  parts.push(`<path d="M150 208 Q150 130 256 126 Q362 130 362 208 L350 318 Q338 400 256 416 Q174 400 162 318 Z" fill="${skin}" stroke="${ink}" stroke-width="9" stroke-linejoin="round"/>`);


  const browPaths = {
    flat: ["M184 224 Q208 214 230 224", "M282 224 Q304 214 328 224"],
    raised: ["M184 220 Q208 205 230 220", "M282 220 Q304 205 328 220"],
    worried: ["M184 210 Q208 232 230 218", "M282 218 Q304 232 328 210"]
  };
  const [leftBrow, rightBrow] = browPaths[brows];
  parts.push(`<path d="${leftBrow}" fill="none" stroke="${ink}" stroke-width="10" stroke-linecap="round"/>`);
  parts.push(`<path d="${rightBrow}" fill="none" stroke="${ink}" stroke-width="10" stroke-linecap="round"/>`);

  parts.push(`<ellipse cx="208" cy="260" rx="29" ry="20" fill="#FFFCF7" stroke="${ink}" stroke-width="7"/>`);
  parts.push(`<ellipse cx="304" cy="260" rx="29" ry="20" fill="#FFFCF7" stroke="${ink}" stroke-width="7"/>`);
  const gazeOffset = { left: -8, center: 0, right: 8 }[gaze];
  parts.push(`<circle cx="${208 + gazeOffset}" cy="260" r="11" fill="${ink}"/>`);
  parts.push(`<circle cx="${304 + gazeOffset}" cy="260" r="11" fill="${ink}"/>`);
  parts.push(`<circle cx="${204 + gazeOffset}" cy="256" r="3.5" fill="#FFFFFF"/>`);
  parts.push(`<circle cx="${300 + gazeOffset}" cy="256" r="3.5" fill="#FFFFFF"/>`);

  const nosePaths = {
    normal: "M256 270 Q244 314 256 320 Q268 324 276 316",
    small: "M256 278 Q250 304 256 308 Q263 310 268 305",
    wide: "M256 270 Q242 313 256 320 Q272 323 280 313"
  };
  const mouthPaths = {
    neutral: "M218 356 Q256 358 294 356",
    smile: "M220 354 Q256 370 292 354",
    frown: "M216 374 Q256 336 296 374"
  };
  parts.push(`<path d="${nosePaths[nose]}" fill="none" stroke="${ink}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`);
  parts.push(`<path d="${mouthPaths[mouth]}" fill="none" stroke="#9C5E58" stroke-width="10" stroke-linecap="round"/>`);
  parts.push('<ellipse cx="184" cy="318" rx="15" ry="7" fill="#D99C87" opacity=".24"/>');
  parts.push('<ellipse cx="328" cy="318" rx="15" ry="7" fill="#D99C87" opacity=".24"/>');
  parts.push("</svg>");
  return parts.join("\n");
}

const stimuli = [
  ["01_gaze_left.svg", { gaze: "left" }],
  ["02_gaze_right.svg", { gaze: "right" }],
  ["03_mouth_neutral.svg", { mouth: "neutral" }],
  ["04_mouth_smile.svg", { mouth: "smile" }],
  ["05_brows_flat.svg", { brows: "flat" }],
  ["06_brows_raised.svg", { brows: "raised" }],
  ["07_nose_normal.svg", { nose: "normal" }],
  ["08_nose_wide.svg", { nose: "wide" }],
];

for (const [filename, params] of stimuli) {
  await writeFile(new URL(filename, outputDir), makeFaceSvg(params), "utf8");
}
console.log(`Generated ${stimuli.length} SVG face stimuli in assets/face-change-stimuli/.`);
