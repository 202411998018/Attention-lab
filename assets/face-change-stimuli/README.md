# Face Change-Detection Stimuli

This folder contains 8 SVG prototype stimuli for a face-based flicker change-detection task.

## Stimulus pairs

| Pair | Files | Manipulated feature |
|---|---|---|
| 1 | `01_gaze_left.svg`, `02_gaze_right.svg` | Gaze direction (subtle pupil displacement) |
| 2 | `03_mouth_neutral.svg`, `04_mouth_smile.svg` | Mouth curvature (subtle smile) |
| 3 | `05_brows_flat.svg`, `06_brows_raised.svg` | Eyebrow curvature (slight raise) |
| 4 | `07_nose_normal.svg`, `08_nose_wide.svg` | Nose contour (slight widening) |

The hairstyle manipulation has been removed. Each remaining pair uses the same 512 × 512 canvas, background, face template, and palette; only the intended feature is manipulated.

## Regenerate

From the repository root, run:

```bash
node scripts/generate_face_stimuli.mjs
```

The script writes the eight SVG files into this folder.

## Method note

These are prototype stimuli for implementation and pilot testing, not a normed or validated psychological stimulus set. The feature differences have been reduced to avoid an overly obvious flicker, but their detectability is not calibrated. Before formal data collection, pilot-test each feature condition and consider adjusting the magnitude based on detection accuracy and response time. There is currently one base face exemplar, so feature type and stimulus identity are not independently sampled.
