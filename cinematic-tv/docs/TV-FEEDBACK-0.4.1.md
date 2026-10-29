# Cinematic TV 0.4.1 — S95H feedback

This patch continues the authoritative `gpt/cinematic-tv-v0.4.0` branch. Application/package identity remains `CinemTV001.Launcher` / `CinemTV001`; the higher package version distinguishes the update from the first signed 0.4.0 candidate.

## User-visible changes

- Catalogue refresh reads the launcher's own native app ID once per refresh, rather than once for every installed entry. The 500-entry regression reproduces the previous call storm. This is the identified code-level cause consistent with the reported roughly 20-second launch/resume freeze; the improvement still needs timing on the physical TV.
- All Apps also excludes empty/code-like labels, bare firmware identifiers, observed metadata/promotional wrappers, and background services outside Samsung namespaces. Unfamiliar consumer names and personal apps remain supported. The filtering approach was compared with the [Arn0 Tizen launcher](https://github.com/NelsonEU/arn0-tv/blob/main/src/js/apps.js); no external code or native Home/startup helpers were imported.
- All Apps respects explicit visibility and excludes observed background/service/system entries. Known-brand duplicates prefer an installed wrapper over Samsung's internal component. Existing known-brand favourites, hidden choices, profiles and recent IDs migrate to that wrapper. Native metadata is copied explicitly before caching because WebIDL getters may not survive JSON serialisation.
- New installations enable current-source PC preview by default following the user's successful initial hardware test. Existing explicit Off choices remain Off. Backup import, interrupted-preview recovery and safe startup still force Off. Choosing PC input now records the exact port; the app does not assume HDMI 1.
- PC preview stays visible while browsing app tiles, with no live badge or instructional overlay. It stops before app launch or leaving Home. Other applications are opened normally; the launcher does not capture their private screens.
- The native video rectangle contains the detected source aspect ratio, including 4K 16:9, 4:3 and ultrawide, with 16:9 as the fallback. Merely browsing cannot switch away from the current source under the default policy. Temporary source switching remains separately confirmed.
- Footer Left/Right follows All apps → Inputs → Previous → Edit Home. Up returns to content above.
- Favourites have larger native icons, clearer fallback wordmarks, a crisp selection edge and a short lifted focus transition. Menu/dialog transitions respect the reduced-motion choice and system preference. The scenic layout is retained.
- The ineffective Balanced/Compact selector is removed. Settings show an inert miniature of Home so wallpaper, favourites and appearance changes are visible. It contains no duplicate IDs, interactive controls or native video plane.
- Weather now shows a loading state, retains its redacted failure reason in Diagnostics and offers Refresh weather. Cache/loading/off state is reflected in the control and diagnostic export.
- Wallpaper includes an optional Daily photograph from Wikimedia Commons. The provider supplies a 3840-pixel image where available, photographer/licence attribution and a source link. One JPEG/PNG/WebP image is cached in IndexedDB, capped at 6 MiB. A recent cache can be used for up to seven days offline; bundled scenery remains the fallback. Requests omit credentials/referrers, reject redirects and use explicitly validated Wikimedia hosts. Only the three required Wikimedia fetch hosts were added to CSP; scripts remain self-only, with no unsafe-eval or remote code.
- Startup and exit explains Samsung's own Autorun Last App setting, its enable/disable route and model/app support limits, and provides Exit Cinematic TV. There is no fake autorun switch, Home interception, boot watcher or Samsung service modification.

## Resolution boundary

Samsung's current general specification lists a 1920×1080 application UI, including 2026 models, separately from 4K/8K video. The patch does not claim unsupported native 4K UI rendering. Vector/fallback artwork and responsive spacing were checked at 1920×1080 and 3840×2160 browser viewports. These captures are browser/native mocks, not evidence of a 4K application plane on the television.

Official sources:
- https://developer.samsung.com/smarttv/develop/specifications/general-specifications.html
- https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/tvwindow-api.html
- https://www.samsung.com/au/support/tv-audio-video/use-autorun-start-screen-options-on-your-samsung-tv/

## Validation and acceptance boundary

The local full suite covers 62 Node regressions, source syntax, unsigned build, manifest/resources, the existing browser flows, asynchronous HDMI mocks, 18 readiness scenarios, seven hardware-feedback regressions and all 37 launcher settings. Browser file import/download tests do not establish Samsung firmware support for those routes.

The unchanged-origin HTTP/CSP gate and a separate sandbox-enabled active-policy probe are required. The real daily-photo check loaded the image with two provider requests, then reloaded it from IndexedDB with zero additional provider requests; attribution remained available and no page errors occurred. A real Open-Meteo response also rendered through the local HTTP/CSP path. These network results are from this Windows PC, not a claim that the TV's DNS/TLS/provider access passed.

The original CI failure was independently traced: attempt 1 was blocked before startup by GitHub's account payment/spending annotation; attempt 2 failed on Playwright 1.57.0's unsupported Ubuntu 26.04 browser install. Pinning Ubuntu 24.04 produced a fully passing run for `b1809a2f1371f07c7b7dde3a02c942b9829b3e6c`. The 0.4.1 commit needs its own CI result.

The installed Samsung simulator opened, but its computer-use approval timed out. The user explicitly deferred simulator control. Simulator acceptance is not claimed.

The identified QE48S95HHEXXU accepted and ran the first signed 0.4.0 package. The user confirmed working HDMI preview and immediate welcome-dialog response after startup; the remaining issue was launch/resume responsiveness. Signing/install results for this patch and its public hashes belong in the local delivery report. No DUID, private certificate, password or account credential belongs in Git or public logs.

## Physical checks still required for this patch

1. Open from Samsung Home and time the first usable remote input; repeat once after leaving and returning.
2. Check YouTube's selected icon and launch target, normal installed-app visibility, footer navigation and the chosen PC port.
3. Check persistent PC picture, aspect ratio and audio while browsing, app launch/return, native Home/Settings and preview disable/recovery.
4. Check settings miniature, focus transitions and reduced motion; check weather and Daily photograph on the TV's connection.
5. Observe firmware, PC resolution/text, HDR/VRR/Game Mode, idle protection and whether Samsung exposes/supports Autorun Last App for this sideloaded app. These cannot be certified by browser mocks.

## Recovery

Use native Samsung Home/Settings to leave the launcher. Turn PC preview Off in Launcher Settings on any fault. Back up preferences before uninstalling; uninstall Cinematic TV through Samsung Apps to remove it. Turn off Samsung Autorun Last App in the same native menu if it was enabled. No system watcher or service needs removal. Keep the author certificate for updates. Do not assume an older WGT can be installed as a downgrade or that uninstall preserves preferences; use a corrected higher-version package when needed.
