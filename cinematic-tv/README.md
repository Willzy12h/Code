> Optional experimental background return is available in 0.4.6, default Off. See [controls, limitations and physical trial](docs/TV-FEEDBACK-0.4.6.md). No internal Home configuration is changed.

# Cinematic TV 0.4.5

A personal, remote-first Samsung Tizen TV launcher. The agreed Cinematic Spotlight layout is retained: recent apps/inputs on the left, an adaptive preview beside them, favourites below, and open scenic wallpaper. No recommendation feed, adverts, telemetry, accounts or custom screensaver.

**Status: 0.4.5 hardware-feedback candidate; see [patch validation and remaining TV acceptance](docs/TV-FEEDBACK-0.4.1.md). Signed 0.4.0, 0.4.1 and 0.4.2 packages were installed and launched on the identified S95H. The user confirmed quicker response and improving artwork; physical acceptance of 0.4.4 remains pending while the user is away.** A Samsung TV package is `.wgt`, not an Android APK.

## Start here: SDK already installed

The GitHub feature branch is authoritative; ignore the older ZIP/patch. See [Windows validation](docs/LOCAL-VALIDATION.md) for current evidence and [Signing and installation](docs/INSTALL.md) for setup. On Windows, open PowerShell in this project folder and generate the ignored staging first:

```powershell
npm run build
.\scripts\Tizen-Local.ps1 -Action Doctor -SdkRoot 'C:\tizen-studio'
.\scripts\Tizen-Local.ps1 -Action Sign -SdkRoot 'C:\tizen-studio' -CertificateProfile 'CinematicTV'
.\scripts\Tizen-Local.ps1 -Action Install -SdkRoot 'C:\tizen-studio' -TvAddress 'YOUR_TV_IPV4_ADDRESS'
```

`CinematicTV` must be an existing **Samsung → TV** certificate profile authorised for your television. Create it once through Certificate Manager and retain its author certificate for updates. The helper uses the profile by name; it does not need, read out or upload your password. `Install` uses the signed file from the preceding step, targets one exact IPv4 address, and runs the app after successful installation. It never scans your network, modifies Samsung system services or redirects Home.

After `npm run build` generates `dist/BUILD-MANIFEST.json`, signing does not need Node/Python: the helper verifies the reviewed source hashes, builds in a temporary folder, signs through the official SDK, checks payload hashes and signature certificate metadata, and writes `signed/Cinematic-TV-0.4.0.wgt`. This inspection is not independent cryptographic verification of the Samsung certificate chain; the TV enforces certificate and DUID authorisation.

The helper parser and Doctor have passed locally in Windows PowerShell 5.1 with the installed SDK. Signing and hardware acceptance remain separate gates. Direct SDK fallback commands are in the installation guide. Stop on an SDK error; do not bypass certificate validation.

## Included in this candidate

- Existing cinematic Home, native app icons when accessible and bounded fallbacks.
- App/input pinning, HDMI naming and icons, direct D-pad reordering, scrolling favourites, search and hidden apps.
- Recent-first focus and **Previous** Quick Switch using launches observed through this launcher.
- Optional first-run setup, up to eight named Home profiles, granular resets and preference backup/import with JSON file and text routes.
- Local Dawn/Scenic/Twilight, optional weather adaptation, cached Wikimedia daily photographs and reduced glass effects.
- Open-Meteo weather with location/units, a 30-minute cache and a six-hour maximum stale fallback; network indicator explicitly reports browser link state, not internet reachability.
- Persistent PC HDMI preview: default on for new installations; existing explicit Off, imports and recovery remain Off. The default policy only previews the current TV source. Preview may affect audio. Allowing temporary input switching requires a separate confirmation.
- Serialised HDMI operations, timeout quarantine, late callback recovery, persistent interruption protection and an independent startup rescue control.
- Single app-launch ownership, late-callback guards, held-OK handling, native key preservation and focus-safe catalogue refresh.
- Installation/update catalogue listeners with cached fallback; diagnostics export and manual public release checks (the dedicated public repo is not yet available).

## Deliberate boundaries

Samsung Home/Settings keys remain native. There is no Home watcher, automatic startup service, private app screenshot capture, streaming video preview, unified Continue Watching, companion web server or automatic updater. These are separate integrations, not hidden incomplete functions. There is also no claim that fullscreen TVWindow preserves every PC gaming mode, HDR/VRR or sound configuration; test those on the television and use native Samsung Sources when necessary.

The model requested is QE48S95HHEXXU. Firmware/API behaviour must be recorded from the actual television. The manifest preserves `CinemTV001.Launcher` / `CinemTV001` and its existing minimum API declaration; older-TV compatibility is not certified.

## Development checks

Node.js 22+, Python 3.12+ and Playwright are needed for development tests, not for the installed application.

```sh
python -m pip install -r tests/requirements.txt
python -m playwright install chromium
npm run verify
npm run test:served
```

`verify` includes source syntax, Node tests, unsigned staging, project-specific XML/resource validation and browser behaviour tests. The behaviour harness uses an offline HTML snapshot with mocked Tizen/network APIs; it removes CSP only in the fixture to load inline scripts in restricted hosts. `test:served` separately loads the unchanged source and CSP over localhost, and is required by CI. It was blocked in the earlier chat runtime; it now passes on the local Windows PC (see the Windows validation record).

The workflow runs from either this standalone project or the existing `cinematic-tv/` folder. Actions are commit-pinned, have read-only repository permission, and never access signing secrets. A workflow file is not evidence of a successful GitHub Actions run.

## Assets and privacy

Scenic, Dawn and Twilight are bundled images derived from the generated design artwork. They load locally. Custom wallpapers are optional public HTTPS image URLs; the host receives the TV's IP. The manifest permits user-selected external images, while CSP restricts scripts and fetch connections to self and the named API hosts. URL validation does not guarantee where a remote domain resolves; do not use untrusted hosts.

Weather uses Open-Meteo forecast/geocoding, with manually selected coordinates (default London). No GPS or automatic IP geolocation is used. Open-Meteo requires attribution; its free service is for non-commercial usage subject to provider terms. Source: https://open-meteo.com/ and https://open-meteo.com/en/terms

Daily photograph is optional. Wikimedia receives the image/API requests; the app keeps one bounded local image and its attribution. Choose Wallpaper credits for the photographer, licence and source. Bundled scenery remains available without that service.

Preferences and local launch history stay on the TV. Backups contain your preferences and chosen weather location, but omit history and always restore with live preview off. Diagnostics are bounded/redacted; review an export before sharing it. Public repo publication requires a licence decision; this candidate does not grant a new software licence or redistribute other projects' code.

See [comparison and readiness review](docs/review/READINESS.md), [test results](docs/TEST-RESULTS.md), [HDMI acceptance](docs/HDMI-ACCEPTANCE.md) and [local Codex handover](docs/LOCAL-CODEX-HANDOFF.md).

## Artwork and hidden apps (0.4.4)

Common favourite apps use locally bundled vector marks, with sources and terms in `src/assets/brands/`. Other apps keep native artwork and readable fallbacks. In All Apps, hold OK and choose Hide from All Apps. Choose Hidden apps in All Apps or Manage hidden apps in Launcher Settings to restore one or all listed apps. This preserves Home pins and never reveals filtered system services. Recently used fits its entries while the larger preview stays in place. Physical acceptance is pending while the user is away.

## 0.4.5 refinement

The preview is selectable with the remote: focus it and press OK to open the displayed HDMI input. Its native picture is inset within the frame using normalised viewport coordinates. PC is the initial selection; explicit saved PC ports remain intact. Undo is available for ten seconds after hiding an app or removing a Home favourite. Wallpaper is decoded before a crossfade, with independently switchable location/time-based darkening. Home is minimal, settings scrolling has safe padding and presets are optional. Read `docs/STARTUP-RETURN-INVESTIGATION.md` for the separate read-only return/default investigation; no Home/system/background-helper changes are included. Physical S95H acceptance remains separate from browser checks.
