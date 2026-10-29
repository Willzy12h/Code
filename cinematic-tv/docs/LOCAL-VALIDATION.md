> Current patch: [0.4.1 hardware feedback](TV-FEEDBACK-0.4.1.md). The user accepted initial live HDMI on the S95H and requested current-source PC preview on by default. Earlier default-off/layout notes below describe 0.4.0 and are historical; explicit Off, import and interruption recovery remain Off.

# Windows validation — 29 October 2026

The authoritative source is `Willzy12h/Code`, branch `gpt/cinematic-tv-v0.4.0`, under `cinematic-tv/`. The older ZIP and its patch are superseded. Validation started from clean commit `835469b0e59745496fdfdd9ef79a04c631fbd899`.

## Corrections

- Pin CI to Ubuntu 24.04: Playwright 1.57.0 cannot install Chromium on the Ubuntu 26.04 image selected by `ubuntu-latest`.
- Read UTF-8 source explicitly in the Python manifest gate and snapshot browser harness. Windows Python 3.12 otherwise used CP1252 and failed decoding the HTML.
- Reserve space for the static PC preview caption within its existing card. A browser geometry regression failed before the CSS correction and passed afterwards. The cinematic layout is retained.

## Automated local evidence

Environment: Windows, Node.js 26.12.1, npm 11.20.0, isolated Python 3.12.14, pinned Playwright 1.57.0 and Chromium build 1200.

| Check | Result |
|---|---|
| `npm run verify` | PASS: syntax, 52 Node tests, unsigned build, manifest/resource gate, browser acceptance, asynchronous HDMI mock acceptance and 18 readiness scenarios (including pointer-free welcome-dialog navigation) |
| `npm run test:served` | PASS: unchanged source over local HTTP, unchanged CSP, no browser JavaScript errors |
| `npm run build` | PASS: 12 runtime files, 812,437 bytes; unsigned staging only |
| Additional independent HTTP/CSP probe | PASS with Chromium sandbox enabled: served HTML and all 12 file hashes matched source/build manifest; inline script, external script and unapproved fetch blocked; initial preview mode off |
| Native Windows PowerShell 5.1 helper | Parser PASS; Doctor PASS |
| Installed SDK | Tizen Studio 10.0; CLI 2.5.25; SDB 4.2.36; Samsung TV public components 10.0.x; Samsung Certificate Extension 2.0.75 |
| SDK `build-web` | PASS on final source; all 12 SDK payload hashes match the generated source manifest |
| Connected TV | SDB identifies QE48S95HHEXXU; public capabilities report TV platform 10.0 and SDB daemon 2.2.31 |

The first real-origin attempt failed while local AdGuard filtering injected resources and reset application-script requests. After the user disabled AdGuard, the unchanged test passed. No CSP or application permissions were relaxed. The user also disconnected Tailscale; Windows then selected local Wi-Fi and SDB connected to the specifically authorised TV. No network scan or router/firewall change was performed.

## GitHub Actions investigation

Run `40795747956` has two distinct failures:

- Attempt 1, job `123191693514`: zero steps, no runner assigned. The check annotation explicitly says recent account payments failed or the spending limit needs increasing. This is an account/billing gate, not an application-test failure.
- Attempt 2, job `123195185949`: checkout and runtime setup succeeded. Browser-tooling installation failed because Playwright 1.57.0 does not support Chromium on Ubuntu 26.04. Application and CSP test steps were skipped. Pinning Ubuntu 24.04 addresses this evidenced tooling mismatch; the follow-up run `40798827067` passed every gate for commit `b1809a2f1371f07c7b7dde3a02c942b9829b3e6c`.

## Signing and hardware boundary

The local Samsung TV profile `CinematicTV` successfully signed `signed/Cinematic-TV-0.4.0.wgt`. Independent inspection found exactly 12 reviewed runtime files plus two signature XML files, with all payload SHA-256 hashes matching. A separate bounded cryptographic check verified both RSA/SHA-512 signature values and all 25 package-file reference digests across the two signatures; it did not check the C14N 1.1 signature-properties reference or independently validate the Samsung trust chain. Public hashes and certificate fingerprints are retained in the local output report, not signing credentials. Keep the author certificate for updates and signing material outside Git.

The identified QE48S95HHEXXU accepted the signed package and SDK launch succeeded (initial PID 570). The user observed the welcome prompt and reported that remote input became usable only after approximately 20 seconds. This startup delay remains unresolved; subsequent navigation working is not full acceptance. A suspected modal-focus escape was not reproduced: the current code already excludes background navigation, and the keyboard-only browser test passes without a handler change. SDB dlog returned no lines, the TV reports logging disabled, and an app-scoped debug attempt returned no diagnostics; no logging/security restrictions were changed. Initial installation left HDMI preview off. Picture, sound, actual remote behaviour, native app launches, HDMI gaming/HDR/VRR, idle protection and preview acceptance still require observations on the physical TV using `HDMI-ACCEPTANCE.md`. SDK command success is not those observations.

## Recovery

Use native Samsung Home/Settings to leave the launcher. Disable live preview in Launcher Settings on any fault. Back up preferences before uninstalling; uninstall Cinematic TV through Samsung Apps to remove it. No Home interception or Samsung system services were installed or changed. Do not assume data survives reinstall or that an older package can be installed as a downgrade. Keep the author certificate and use a corrected higher-version package when necessary.
