# Cinematic TV v0.3.0 — S95H hardware acceptance

1. Generate a Samsung TV author/distributor profile for QE48S95HHEXXU in Tizen Studio and produce a signed `.wgt`; keep credentials private and separate from the source.
2. Install and open the launcher in Developer Mode. Check its actual resolution and scaling from the sofa. Avoid Home interception until app stability is demonstrated.
3. Confirm installed apps: YouTube, Crunchyroll, Apple TV, Netflix, Paramount+, Disney+, Prime Video, Philips Hue Sync. Check app icon visibility and launch success; use Diagnostics for failed queries.
4. Confirm installed app refresh after installing a new app and returning to launcher. Check saved favourites persist across reboots and service interruptions.
5. Confirm native Samsung quick settings continue to appear when the TV Settings button is pressed, without interference from Launcher Settings.
6. Verify short OK, long OK (190 ms default), D-pad up to Settings, large remote repeat bursts, modal cancel, move/save/cancel, hidden-app restore, HDMI pinning and app-name searches using the on-screen keyboard.
7. Identify the PC's actual HDMI port; rename it. Pin it to Favourites and check the disconnected-state fallback. Verify HDMI opening and Back to launcher.
8. Leave live HDMI preview **Off** initially; although implemented and mock-tested, the video-plane behaviour on this TV is not yet known. Only enable after step 7. Check source restoration, video-plane layout, audio, Back, rapid switching and whether turning the feature off fully restores normal TV behaviour.
9. Test local wallpapers without network; test optional weather (location, current conditions, cache/offline), and optionally one trusted custom HTTPS image URL.
10. Do not enable automatic Home/startup workarounds until explicit hardware acceptance and recovery procedure exist.
