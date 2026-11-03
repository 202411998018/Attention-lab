# Attention Lab

**看见注意力，理解认知。**  
An interactive cognitive science laboratory for exploring visual attention.

Attention Lab is a browser-based educational platform featuring three classic attention paradigms:

- **Posner Spatial Cueing** — spatial orienting and cue validity.
- **Face Flicker Change Detection** — face-feature change detection using a flicker-style task.
- **Visual Search / Feature Integration** — feature and conjunction search across set sizes.

The site includes participant setup, shortened practice and formal trials, task-specific keyboard responses (A/L for Posner, F/J for visual search and face-change detection), balanced condition generation, irregular randomized visual-search layouts, response-time and accuracy recording, IndexedDB-backed local session/trial/gaze/event persistence, submission of standardized trial JSON to the course HW2 endpoint, upload status and manual retry, a local data archive, and CSV/JSON export.

## Run locally

No build step is required. Open `index.html` in a modern browser, or serve the folder with a local static server:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000.

## Notes

- This is an initial educational prototype. Validate timing and stimulus presentation on the actual testing devices before collecting formal research data.
- Webcam eye tracking is presented as an optional integration point. Add a locally hosted WebGazer build at `vendor/webgazer.js` to enable the calibration workflow. The prototype does not save camera video.
- Trial data is submitted to the course HW2 endpoint after a session is completed or the participant exits; a local IndexedDB/localStorage backup is retained. Raw gaze samples and full event logs remain local because the course example only documents a `trials` array. Configure the six-character project code in `hw2-config.js`; never put the download key in frontend code. Do not enter names, student IDs, or other direct identifiers.
- Demo/example values are not real participant data.

## Project structure

- `index.html` — page structure and content
- `styles.css` — visual system and responsive layouts
- `app.js` — navigation, experiment flows, trial logging, HW2 submission, local backup, summaries, and CSV export
- `hw2-config.js` — course HW2 project code and endpoint configuration (no download key)
- `docs/experiment-design.md` — task rationale, conditions, and hypotheses

## Experiments

See [Experiment design](docs/experiment-design.md) for a concise description of the paradigms and proposed modifications.

## References

- Posner, M. I. (1980). Orienting of attention. *Quarterly Journal of Experimental Psychology*, 32(1), 3–25.
- Treisman, A. M., & Gelade, G. (1980). A feature-integration theory of attention. *Cognitive Psychology*, 12(1), 97–136.
- Rensink, R. A., O'Regan, J. K., & Clark, J. J. (1997). To see or not to see: The need for attention to perceive changes in scenes. *Psychological Science*, 8(5), 368–373.

## Next steps

1. Validate trial timing and condition balance.
2. Pilot each task with a small number of participants.
3. Add and validate the locally hosted WebGazer integration.
4. Configure a test project code in `hw2-config.js` and verify one test submission and the downloaded records in the course HW2 dashboard.
5. Preregister hypotheses, exclusions, and analysis decisions before formal data collection.
