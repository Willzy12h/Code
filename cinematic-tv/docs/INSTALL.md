# Installing Cinematic TV on a Samsung TV

**v0.3.0 build status:** source project, **not** an installable signed `.wgt`. No Tizen SDK or Samsung TV certificate was available to the build environment. No installation on QE48S95HHEXXU has been performed.

## Prerequisites

- A computer with Samsung Tizen Studio, TV Extension and Samsung Certificate Extension.
- A Samsung TV in Developer Mode on the same local network, with your computer's IP permitted.
- A valid Samsung TV certificate profile generated for your device. Keep certificates and signing passwords private; do not commit them to Git.

## Packaging with Tizen Studio CLI

Open a terminal in this repository's root directory:

```sh
npm run build
bash scripts/package-wgt.sh YOUR_TV_CERTIFICATE_PROFILE
```

The wrapper runs `tizen build-web` on `dist/webapp`, then `tizen package -t wgt -s YOUR_TV_CERTIFICATE_PROFILE -- dist/webapp/.buildResult`. This is the documented SDK workflow but **has not been executed in this environment**, which has neither the Web CLI nor your TV certificate. Look for the resulting signed `.wgt`. Run `sdb devices` to confirm a TV connection. After allowing installation in Device Manager, install using the appropriate `tizen install` arguments for the target. In many CLI configurations:

```sh
tizen install -s YOUR_TV_SERIAL --name PACKAGE_NAME.wgt -- /path/to/src/.buildResult
```

Use the actual output directory and package name from your build. Some Tizen Studio versions use a different generated path. See Samsung's official [CLI instructions](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html).

## TV developer mode

Follow Samsung's current instructions for Developer Mode for your model. The remote, TV firmware and region affect the menus. Do **not** use unofficial debloat scripts or modify system services to install this build.

## Browser preview

Node.js 18+ is needed only for tests. Run `npm test` and `npm run test:browser`. Preview without the SDK using `npm run preview`, then open `http://localhost:8765`. A demo ribbon is shown and Tizen functions are simulated. Browser previews are **not** proof that Samsung TV APIs work.

## Rollback

Exit Cinematic TV (Back on Home), open Samsung's original Home/Apps interface, and uninstall Cinematic TV if unwanted. Settings are stored locally under the application and are removed by uninstalling. This build does **not** attempt to replace Smart Hub, intercept Home, auto-start, disable system components or change the TV's native settings.

## Quick acceptance checks on the S95H

1. Install and open the launcher without crash; check contrast and font sizes from a normal sofa distance.
2. Ensure favourite installed apps are populated and enter launches the correct app.
3. Check returning from apps and retaining recent entries.
4. Verify Connected/Disconnected state and HDMI numbers against Samsung Sources.
5. Open the PC HDMI input, then Back to the launcher. Confirm the native Samsung Settings key still behaves normally.
6. **Only then** enable the live HDMI preview and check whether the video plane appears and whether audio, source selection and cancellation behave safely. **Do not assume the preview is silent.** If audio, source or picture behaviour is wrong, disable it immediately.
7. Connect/disconnect another HDMI device and check the source list refreshes.
8. Install a new TV app and refresh the catalogue; add it to Home.
9. Pin HDMI 1 and a disconnected input to Home; reorder/remove favourites and restart the launcher to confirm persistence. Check that edits do not alter Samsung system settings.
10. Verify smooth D-pad focus, fast repeated navigation, access to Launcher Settings via D-pad Up from the first recent item, long OK (190 ms default), and Back/Cancel focus restoration.

## Known platform limits

- Last-used activity includes apps or inputs launched *through this launcher*. The Tizen documented general application-usage API explicitly notes mobile-only support; system-wide TV history is not implemented.
- Netflix, Apple TV, YouTube and other streaming apps do **not** expose their active interface or playback to this launcher. Preview backgrounds are static branded gradients, not video or account-specific Continue Watching information.
- HDMI video preview uses TVWindow behind a user-controlled opt-in toggle. Serialised source changes, cancellation and restoration are tested using an asynchronous mock, but clipping, audio, PIP support and Samsung firmware behaviour remain unverified on your S95H. See docs/HDMI-ACCEPTANCE.md.
- Samsung's reserved Home and Settings keys are not intercepted. Native quick-settings overlay compatibility needs on-TV validation.
- Samsung does not officially allow this application to become a complete Smart Hub replacement. Manual launch via Samsung's original Apps menu is supported.
- Weather uses Open-Meteo (default London), can search towns/postcodes, and caches recent data for offline display. The wallpaper is bundled locally unless a custom HTTPS URL is configured.


## Weather, custom backgrounds and permissions

The bundled wallpapers work offline; live weather needs access to Open-Meteo forecast and geocoding. Settings → Weather location allows a town or postcode search without GPS. Settings → Wallpaper cycles Scenic, Twilight, Dawn and Dark; Settings → Custom wallpaper URL accepts a user-supplied HTTPS image host. Custom network images may be unavailable on the TV if their server blocks direct requests; choose Scenic as fallback.

The widget manifest allows external images for user-entered HTTPS wallpaper URLs. If you prefer a strictly offline launcher, leave a bundled wallpaper selected and disable Weather. No background network job, personal account or analytics service is included.
