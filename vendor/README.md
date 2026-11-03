# WebGazer and MediaPipe dependencies

Attention Lab loads fixed browser builds from jsDelivr **only after explicit eye-tracking consent**, using the lazy loader in `eye-tracking.js`:

- WebGazer 3.5.3: `https://cdn.jsdelivr.net/npm/webgazer@3.5.3/dist/webgazer.js`
- MediaPipe Face Mesh 0.4.1633559619: `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619`

The versions are pinned rather than using a floating `latest` tag. Before WebGazer starts, `window.saveDataAcrossSessions = false` is set; shared-machine calibration data are cleared and background mouse-click training is disabled and `webgazer.params.faceMeshSolutionPath` is pointed to the pinned Face Mesh asset package.

Licenses:
- WebGazer: GPL-3.0-or-later — https://github.com/brownhci/WebGazer/blob/master/LICENSE.md
- MediaPipe Face Mesh: Apache-2.0 — https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE

WebGazer's official maintenance ended on February 24, 2026. This project uses fixed versions to avoid silent dependency updates. The browser downloads these static dependencies; webcam video is processed in the browser, not recorded or uploaded. Raw gaze coordinates remain in local IndexedDB/localStorage and are not included in HW2 submissions.
