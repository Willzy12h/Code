# 0.4.6 — optional background return trial

Open Launcher Settings → Startup and exit → Enable background return (experimental).
To disable it, use Disable background return in the same panel. To use Samsung Home
without being pulled back, choose Open Samsung Home and pause return. Return stays
paused until Cinematic TV is manually reopened; there is no expiring escape timer.
Back from Cinematic TV Home and Exit Cinematic TV stop the watcher before exiting.

This is not a registered default launcher or a boot service. It never changes the
internal Home destination, intercepts Home, modifies Samsung services, or switches
inputs to bring the launcher back. Cold boot, standby resume and process eviction
are separate limitations, not promised functionality.

## Authorised implementation

- Default Off, independently stored on this TV, excluded from Home profiles and
  preference export/import. Enable explicitly after installing the update.
- Manifest background support is enabled specifically for this user-authorised
  experiment. Public privileges and executable/network CSP are unchanged; no native
  service, companion app, system write or additional network destination is added.
- Samsung's local Product API script is loaded only when enabling return. Its
  undocumented `appcommon.getForegroundAppId` is feature detected. Missing API,
  failed query/worker/launch, launch timeout, or repeated attempts fail closed.
- A same-origin worker ticks at 250 ms only while enabled and unpaused. No foreground
  query runs while Cinematic TV is visible. Only `com.samsung.tv.csfs` held for at
  least 350 ms qualifies; other apps, inputs, settings and unknown IDs do not.
- Wait for existing HDMI cleanup before returning, then recheck visibility, enabled
  state and foreground. At most one launch is pending; five-second spacing and a
  three-attempt/minute budget prevent a relaunch loop.
- Diagnostics show enabled/paused/error, query count, last check, coarse screen
  category and launch count. No app inventory, credentials or device identifiers
  are transmitted by the watcher. Recovery disables return.

## Evidence and limits

The mechanism was investigated from the community `samsung-tv-launcher` implementation
at commit `478b8c0b681c98a4b254cf2483b9793913cc5d5f`; this implementation uses a slower,
bounded watcher and a pause lasting until manual reopen. Samsung's documented AppCommon
reference does not document the foreground query, so Samsung firmware support remains
experimental and must be checked on the S95H.

Automated tests cover default Off, stable-Home-only return, YouTube/input exclusion,
pause, disable, query/launch failures, timeout, retry budget, and an unchanged-origin
UI workflow with a real worker and mocked native APIs. Device success requires user
observation and must not be inferred from those mocks or successful installation.

## Physical trial

1. Enable return, open YouTube, use Back to exit YouTube. Record whether Samsung Home
   appears briefly and Cinematic TV returns, and whether YouTube is left alone while active.
2. Open Samsung Home and pause return. Stay there for at least 10 seconds; it must stay.
3. Reopen Cinematic TV manually. Disable return, then repeat the YouTube exit; Samsung
   Home must stay. Verify normal native Home and Settings access.
4. Optional separate standby test; do not claim cold-boot autorun from a standby result.

Rollback: disable return first. The previous signed 0.4.5 package is retained, but
firmware may reject a downgrade; prefer a corrected higher-version update signed
with the same author certificate. Uninstalling this ordinary WGT stops its worker
but clears app preferences. Export preferences first. There are no Home settings to restore.

## Local release checks, 29 October 2026

npm run verify passed: 75 Node tests, all existing browser/native-mock suites, and the new served-origin real-worker workflow. npm run test:served passed. The active unchanged-origin probe matched all 21 payload hashes and blocked inline scripts, remote scripts and unapproved fetches with Chromium sandbox enabled. SDK Doctor passed. Browser controls fit at 1080p and 4K viewport sizes. Physical return, pause and disable acceptance remain pending.

A fresh read-only review identified masked HDMI cleanup failure and a retry budget that counted successful returns. Both were reproduced with failing tests and fixed; the final full suite passed. Reset all preferences also disables the separate opt-in watcher. No deferred review findings remain.

