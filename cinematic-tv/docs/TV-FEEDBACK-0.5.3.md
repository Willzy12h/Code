# 0.5.3 — measured S95H focus rendering correction

Keep the approved closer Favourites spacing, publisher artwork, Settings and other menus. Remove whole-image transform animation and pre-promoted favourite layers; the existing local white selection edge appears immediately. Label weights and shadows stay constant. Short taps and held-key events still update focus directly on keydown, without input throttling or queued animation callbacks.

## Actual TV evidence

With specific user approval, Cinematic TV 0.5.2 alone was run in SDK debug mode. Five bounded 40-key samples on the actual S95H used alternating Left/Right CDP events at 75 ms spacing. These exclude physical remote radio latency, and debugger overhead means they are comparisons rather than certified production FPS.

| Temporary variant | Handler median ms | Key-to-next-rAF p95 ms | rAF gaps above 34 ms |
|---|---:|---:|---:|
| Normal 50 ms lift | 3.9 | 69.9 | 46 |
| No transition or image transform | 2.6 | 15.7 | 1 |
| No layer promotion, lift retained | 4.6 | 63.3 | 39 |
| No transform, transition, promotion or shadow | 2.9 | 15.1 | 5 |
| No Recently used backdrop blur, lift retained | 3.2 | 37.1 | 18 |

There were zero native source-query calls during these samples. The comparison supports removing moving image textures as the smallest correction. It does not prove every perceived delay has this cause. The attempted later instant-lift comparison disconnected before collecting data and supplies no result. The first physical-event window recorded no Arrow-labelled events; no physical key latency claim is based on it. User reported improvement but intermittent delay and jumps on held directions; fresh acceptance remains necessary.

The debugger and all temporary CSS/listeners were removed by terminating only Cinematic TV and relaunching normally with debug 0. The SDB port forward was removed. No system services, Home configuration, root access or firewall changes.

## Installed icon diagnosis

The live Application API reported CinemTV001.Launcher version 0.5.2 and registered path `/opt/usr/apps/CinemTV001/shared/res/CinemTV001.Launcher.png`. Both the packaged and registered icon decoded to the same new 117×117 screen/play image (identical canvas PNG SHA-256 d986b29ced6ced9cb0b37d08265a5a10b201b479cb85bb722f7f33394d82681a). This is decoded image evidence, not the original signed PNG file hash. Samsung Home still showed the old C to the user; do not claim that display issue is fixed or change Home internals. Further app-icon changes are not justified by this evidence.

Automated verification, package evidence, CI and installation are recorded in the local delivery report. Retain prior packages, export preferences before reinstalling, and prefer a same-author higher-version recovery build; downgrade acceptance is not assumed.

Samsung memory guidance also warns about unnecessary compositing layers and forced promotion: https://developer.samsung.com/smarttv/develop/guides/web-app-memory-optimization-guide.html . The device comparisons, rather than generic browser optimisation assumptions, determine this patch.
