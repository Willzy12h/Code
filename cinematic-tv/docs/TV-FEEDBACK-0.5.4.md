# 0.5.4 — source handoff, bounded return and quieter Home refresh

User accepted 0.5.3 navigation/spacing/artwork. Preserve that UI. Live preview worked after explicit re-enable; later user reported being pulled out of Crunchyroll or back to HDMI 1. Cinematic TV was stopped, automatic return verified Off through its existing control, and clean Exit used. The user confirmed Crunchyroll stayed open normally with Cinematic TV closed. This mitigates the live loop; it does not prove its original trigger.

## Corrections

- Enforce current-source-only inside the serialised native preview operation, before ownership work and again after an asynchronous hide. A source change during debounce or queueing must not cause setSource back to PC. The explicitly allowed temporary-switch route, native ownership, late-callback quarantine and fullscreen flow remain intact.
- Keep the automatic-return rolling-minute attempt budget across successful visible returns. Previously each visible return cleared attempts, allowing a rapid successful relaunch loop to evade the limit. Three returns in a minute now disable the experimental mode; ordinary spaced-out use retains it. The user's TV preference stays Off while app-return acceptance is incomplete.
- Preserve unchanged Favourites and Recently used DOM/artwork during discovery refresh. If native preview is in flight, defer metadata rendering until it settles rather than cancelling and replacing the native picture. Home resume still reopens its preview when safe; actual metadata changes still render.
- Remove the obsolete preview-Off same-ID early return. Fresh connected input metadata now replaces a cached disconnected placeholder. This does not enable preview or clear interruption recovery automatically.

## Validation scope

Regressions cover source changes before queued execution and during hide, active-input preview/cleanup, no forced source switch under current-only policy, visible-return loops, normal spaced returns, cached boot/recovery/disconnect/reconnect status, retained artwork nodes, unchanged healthy video and refresh during in-flight native show. Full existing verification/served-origin/CSP gates remain required. Local delivery evidence records actual results.

## Remaining boundaries

Do not claim the past Crunchyroll loop's exact cause without a live trace. Keep automatic return Off on the user's TV; do not re-enable it during routine tests. Foreground API behaviour remains firmware-dependent.

User requested a later automatic-preview design without an everyday toggle, plus preview-frame renders before UI implementation. Those policy/visual changes are not in this safety patch. Samsung's pinned icon is now correct; its other app-selection views retain stale artwork and no Home-internal writes are authorised.

A separate review reproduced a wallpaper history race after cache.touch; it is recorded for a later focused correction. No broad Settings/All Apps redesign, new animation system or system helper is introduced here. Before TV-impacting installation/restarts, give the user a clear heads-up. Retain previous signed packages and preferences; do not assume firmware supports WGT downgrades.
