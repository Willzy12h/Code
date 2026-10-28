# Cinematic TV v0.3.0 — validation record

Date: 28 October 2026. Target: Samsung QE48S95HHEXXU (2026 S95H, Tizen 10).

## Executed in container

- `npm run syntax` — PASS, model/platform/app JavaScript parses.
- `npm test` — PASS, 22/22 Node.js tests, including 12 focused TVWindow-controller tests (serialisation, source restore, rapid focus, delayed callback cancellation, fullscreen separation, external source changes, failure reporting).
- `npm run test:browser` — PASS for browser UI acceptance plus simulated asynchronous native Tizen TVWindow test (thumbnail display, leaving focus, restore and fullscreen switch). These do NOT prove hardware behaviour.
- `npm run build` — PASS, 10 unsigned web application files staged in `dist/webapp`; hashes saved in `dist/BUILD-MANIFEST.json`.
- `src/config.xml` XML syntax verified and required assets referenced by the staged project verified. Package version: 0.3.0.

## Not performed / limitations

- **No installable signed `.wgt`**: the environment lacks Samsung Tizen Studio Web CLI and a TV-specific certificate profile.
- No installation or testing on the physical S95H. HDMI live video/audio, video-plane clipping, Samsung Settings overlay, HDMI-CEC, remote press timing, app-specific native IDs and official Tizen runtime compatibility remain untested.
- No Home interception, startup watcher, system patches, Smart Hub removal or default-launcher replacement implemented.
- The browser demo uses simulated apps, HDMI sources and weather data. Weather connectivity and custom HTTPS images have not been tested from the television.

## Result

Version 0.3.0 is a validated unsigned source/staging build with implemented native HDMI-preview code and automated mock coverage. It is **a candidate for the first signed S95H acceptance test**, not a confirmed daily-driver or signed installable release.
