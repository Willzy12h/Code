> Update, 29 October 2026: GitHub branch `gpt/cinematic-tv-v0.4.0` is authoritative. The older ZIP/patch and earlier environment limitations below are historical. See [Windows validation](LOCAL-VALIDATION.md) for independently rerun local checks and outstanding signing/hardware acceptance.

# Local Windows SDK / Codex handover

Run this in a local Codex/IDE session opened in the extracted project folder, not in a cloud environment. The SDK is already installed. This chat runtime has no connection to the user's PC or local TV network.

## Task to give the local agent

Read README.md, docs/INSTALL.md, docs/TEST-RESULTS.md and scripts/Tizen-Local.ps1 first. Preserve the agreed design and application identity CinemTV001.Launcher / CinemTV001. Do not redesign or add features.

1. Locate the installed Tizen Web CLI/SDB and confirm the Samsung TV/Certificate extensions. Use the existing SDK; do not reinstall it unnecessarily.
2. Run the Doctor helper. Find the existing Samsung TV certificate-profile names using the SDK without reading or printing private-key/password contents. Reuse the intended author identity. If no suitable profile exists, guide the user through Samsung → TV certificate creation and account login locally. Do not create a generic self-signed certificate and call it Samsung-authorised.
3. Use the exact TV already connected in Device Manager/SDB. If none is connected, ask for the TV IPv4 address and confirm Developer Mode contains this PC's IP. Do not scan networks, open router ports, disable firewalls or change Samsung system services. Restrict approvals to this project, the SDK and this TV endpoint.
4. If development tooling is available, run npm run verify and npm run test:served. Record actual results. The prior chat's snapshot tests are not a replacement for this real-origin or SDK run. Parse the PowerShell helper before execution; inspect and resolve any local SDK differences rather than bypassing failures.
5. Sign using the existing Samsung TV certificate profile with Tizen-Local.ps1 -Action Sign. Inspect the WGT, payload hashes, certificate metadata and SDK result. Do not expose certificates, profiles.xml, DUID or tokens in a commit, public log or chat output. Record only safe version/package and hash evidence.
6. Install and run with -Action Install only on the authorised TV. Complete the hardware acceptance checklist with the user observing the television. Keep preview off until app launches and normal source access work; do not claim picture/audio/remote checks unless actually observed.
7. Report package path, SHA-256, author-certificate fingerprint, SDK install/run result, verified checks and remaining failures. Leave Home interception, Continue Watching, companion services and system changes out of scope.

Optional repository publication: the completed source ZIP is authoritative. Before any push, read the current remote branch, preserve concurrent changes, use a feature branch and normal fast-forward commits only. Do not merge into main or publish a release/tag without a further instruction. A public repository still needs to be created/authorised separately if the GitHub connector cannot see it. Do not make the user's general Code repository public.
