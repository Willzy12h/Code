# 0.4.7 — clear automatic-return status

Open Launcher Settings → Automatic return and exit. A separate bold status reads
Automatic return: On, Off or Paused. The action button says Turn automatic return on
or Turn automatic return off; it describes the action, not the current state. The
settings row also shows Return: On/Off/Paused.

Open Samsung Home (pause return) keeps Samsung Home available until you manually
reopen Cinematic TV. Disable uses Turn automatic return off. The mechanism,
default-Off preference, HDMI ownership safeguards and internal Home configuration
are unchanged from 0.4.6.

## S95H observation of 0.4.6

The user confirmed that return enables and Cinematic TV reopens after a split-second
Samsung Home display. The brief Samsung Home display is expected because this is
background relaunch, not Home replacement. The user also answered “it works” to the
combined Samsung Home pause and disabled-return physical checks. Native Settings
was not separately rechecked, and cold boot/standby remain unverified.

## CI correction

Run 40953333359 passed the preceding tests but failed when starting the new sandboxed
Playwright Chromium on Ubuntu 24.04: “No usable sandbox”, referring to Ubuntu's
AppArmor unprivileged-user-namespace restrictions. No application assertion failed.

The workflow now checks the installed Google Chrome and selects Playwright's
supported chrome channel for this sandboxed test. Ubuntu ships a supported AppArmor
profile for `/opt/google/chrome/chrome`. Browser sandboxing remains explicitly true;
there is no `--no-sandbox` fallback, AppArmor change or sysctl change in this fix.
The Windows test continues to use its default pinned Playwright Chromium unless
the channel is explicitly selected. Both launch paths passed the same integration
workflow locally with sandboxing enabled.

References:
- https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md
- https://playwright.dev/python/docs/browsers#google-chrome--microsoft-edge

## Recovery

Use Turn automatic return off. Open Samsung Home (pause return) provides immediate
access without changing the saved On/Off preference. Back from Cinematic TV Home or
Exit Cinematic TV stops the watcher before exiting. Reset all preferences and safe
recovery disable return. Previous signed packages are retained; do not assume WGT
downgrade is supported. Export preferences before uninstalling, which clears them.
No internal Home configuration requires restoration.
