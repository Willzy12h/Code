# Startup and automatic return: read-only proposal

No Home remapping, background worker, service or system configuration change has been implemented. This review accompanies the independent 0.4.5 UI update. It is not evidence that a community method works on the S95H.

## Supported native settings — first acceptance experiment

Samsung documents All Settings → Advanced Features → Start Screen Options (older firmware may use General & Privacy). Record every current option/value before any user-agreed change. Autorun Last App may resume the last eligible app from standby; Start with Smart Hub Home controls Samsung Home startup. Neither assigns a permanent third-party default or specifies another app's exit destination. Availability is model/app dependent. Test normal standby, a cold boot separately, exiting YouTube, and pressing native Home. Record whether Cinematic TV, Samsung Home or the input viewer appears. Never count an SDK launch as startup acceptance.

User-reported baseline on 29 October 2026: Start with Smart Hub Home is already Off, and startup returns to the last source (for example HDMI 1 PC). **Autorun Last App is absent from this TV menu**, confirmed by the user. Firmware version has not been reported. Nothing was changed. The proposed native last-app experiment cannot be performed with the reported menu. Do not invent or enable a nonexistent setting. Further default/return work needs a separately approved device-specific investigation. Suggested next experiment after agreeing values: disable Start with Smart Hub Home, enable Autorun Last App if present, open Cinematic TV and test one standby cycle. Restore the recorded values to undo. Do not change TV Plus, system services or unrelated settings.

Source: https://www.samsung.com/au/support/tv-audio-video/use-autorun-start-screen-options-on-your-samsung-tv/

## Community methods inspected, not executed

| Approach | What its source attempts | Requirements and limits | Recovery and approval |
| --- | --- | --- | --- |
| Arn0 native Home assignment | Changes the main Home app-control operation and db/appfw/home_appid through libaul/libvconf; captures other configuration and preserves the saved auto_start value | Inspected commit b35c292e5bc63648cb8fef576bf5eacd9ea488d1. Reference Q70B, Tizen 6.5, firmware T-PTMDEUC-1720.7, 32-bit UID 901. Guards check architecture/UID/firmware, not model. Our S95H is Tizen 10.0; its firmware has not been validated for these calls. Public WGT signing does not establish native helper execution permission. Current intershell is disabled. Home redirection is not independently proven cold-boot startup. | A future proposal must first establish exact firmware, read/write execution eligibility and a complete per-device snapshot. Preserve original Home operation, all touched keys, expected values and a separately accessible restore route. Uninstalling the WGT alone does not reverse the Home change. Firmware updates can invalidate restore assumptions; recovery may require support/reset. Separate explicit approval required; do not port or run this helper as part of this release. |
| Background foreground-polling relaunch | Keeps the web app background-enabled and uses a worker ticking every 50 ms, appcommon.getForegroundAppId and application.launch(selfId) to return when Samsung Home/wake viewer appears | Inspected commit 478b8c0b681c98a4b254cf2483b9793913cc5d5f. Requires background execution to survive firmware suspension and a working foreground API; declared ordinary app launch/info privileges do not prove this. It is a watcher, not a registered default. Home can appear briefly; cold boot after process removal is not guaranteed. Samsung documentation requires background-support=disable for ordinary TV web apps. No S95H compatibility claim. | Future experiment needs a separate isolated build, explicit opt-in, durable stop flag checked before every relaunch, an obvious disable/exit route, rate limits and removal verification. Otherwise it can fight intentional Home/Settings use. Restore the ordinary disabled-background build and terminate/remove any worker. Separate approval required; not recommended as production behaviour under our current constraints. |

Sources inspected at immutable commits:
- https://github.com/NelsonEU/arn0-tv/blob/b35c292e5bc63648cb8fef576bf5eacd9ea488d1/native/Control.cs
- https://github.com/NelsonEU/arn0-tv/blob/b35c292e5bc63648cb8fef576bf5eacd9ea488d1/docs/setup-tv.md
- https://github.com/dylanfernandezdelara/samsung-tv-launcher/blob/478b8c0b681c98a4b254cf2483b9793913cc5d5f/launcher/main.js
- https://github.com/dylanfernandezdelara/samsung-tv-launcher/blob/478b8c0b681c98a4b254cf2483b9793913cc5d5f/launcher/tick-worker.js
- https://github.com/dylanfernandezdelara/samsung-tv-launcher/blob/478b8c0b681c98a4b254cf2483b9793913cc5d5f/launcher/config.xml
- https://developer.samsung.com/smarttv/develop/faq/other-features.html (background-support)
- https://developer.samsung.com/tv-seller-office/guides/applications/registering-application.html (on-boot/auto-restart restrictions)

## Recommendation and acceptance gate

Ship the UI refinement as an ordinary signed app, keep Samsung Home/Settings intact, and first observe the native last-app experiment. If that does not meet the user's goal, discuss a separate device-specific investigation. Do not present either inspected workaround as portable, supported, already approved or guaranteed reversible. No credentials, DUID or private keys belong in the proposal or logs.
