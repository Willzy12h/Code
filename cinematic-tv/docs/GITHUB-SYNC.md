# GitHub publication — v0.4.0

The complete, source-controlled Cinematic TV v0.4.0 candidate is published on the
feature branch `gpt/cinematic-tv-v0.4.0` of `Willzy12h/Code`, under `cinematic-tv/`.
The CI workflow lives at the repository-level `.github/workflows/ci.yml`.

This is **not a signed application release**. Samsung Tizen packaging and TV
authorisation must run on the developer PC using its local signing profile.

The dedicated `Willzy12h/cinematic-tv-launcher` public repository has not
been created; do not treat this branch as publicly released. The branch has
not been merged to `main`.

The original v0.4.0 candidate ZIP remains useful for local SDK work, but
the feature branch is now the source of truth for tracked source files.
Generated files (`dist/`, signing output and browser test evidence) are
not committed. Build from source with `npm run build` and verify with
`npm run verify`. The project intentionally keeps signing credentials
out of Git.

To update an existing local clone without overwriting work, check status,
fetch, and switch the feature branch. Do not force-push or merge `main`.
