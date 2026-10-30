# 0.5.2 — direct Favourites response and launcher icon format

The user confirmed all seven publisher artwork corrections in 0.5.1. Those images are unchanged. Settings remains unchanged.

Favourites now uses a 50 ms, 2% lift with less vertical movement, closer card centres (9vw rather than 11.35vw) and stable label weights. A row of up to ten tiles fits without scrolling; larger customised rows retain scrolling. Bounded layer promotion applies only to fitted rows. Selection edges update on keydown, without waiting for an animation. The fitted-row focus path no longer calls scrollIntoView or reads JavaScript rectangles per key. Repeated selection of the same healthy PC preview skips redundant caption/attribute writes; preview ownership and invalidation checks remain intact.

The prior icon used Samsung Seller Office artwork dimensions, rather than the documented packaged Tizen launcher format. The manifest now references a root-level 117×117 RGBA PNG. The legacy packaged icon is identical; the old C artwork is no longer shipped. Application ID, signing author and preferences remain unchanged. Actual Samsung Home rendering still requires observation; no uninstall or native Home configuration changes are performed.

References:
- https://github.com/Samsung/tizen-docs/blob/master/docs/application/web/guides/development/setting-properties.md — 117×117, 32-bit PNG with alpha.
- https://developer.samsung.com/smarttv/develop/guides/fundamentals/configuring-tv-applications.html — manifest icon is the launcher icon path.

Validation and package evidence are recorded in the local delivery record. Browser checks distinguish synchronous key handling, scrolling and native-operation calls from actual remote radio latency, display presentation and hardware FPS. The latter require user observation. Keep previous signed packages and export preferences before any reinstall; prefer a higher-version recovery package with the same author if needed. Downgrade support is not assumed.
