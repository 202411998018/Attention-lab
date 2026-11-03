# WebGazer dependency

Attention Lab currently loads the pinned WebGazer 3.5.3 browser bundle from:

`https://cdn.jsdelivr.net/npm/webgazer@3.5.3/dist/webgazer.js`

The version is pinned rather than using a floating `latest` tag. The HTML sets `window.saveDataAcrossSessions = false` before loading WebGazer so one participant's calibration data is not reused for another participant.

WebGazer is GPL-3.0-or-later. Its upstream source and license are available at:
- https://github.com/brownhci/WebGazer
- https://github.com/brownhci/WebGazer/blob/master/LICENSE.md

The browser downloads the library from jsDelivr; the webcam stream and raw gaze samples are processed/stored in the participant's browser. No webcam video is uploaded by this project. If an offline/local bundle is added in the future, include the corresponding license and source/offer required by GPL-3.0-or-later.
