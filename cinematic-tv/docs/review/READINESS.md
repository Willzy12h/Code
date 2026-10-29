# v0.4.0 readiness and community-code comparison

## Findings addressed

The v0.3.0 archive contained the icon but the published GitHub tree did not. The candidate restores the icon in the complete source/staging and validates every referenced runtime file, including the new features and recovery modules. Package/application IDs remain stable.

Regression tests found and corrected: held OK swallowing non-editable settings actions; direction-key numeric fallback; Backspace closing text entry; double launch requests; late launch acknowledgement dereferencing cleared state; initial asynchronous catalogue refresh keeping focus on All Apps rather than the latest source; pinning PC when app discovery fails; input/settings refresh replacing the user's edit; unsafe imported names/IDs; late TVWindow callbacks following timeout; failed cleanup being reported as success; native recovery state being lost after an interruption.

The HDMI controller serialises commands and quarantines uncertain operations. Late callbacks attempt cleanup rather than silently executing a newer source command. Errors are retained, preview is disabled after failures, and recovery never claims success while native completion is outstanding. Current-source-only is the default preview policy. Source identity is only a public-API ownership heuristic; switching to the same source externally cannot always be distinguished.

## Reference implementations reviewed

| Project/file | Useful pattern | Decision in Cinematic TV |
|---|---|---|
| AeroTizen `launcher/js/apps.js` | Catalogue caching, successful/failed refresh distinction, HbbTV special launch routes, watcher handoff before YouTube | Preserve cache on discovery failures and add package-listener refresh. Do not copy hard-coded HbbTV IDs or watcher assumptions without TV inventory evidence. |
| AeroTizen `home-screen.js` / `settings-ui.js` from the earlier review | Remote tile movement, per-control focus preservation, settings/layout choices | Retained direct D-pad editing and expanded configuration without extra Home widgets. |
| B1ackha7TV `app/main.js`, lines 70–170 | Prefer visible app entries, conservative known-brand duplicate handling, icon fallbacks | Validate IDs/names and avoid broad aliasing (YouTube Kids/Netflix Helper stay distinct). Keep different native IDs visible rather than silently choosing an untested launch route. Manual hide/search remains available. |
| B1ackha7TV `app/main.js`, lines 227–362 | Serialised video operations, watchdogs, late-callback cleanup; launch acceptance is not foreground proof | Added timeout quarantine, cleanup results, single launch ownership and conservative history. Known direct-launch incompatibility errors can try the public default app-control operation once for the same installed ID. Permission errors do not retry. No repeated alternate system IDs. |
| Samsung TV Launcher `tools/tv-test.js` | Held-key, rapid-key, double-launch, idle/frame-timing and return tests on an actual TV | Added browser regressions for held/double keys and callbacks. Retain on-device frame-rate and native-return checks as required hardware acceptance, not a claimed local pass. |

References inspected through GitHub:
- https://github.com/helalaou/AeroTizen/blob/main/launcher/js/apps.js (observed blob `7363bd5e34892caf520d21ca71a95dac55a34381`)
- https://github.com/djwalks/B1ackha7TV/blob/main/app/main.js (observed blob `22e0553ce8ef58c349b7da4b95bf367a1ae6a5f5`)
- https://github.com/dylanfernandezdelara/samsung-tv-launcher/blob/main/tools/tv-test.js (observed blob `3f2a98e960eafca223c89deb37ef5b6d90cf8396`)

Original implementation, not a wholesale imported launcher or debloating tool. Community feature claims do not establish compatibility with the S95H.

## Quality of life included

Quick Switch; eight local Home profiles; first-run setup; PC-port chooser; input icons/names/pinning; local time/optional weather-based wallpaper; reduced-effects mode; optional link indicator; local backup download/import and text fallback; granular resets; bounded diagnostic export; manual stable-release check; cached catalogue and install/update notifications; recovery controls.

The JSON file chooser/download behaviour is browser-tested only. Samsung firmware may not support those UI routes; the text route remains available, and a genuine companion configuration service is not yet implemented. Public release checks make a request only when chosen and report failure rather than claiming no update if the repo is unavailable.

## CI and security review

Commit-pinned official Actions; contents:read; no pull_request_target; credential persistence disabled; path filters; concurrency cancellation; 15-minute job limit; pinned browser tooling; browser regression and unchanged-origin CSP smoke gates; PowerShell parser gate; unsigned-only artifact retention. No credentials, certificates or signed WGTs in the workflow. Configuration explicitly retains arbitrary HTTPS wallpaper image access, while CSP disallows remote scripts and limits fetch endpoints. This is not a universal network firewall or DNS-rebinding defence.

## Outstanding acceptance, not silently completed

- Execute the helper with the user's Windows SDK and authorised Samsung TV profile. No signed package was generated in the chat runtime.
- Verify native app launch IDs, icon access, Samsung settings overlay, real remote key-up/hold behaviour, source/video/audio and TV idle protection.
- Check native HDMI gaming/HDR/VRR behaviour. Use Samsung's source selector if embedded fullscreen differs.
- The restricted browser blocked localhost/file navigation; snapshot behaviour passes do not validate real-origin CSP. The separate served test must pass on the local PC/CI.
- Home interception/startup, unified Continue Watching and a secure companion service are deferred, not bundled as non-functional features. They need separate device evidence and threat modelling.
- A public licence and dedicated public repo remain publication decisions; existing private Code visibility must not be changed.

No independent second-agent review was available. This is a source self-review plus the recorded automated gates, not third-party certification.
