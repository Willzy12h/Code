# 0.5.0 — faster navigation and cached wallpapers

Use the seven streaming favourites followed by **All apps**. The bottom All apps shortcut remains. Hue Sync stays in the full catalogue. The requested streaming preset is applied once to the previous default row; customised smaller pin lists remain intact. The former pin order is retained locally before migration.

**Launcher Settings** now has Home & Apps, Appearance, PC & Inputs, Time & Weather, Return & Exit, and Advanced. Left returns to the category rail; Right enters its controls. Back leaves an embedded panel first. Inputs opens as a compact panel over Home and is also available under PC & Inputs → Switch input.

Under Appearance → Wallpaper, choose Curated Wikimedia for automatic photographs. Use Previous/Next, hourly rotation, theme switches and independent night dimming. The manager caches at most six downloaded images and 24 MiB of managed payload, including its boot preview. Individual downloads are limited to 6 MiB. Cache usage excludes browser database overhead and bundled assets. A full ready buffer stops fetching until an image change requires replenishment; Pause also pauses prefetching.

The initial catalogue has 25 reviewed images across five themes. Three bundled photographs are genuine 3840 × 2160 crops: a green alpine lake, a dusk cityscape and warm stone patterns. They total approximately 5.4 MiB. [Photographer and licence credits](../src/assets/wallpapers/CREDITS.md) are packaged with the app and shown for the current photograph. The catalogue is included as pinned local data, so startup does not depend on Fetch support for packaged files or a network response. The build checks that this data matches its JSON source.

A saved photo appears locally before online work. Replacements decode before the 500 ms crossfade; reduced motion swaps directly. Automatic dimming retains the saved weather timezone/solar information and local-time fallback. It does not dim text or the native HDMI picture. An older cached daily photograph is moved atomically into the counted library and retained offline until replaced. Custom HTTPS image links remain online-only; they do not expand the app's allowed fetch destinations.

Quick Lift uses an immediate local white edge and 110 ms transform, larger labels and a restrained lift. Grid navigation uses columns rather than animated geometry. Healthy Favourites movement no longer queries native HDMI source state for every key. Source changes and actual preview/fullscreen operations retain validation, ownership, timeout and recovery safeguards. The PC frame remains PC when live preview is Off.

Artwork first uses the actual installed app's icon metadata, including brands previously forced to use alternate marks. It preserves proportions with restrained padding; unavailable artwork shows a readable name. Publisher mobile artwork used in design-review screenshots is not bundled as a substitute for TV artwork. Actual TV icons still require observation on the S95H.

Optional automatic return retains its existing On/Off/Paused controls and Samsung Home pause escape in Return & Exit. No internal Home configuration, Home interception, Samsung service, persistent system helper, router or firewall setting is changed. A brief Samsung Home display before return remains expected. Cold-boot default-launcher behaviour is not promised.

## Validation and remaining observation

Windows validation covers syntax, Node regressions, staging/identity hashes, all existing browser workflows, all 40 settings actions, 1080p/4K browser layouts, real IndexedDB limits/aborted writes, decoded image swaps, provider-offline relaunch, file-origin catalogue loading, v1 cache upgrade and active unchanged CSP in sandboxed Chromium. A fresh read-only review found four issues; each received a reproducing regression and a fix. No security policy or native recovery test was weakened.

Windows HTTPS probes returned HTTP 200, JPEG content and permissive CORS for the three seed-source URLs. Controlled test responses are not proof of TV networking. Browser timing is not a measured TV frame rate, and genuine 4K wallpaper sources do not change Samsung's standard 1920 × 1080 web-app canvas.

The local delivery report records the exact commit, signed package, SHA-256, public certificate fingerprints and SDK installation result. Physical acceptance must separately cover native artwork, picture/frame alignment, remote feel, settings scrolling, startup flicker, actual online/offline wallpaper behaviour, HDMI fullscreen/Back, and Samsung Home/Settings access.

## Recovery

Export preferences under Advanced → Backup preferences before uninstalling or changing installations. For an immediate exit use Samsung Home; if automatic return is enabled, choose Return & Exit → Open Samsung Home (pause return), or turn return Off. Disable PC preview under PC & Inputs if a video fault occurs. Interrupted preview recovery remains Off.

Previous signed packages are retained locally. Do not assume this firmware permits WGT downgrade. Prefer rebuilding the retained previous source as a corrected higher version using the same author certificate. Uninstalling through Samsung Apps removes the launcher and may remove its preferences/cache; it does not require any Samsung-system rollback.

Future work: a remote-first Edit Home redesign and further TV-driven layout/artwork tuning. No ads, recommendation feed, accounts, telemetry or continuous wallpaper movement were added.
