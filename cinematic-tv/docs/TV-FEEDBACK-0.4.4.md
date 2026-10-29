# 0.4.4 artwork and app management

The requested changes preserve the cinematic Home and enlarged, aspect-correct preview.

- Local SVG geometry for Crunchyroll, Apple TV, Netflix, Paramount+, Spotify, Plex and Twitch comes from Simple Icons 16.36.0, pinned commit 2f67e5d1a7e5cba43c79a0ebc00abcd95fb0ea30. Only inert path data is bundled; YouTube keeps its existing vector mark. Unknown apps retain native artwork/fallbacks. Sources, original hashes, project CC0 licence, per-icon metadata and the upstream trademark/licensing disclaimer ship in assets/brands. Individual licence fields absent upstream are recorded as null, not treated as blanket trademark permission. There are no new runtime hosts, libraries or privileges.
- Hidden apps is reachable from All Apps and Settings, with individual restore and Restore all listed. Pins are preserved. Only catalogue-approved installed consumer entries are listed; unavailable IDs remain hidden and system services remain filtered. Existing Include hidden apps preference is retained. Management buttons no longer accidentally reset category filters.
- Recently used uses compact fixed-height remote targets in a content-height panel, checked with zero, one, two and six recorded items. The preview dimensions stay unchanged.

Browser/native mocks cover artwork, persistence on catalogue refresh, hide/restore without launch or pin loss, stale/system IDs, restore all and D-pad/Back focus. The settings audit now covers 38 controls. Signing, install and CI outcomes belong in the local delivery report. The user is away from the TV: automated and SDK outcomes must not be presented as observed picture/audio/remote acceptance. Simulator inspection remains deferred. Prior 0.4.3 hardware and 4K UI limitations remain applicable.
