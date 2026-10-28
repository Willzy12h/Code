# Cinematic TV v0.3.0 — Samsung Tizen personal launcher

A remote-first, clean home screen designed for the **Samsung QE48S95HHEXXU (2026 S95H)**. The user interface is inspired by the agreed Cinematic Spotlight design: vertical recent apps/inputs on the left, an adaptive HDMI/app preview alongside, favourite apps below, and open scenic wallpaper to the right. The launcher contains **no adverts, recommendation feeds, analytics, accounts or telemetry**. It does **not** remove Samsung Smart Hub adverts or advertisements inside third-party apps.

## Features available in 0.3.0

- Home Settings is reachable with D-pad, and Settings retains focus after changes.
- Quick focus animations (110 ms theme default), reduced-motion support, and a configurable OK long press (190/250/350 ms; default 190 ms).
- Pin **apps or any HDMI input** directly to Home; pinned HDMI remains visible while disconnected. Rearrange favourites with D-pad: select or hold OK → Move → Left/Right → OK to save, or Back to cancel. Scrolling supports more than eight favourites.
- Recent-app history and default focus: last launched, the connected input named PC, or first favourite. Recent items reflect apps and inputs launched through **Cinematic TV**, not system-wide Samsung usage.
- Search installed apps, category filters, hide/show apps, icon fallback handling, app catalogue cache, manual Refresh, plus refresh after returning from another TV app.
- Named HDMI inputs, connection state and optional **implemented but hardware-unverified** HDMI video thumbnail. The opt-in mode uses Tizen TVWindow with serialised source changes, cancellation, original-source restoration, protection against external source changes, and a native video plane in the preview card. It is disabled by default until S95H testing.
- Weather from **Open-Meteo**, configurable town/postcode through Open-Meteo geocoding, °C/°F, cached last-known conditions, network timeout and optional visibility.
- Three offline wallpaper options derived from the design's generated image (Scenic, Twilight, Dawn), plus Dark mode and an **optional manually configured HTTPS image URL**. Default wallpapers require no internet.
- Export/import of configuration as JSON (excludes recent-activity history); diagnostics for app discovery, input discovery and API availability.
- No Home interception, system patching, TV account access, custom screensaver or background service.

## Source of weather and wallpapers

**Weather:** With weather enabled, the TV requests current temperature and WMO weather condition code from `https://api.open-meteo.com/v1/forecast` using the configured coordinates (default **London**). Location searches use `https://geocoding-api.open-meteo.com/v1/search`. The forecast is cached in local TV storage for about 30 minutes, falls back to the previous reading when offline and is not required for navigation. No TV GPS, IP-based geolocation or API key is used. Weather data: **Open-Meteo, CC BY 4.0**; geocoding locations from GeoNames. These APIs are free for non-commercial use subject to provider terms; review licensing before commercial redistribution.

**Wallpapers:** `src/assets/wallpaper.jpg` is based on art generated during our UI-design conversation. `wallpaper-twilight.jpg` and `wallpaper-dawn.jpg` are locally processed variants of that same asset; they are bundled in the `.wgt` and never fetched from the internet. The Dark preset uses only CSS. If you manually enter a custom HTTPS image URL, the TV requests it directly from that source and that website can see the TV's network IP address. It is neither hosted nor proxied by Cinematic TV. Use a source you trust and have permission to display.

## Build, sign and install

Run `npm run build` to stage the complete Tizen web application in `dist/webapp`. This is a validated **unsigned project**; it is not an installable `.wgt`. To create a signed TV package using the Samsung Tizen Studio Web CLI and a profile bound to your TV, run `bash scripts/package-wgt.sh YOUR_PROFILE`. Signing is intentionally local; never commit or share your Samsung certificate passwords, private keys, TV DUID or remote access credentials. The build and hardware checks are documented in [docs/INSTALL.md](docs/INSTALL.md).

The app has **no Home-button interception**. Potential startup and Home integrations are analysed, not implemented, in [docs/HOME-INTEGRATION.md](docs/HOME-INTEGRATION.md).

## Use and test

```bash
npm run syntax
npm test
npm run preview
# Browser-only acceptance tests (requires Python with Playwright and Chromium):
npm run test:browser
```

Open `http://localhost:8765` on a computer to try the browser demo. Arrow keys, Enter, Escape and held Enter approximate TV remote controls. Demo apps, demo inputs and simulated weather used for screenshots are **not** live TV data.

See [docs/INSTALL.md](docs/INSTALL.md) for signing, installing and reverting. A **Samsung TV certificate and Tizen Studio** are required for a signed `.wgt`. These are not included in the source ZIP.

## Organisation

- `src/index.html` + `src/css/styles.css`: visual design, cards, views and focus states.
- `src/js/model.js`: tested, backward-compatible settings and application model.
- `src/js/platform.js`: isolated Samsung APIs for apps, HDMI sources and video plane.
- `src/js/app.js`: navigation, local settings, history, favourites, edit mode and weather.
- `src/config.xml`: Tizen TV Web-app manifest, privileges and network origins.
- `tests/model.test.js`, `tests/platform.test.js`, `tests/browser-acceptance.py`, `tests/tizen-preview-acceptance.py`: unit and browser tests, including a mocked native HDMI video source.
- `docs/`: installation, test evidence and hardware acceptance checklist.

## Important limitations

- **Not tested on S95H hardware:** actual app IDs, icons, HDMI preview, TV source restoration, real remote long presses, native quick Settings and source integration.
- **No signed TV package yet:** this is source code; installing on your actual TV requires local TV credentials and a signing profile.
- **Live HDMI preview is experimental.** Switching its TVWindow source can affect the TV's video/audio state. Leave it off until full-screen input switching and cancellation have been tested. Static previews remain available.
- **Streaming previews contain branding only**; they do not play other apps' live video or show private watch history.
- **No replacement for Samsung Home:** system Home-button redirection and automatic launch are intentionally postponed until installation/recovery are validated. Samsung native Settings keys are not registered or overridden.
- Custom wallpapers need an HTTPS host; per-domain allowlists are not practical when the user can enter arbitrary image domains. Network access is otherwise used only for weather/geocoding.

## Credits

Wallpapers derived from the illustration generated for this project; app branding belongs to the respective companies. UI and Tizen integration patterns were researched against Samsung's developer documentation and public projects [AeroTizen](https://github.com/helalaou/AeroTizen) and [B1ackha7TV](https://github.com/djwalks/B1ackha7TV). The application code is original rather than copied from those repositories.
