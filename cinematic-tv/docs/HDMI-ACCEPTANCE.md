# Live HDMI acceptance checklist — Samsung QE48S95HHEXXU

**Implementation:** v0.3.0 includes an opt-in native TVWindow HDMI thumbnail and explicit fullscreen input switching. It is not yet hardware-validated. Use a locally signed test package. Video-plane overlay, CEC, audio and Samsung firmware behaviour cannot be confirmed using Chromium or a JavaScript mock.

## Safe test order

1. With Live HDMI preview **Off**, open Cinematic TV and verify PC is detected on the correct port (do not assume HDMI 1 until checked). Open the source with OK and return with Back. Confirm normal picture, audio and HDMI controls remain available.
2. Confirm native Samsung quick Settings key still opens Samsung's overlay. Verify Home/Back recovery before enabling preview.
3. Return to Cinematic TV, choose **Launcher Settings → Live HDMI preview → Enable**. Select PC in Recently used. The small right-hand preview should show the source in its card. Record whether it appears, is correctly positioned and is clipped to the intended rectangle. **The implementation does not guarantee muted HDMI audio.**
4. Move focus to YouTube, Apple TV or Netflix, without pressing OK. The video preview should be hidden, with subtle static app artwork, and the TV video source should return to its previous state unless an external source change occurred.
5. Repeat the focus transition rapidly (PC → YouTube → PC → Netflix) to check for delayed overlays, stuck frames, black screens and sound changes. Test with PC turned off and disconnected.
6. Select PC and press OK to open it fullscreen. Verify the full image, Back behaviour, remote volume, source naming and the ability to return to Cinematic TV. Confirm preview source restoration does not override an explicit fullscreen selection.
7. While preview is active, open Launcher Settings and disable it. Verify immediate video-plane cleanup and preservation of app navigation. Test the television's native Settings overlay again.
8. Switch HDMI manually using Samsung's source controls while preview is active. After returning, verify Cinematic TV does not unexpectedly override the manually chosen source.
9. Use Diagnostics to record Preview state and any errors. Note TV firmware version and HDMI source behaviour; do not publish DUIDs or personal screenshots.

## If anything is wrong

- Disable **Launcher Settings → Live HDMI preview**.
- Exit the launcher using Back from Home. Use Samsung's native Source menu to choose the desired input.
- Power-cycle the TV if the firmware video plane remains stuck. Uninstall Cinematic TV from Samsung Apps if the issue persists.
- Keep Home interception deferred. This experimental feature must not be enabled by default in a distributed build until validated on the physical S95H.

## API design

Calls to `tizen.tvwindow.setSource`, `show`, `hide` and source restoration are serialised. A new selection invalidates older preview requests; app launch waits for cleanup; the previous source is only restored if Cinematic TV still owns the preview source. `show` uses the `MAIN` video window and `FRONT` z-position at the measured preview-card rectangle. This follows Samsung's documented TVWindow API shape but is not a claim of hardware compatibility.
