# 0.5.5 — quieter startup presentation

The user observed that normal 0.5.4 launch was improved, but still showed a disconnected PC preview, then a full-screen refresh before the live picture and responsive Home. Preserve accepted navigation/artwork/layout and all source/return safeguards. Do not conflate an announced SDK launch with experimental background return; leave the latter Off on the test TV.

## Corrections

- Show cached Home before scheduling device discovery after the first animation-frame opportunity. Input discovery can finish asynchronously without blocking cached navigation.
- Distinguish pending/failed input discovery from a confirmed disconnected HDMI port. A configured PC port gets its saved PC identity immediately, but no native preview or fullscreen operation is permitted until live discovery confirms availability. Pending status stays visually quiet; an attempted activation gets recoverable feedback. Real disconnected/error states remain explicit.
- Reconcile Home children by identity and displayed metadata, rather than rebuilding every favourite/recent item when only the PC connection changes. Preserve decoded artwork and the library tile; genuine metadata/order changes still update.
- Decode the first wallpaper and commit it directly, avoiding the full-screen startup crossfade layer. Later wallpaper changes retain the decoded 500 ms crossfade and reduced-motion behaviour. Loading failure retains the current image.

## Validation and limits

Startup regression uses delayed input discovery, cached app data, early D-pad movement, node identity checks, one native show, initial wallpaper layer absence, retained later crossfade and a confirmed disconnection. Existing ownership, current-source-only queue guard, return-loop budget, recovery, wallpaper and CSP checks remain required.

These remove reproduced web-UI startup transitions; a hardware compositor/native-video first-acquisition flash has not been ruled out. Do not promise completely flicker-free TV startup before observation. No new preview-frame design, everyday-toggle removal or automatic-return re-enablement is included. Give a heads-up before any TV restart, app/source change or live diagnostic. Keep previous packages/preferences; do not assume WGT downgrade support.

Automated validation on 30 October 2026: complete `npm run verify` passed (96 Node tests, build/manifest validation and 14 browser workflows); `npm run test:served` passed. A separate sandboxed Chromium unchanged-origin check verified all 38 runtime payload hashes and blocked inline scripts, remote scripts and unapproved fetches with the existing CSP. Independent startup regression review passed. No physical 0.5.5 acceptance is claimed here.

The user confirmed that they had manually enabled automatic return in normal 0.5.4. That explains the observed enabled preference; there is no evidence of a debugger/normal-mode storage discrepancy. Temporarily leave return Off for the next isolated startup test and report the final state. Physical 0.5.4 acceptance confirmed Crunchyroll remains open with return Off; startup still flickers before HDMI becomes live.
