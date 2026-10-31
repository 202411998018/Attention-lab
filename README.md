# Attention Lab

**看见注意力，理解认知。**  
An interactive cognitive science laboratory for exploring visual attention.

Attention Lab is a browser-based educational platform featuring three classic attention paradigms:

- **Posner Spatial Cueing** — spatial orienting and cue validity.
- **Change Blindness** — visual change detection using a flicker-style task.
- **Visual Search** — feature and conjunction search.

The site includes experiment introductions, participant setup, practice and task flows, trial-level behavioral recording, local result summaries, and CSV export.

## Run locally

No build step is required. Open `index.html` in a modern browser, or serve the folder with a local static server:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000.

## Notes

- This is an initial educational prototype. Validate timing and stimulus presentation on the actual testing devices before collecting formal research data.
- Webcam eye tracking is presented as an optional integration point. Add a locally hosted WebGazer build at `vendor/webgazer.js` to enable the calibration workflow. The prototype does not save camera video.
- Participant data stays in the browser unless explicitly exported. Do not enter names, student IDs, or other direct identifiers.
- Demo/example values are not real participant data.

## Project structure

- `index.html` — page structure and content
- `styles.css` — visual system and responsive layouts
- `app.js` — navigation, experiment flows, trial logging, summaries, and CSV export
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
4. Confirm the course data-collection endpoint schema before enabling remote submission.
5. Preregister hypotheses, exclusions, and analysis decisions before formal data collection.
