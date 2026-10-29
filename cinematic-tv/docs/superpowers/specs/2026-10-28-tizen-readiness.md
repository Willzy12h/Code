# Cinematic TV v0.4.0 — approved-direction implementation brief

The user has authorised implementing the prior readiness review, sensible launcher features and SDK/signing work without another design round. Preserve the Cinematic Spotlight design: vertical recent apps/inputs, adjacent adaptive preview, open scenic right area, favourites below, independent launcher settings. No advertising, accounts, telemetry, autoplay, custom screensaver, system Home interception or changes to Samsung settings. Target hardware supplied by user: QE48S95HHEXXU; actual firmware and hardware remain unverified.

## Approach
Continue the existing dependency-free Tizen web app, not a native rewrite. Add tested local features and safer public-API integration. Keep risky features opt-in. Companion configuration and Continue Watching require separate authenticated integration work; supply an honest roadmap, not fake controls or unverified endpoints. Implement a local signing/deployment workflow rather than expose the TV on the internet.

## Deliverables
1. Restore complete reproducible source, strict manifest/assets checks, CI with unit and browser acceptance tests, SDK-ready package scripts.
2. Correct remote hold/press semantics, focus restoration, pending launch serialisation, safe asynchronous HDMI cleanup, failed restore visibility, and unavailable-state handling.
3. First-run setup, quick switch, saved local Home profiles, adaptive bundled wallpaper, optional network indicator, useful input naming/icons, catalogue update notifications, safe recovery, granular resets, local backup/restore and redacted diagnostics.
4. Harden URL/import/schema validation, weather cancellation/staleness handling, image fallback and network restrictions. No credentials, IDs or personal screenshots in public commits.
5. Local Windows SDK/sign/install/doctor tooling, original-signing-identity protection, local Codex handover, release and hardware acceptance checklist.
6. A code-level comparison of reference launchers and action workflow audit with file/commit evidence.

## Acceptance and boundaries
All checks which can run here must run against the final source. Browser and mock checks are not Tizen-device or emulator validation. Use a Samsung author/distributor certificate bound to the TV DUID for a genuinely installable .wgt; do not substitute an unrelated self-signed certificate. Do not read or publish signing secrets. Keep main and other projects unchanged; publish a feature branch only. No merge, release or tag requested. Hardware acceptance remains a real gate.
