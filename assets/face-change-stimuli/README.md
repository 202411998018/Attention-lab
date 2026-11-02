# Face Change-Detection Stimuli

This folder contains 10 SVG prototype stimuli for a face-based flicker change-detection task.

## Stimulus pairs

| Pair | Files | Manipulated feature |
|---|---|---|
| 1 | `01_gaze_left.svg`, `02_gaze_right.svg` | Gaze direction |
| 2 | `03_mouth_neutral.svg`, `04_mouth_smile.svg` | Mouth curvature |
| 3 | `05_brows_flat.svg`, `06_brows_raised.svg` | Eyebrow shape |
| 4 | `07_nose_normal.svg`, `08_nose_wide.svg` | Nose width |
| 5 | `09_hair_short.svg`, `10_hair_bangs.svg` | Hairstyle / fringe |

Each pair uses the same 512 × 512 canvas, background, face template, and palette; only the intended feature is manipulated.

## Regenerate

From the repository root, run:

```bash
node scripts/generate_face_stimuli.mjs
```

The script writes the ten SVG files into this folder.

## Method note

These are prototype stimuli for implementation and pilot testing, not a normed or validated psychological stimulus set. Before formal data collection, expand the number of face exemplars and pilot-test change detectability. The five feature changes may differ in visual salience, so feature effects should not automatically be interpreted as social-versus-structural processing differences.
