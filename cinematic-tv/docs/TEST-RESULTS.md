> Current patch: [0.4.1 hardware feedback](TV-FEEDBACK-0.4.1.md). The user accepted initial live HDMI on the S95H and requested current-source PC preview on by default. Earlier default-off/layout notes below describe 0.4.0 and are historical; explicit Off, import and interruption recovery remain Off.

> Update, 29 October 2026: GitHub branch `gpt/cinematic-tv-v0.4.0` is authoritative. The older ZIP/patch and earlier environment limitations below are historical. See [Windows validation](LOCAL-VALIDATION.md) for independently rerun local checks and outstanding signing/hardware acceptance.

# Cinematic TV 0.4.0 — validation record

## Executed in the chat runtime

- Node.js v22.16.0 source/build syntax checks: passed.
- Node regression suite: **52 tests passed, 0 failed, 0 skipped**.
- Unsigned build: **12 runtime files**, including icon, recovery and feature modules; per-file SHA-256 manifest generated.
- Project-specific XML, app identity, public-privilege and resource checks: passed. This is not the Samsung SDK validator.
- Existing browser acceptance: passed (navigation, favourites/HDMI pinning, reorder, search/hide, weather location/settings).
- Asynchronous TVWindow mock acceptance: passed (thumbnail, source restoration, explicit fullscreen, return).
- Additional readiness browser suite: **16 scenarios passed**, including hold/double OK, launch timeout late callback, native keys, hotplug-edit focus, input pinning without catalogue, backup, interruption recovery and text Backspace.
- Browser mode: offline snapshot of application files, with Tizen/weather mocks and CSP removed in the test fixture solely to load scripts inline. Browser JavaScript results are not native TV results.

## Blocked / not performed

- Unchanged-origin HTTP/CSP smoke test: **BLOCKED**, `net::ERR_BLOCKED_BY_ADMINISTRATOR` for localhost. File navigation also blocked. The test reports this separately and CI uses `--required` to make it a failure, not a pass.
- Samsung SDK download was attempted before learning the SDK was already installed on the user's PC; the chat host could not resolve the SDK download host. No SDK/emulator ran here.
- Windows PowerShell helper has not been executed or parsed by PowerShell in this runtime. A parser gate is supplied in CI; direct documented CLI commands are included as fallback.
- Samsung account login, author/distributor certificate creation, WGT signing, trust/DUID acceptance, physical TV install and picture/audio/remote acceptance: **not performed here**.
- No Home interception, production release or TV daily-driver certification.

## Evidence

The candidate's evidence folder contains the final gate output and separate blocked-origin output. Earlier RED/GREEN logs are retained in the working session; new regressions were exercised failing before correction. The signing helper's package inspection checks payload hashes and certificate metadata, not independent XMLDSig or Samsung-chain cryptographic validity.

## Result

A locally tested **installation candidate ready for local signing**. It is not a signed or hardware-verified release. The user already has the SDK; the remaining signing inputs are the authorised Samsung TV certificate-profile name and local TV connection.
