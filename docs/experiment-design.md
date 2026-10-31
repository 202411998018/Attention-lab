# Attention Lab — Experiment Design

This document summarizes the educational prototype's three attention paradigms. The task parameters and hypotheses should be reviewed and preregistered before formal data collection.

## 1. Posner Spatial Cueing

**Question:** How do spatial cues orient attention and influence target localization?

- Classic conditions: valid, invalid, neutral.
- Proposed extension: compare peripheral cues with central symbolic cues.
- Outcomes: response time, accuracy, cueing effect.
- Optional gaze measures: central fixation maintenance, gaze deviation, and gaze samples aligned to trial timestamps.

**Hypothesis:** Valid cues are expected to facilitate responses relative to invalid cues. The magnitude of the effect may differ between peripheral and central symbolic cues.

Reference: Posner, M. I. (1980). Orienting of attention. *Quarterly Journal of Experimental Psychology*, 32(1), 3–25.

## 2. Change Blindness

**Question:** How does spatial attention influence detection of visual changes?

- Paradigm: flicker-style alternation between two scenes.
- Proposed conditions: valid spatial cue, invalid spatial cue, and no cue.
- Outcomes: detection accuracy, detection latency, false alarms.
- Optional gaze measures: first fixation latency to the changed region, dwell time, and scan path.

**Hypothesis:** Valid spatial cues may improve change detection, while invalid cues may delay detection.

Reference: Rensink, R. A., O'Regan, J. K., & Clark, J. J. (1997). To see or not to see: The need for attention to perceive changes in scenes. *Psychological Science*, 8(5), 368–373.

## 3. Visual Search

**Question:** How do search type and set size influence visual search efficiency?

- Classic conditions: feature search and conjunction search.
- Proposed extension: target preview before conjunction search.
- Outcomes: response time, accuracy, search slope across set sizes.
- Optional gaze measures: first fixation to target, fixation count, dwell time, and scan path.

**Hypothesis:** Conjunction search is expected to be more sensitive to set size than feature search. Previewing the target may improve search efficiency.

Reference: Treisman, A. M., & Gelade, G. (1980). A feature-integration theory of attention. *Cognitive Psychology*, 12(1), 97–136.

## Eye-tracking note

The interface supports an optional local WebGazer integration point. Webcam-based gaze estimates are approximate and should be treated as exploratory. Validate calibration and accuracy on the actual devices before interpreting gaze metrics. The prototype does not save webcam video.

## Important validation before formal collection

- Verify trial counts, condition balance, and randomization.
- Validate actual stimulus timing and response capture.
- Review the scene materials and target definitions for the change-detection task.
- Confirm the WebGazer local build and calibration procedure.
- Confirm the course collection endpoint schema before enabling remote submission.
- Preregister hypotheses, exclusions, and analysis decisions.
