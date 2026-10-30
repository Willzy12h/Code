# 0.5.1 — artwork and sharper Favourites

User-requested scope: retain Settings and the current page layouts; correct reported artwork and reduce the visible jump between Favourites.

- Favourites uses an interruptible 80 ms, 4% lift with a smaller vertical movement and a constant shadow. Selection retains the white edge; reduced motion remains immediate. All Apps motion is unchanged.
- Seven explicit artwork corrections: YouTube, Prime Video, BBC iPlayer, BBC Sounds, Channel 4, SmartThings and Samsung Health. Publisher-supplied App Store artwork is pinned locally with hashes and provenance in `src/assets/brands/PUBLISHER-ARTWORK.json`. These are publisher assets, not claimed Samsung TV-specific variants or openly licensed artwork. No third-party mark is fabricated; copyright and trademarks remain with their owners. Other apps retain their installed artwork. Unavailable images retain readable names. All images use contain, without cropping.
- Cinematic TV receives a screen/play identity with its name, rendered from the editable local SVG. The manifest references a new 512×423 PNG filename. Samsung Home tile refresh requires physical observation; do not uninstall the app to clear a cosmetic cache, since that risks preferences.

Validation: see the local delivery record for actual final command results and package fingerprints. Automated tests cover publisher asset hashes, image loading/failure, original proportions, repeated key presses, reduced motion, version parity and icon dimensions. Browser native APIs are mocks; they cannot prove S95H animation frame rate or Samsung Home cache behaviour.

Recovery: keep the 0.5.0 signed package and export preferences before any reinstall. Prefer a higher-version recovery package signed by the same author if needed; firmware downgrade acceptance is not assumed. This patch does not modify Samsung Home, startup configuration or background-return preferences.
