# Home-button / startup integration — discussion only

**Status:** NOT implemented, NOT enabled, NOT tested on the Samsung QE48S95HHEXXU. This work deliberately remains outside v0.3.0.

## Why there is an issue

Samsung Tizen lets a user install this app as a normal TV Web application, but does not offer a supported general-purpose setting to make third-party apps the native Smart Hub / Home launcher. The Samsung remote Home key normally invokes the native interface; developers are discouraged from registering or overriding reserved system keys. This cannot be guaranteed to disappear completely.

## Choices to discuss after successful installation and testing

1. **Manual launch (current, safe):** Pin Cinematic TV in Samsung Apps; keep the native Home and Settings controls untouched. It is easy to exit and uninstall.
2. **Startup shortcut (exploratory):** Investigate a supported way to launch on TV power-on, if available to TV Web apps on this firmware. This may display the prior source or Smart Hub first. No reliability claim before testing.
3. **Home watcher / service (community workaround):** AeroTizen and other projects implement background watchers or shortcuts to relaunch when Home is pressed. These can rely on undocumented behaviour or a local companion utility, can briefly expose Samsung Home, can interfere with native settings or Live TV, and may fail after firmware updates. They must be opt-in, observable, with an immediate escape hatch.
4. **External HDMI streamer:** Offers the most predictable non-Samsung interface, but changes your native TV app workflow and hardware requirements. Not the proposed solution unless necessary.

## Preconditions and recovery

Do not change any system Home component or disable Samsung services in the first hardware test. Before experimenting, confirm:

- The launcher operates reliably via the real remote (including rapid key presses and exiting apps).
- The native Settings overlay remains available even when the launcher is foreground.
- Back from fullscreen HDMI and failure states leads to a usable UI.
- Samsung Apps and Smart Hub can still be accessed to uninstall the launcher.
- A documented uninstall/power-cycle recovery path works without a developer PC.

Any future Home integration should be a separate, opt-in version with an explicit OFF switch and tests against the model's current firmware. Never make a system modification silently.
