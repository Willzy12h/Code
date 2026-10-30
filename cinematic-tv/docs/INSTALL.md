> Current candidate: [0.5.4 source handoff, bounded return and quieter Home refresh](TV-FEEDBACK-0.5.4.md). Earlier version-specific counts and acceptance notes below are historical.

> Current candidate: [0.5.0 navigation, compact Settings and wallpaper manager](TV-FEEDBACK-0.5.0.md). Earlier version-specific results below remain historical; the local delivery report distinguishes automated checks, SDK installation and physical observation.

> Current patch: [0.4.1 hardware feedback](TV-FEEDBACK-0.4.1.md). The user accepted initial live HDMI on the S95H and requested current-source PC preview on by default. Earlier default-off/layout notes below describe 0.4.0 and are historical; explicit Off, import and interruption recovery remain Off.

# Sign and install Cinematic TV 0.4.0 using your existing SDK

This is a Samsung Tizen **web application (`.wgt`)**, not an APK. The supplied code/staging is unsigned. Signing and the final TV test happen on your Windows PC; no reinstall of a working SDK is needed.

## 1. One-time TV and certificate setup

Check Package Manager has **Web CLI**, the appropriate **Samsung TV Extension** and **Samsung Certificate Extension**. Do not install a generic Android SDK.

On the TV, open Apps → App Settings and enter `12345`. Enable Developer Mode, enter the **PC's** local IPv4 address, and reboot as the TV requires. In Tizen Studio → Tools → Device Manager, add the **TV's** IPv4 address and connect it (normally port 26101). Both devices must be on the same trusted local network. Do not expose this port through the router.

In Tools → Certificate Manager: Add (+) → Samsung → TV → create a profile named, for example, **CinematicTV**. Create/import an author certificate, sign in to your Samsung account locally, and create the distributor certificate at **Public** privilege level with the connected TV's **DUID** selected. These features require public privileges only. Back up the author/distributor certificates and passwords securely outside the repository. Reuse the same author identity for every update.

In Device Manager, use **Permit to install applications** where the SDK exposes/requires it. If your existing Samsung TV profile already covers this TV, reuse it instead of creating a different author identity.

Official references:
- https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html
- https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html
- https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html

## 2. Windows helper

Check out the authoritative `gpt/cinematic-tv-v0.4.0` branch and open PowerShell in `cinematic-tv`, containing `package.json`, `src` and `scripts`. Run `npm run build` first: `dist/` is ignored and is not supplied by GitHub. See [Windows validation](LOCAL-VALIDATION.md) for current checks. These commands assume `C:\tizen-studio`; change that path only if your SDK is elsewhere.

```powershell
.\scripts\Tizen-Local.ps1 -Action Doctor -SdkRoot 'C:\tizen-studio'
.\scripts\Tizen-Local.ps1 -Action Sign -SdkRoot 'C:\tizen-studio' -CertificateProfile 'CinematicTV'
```

Signing produces `signed\Cinematic-TV-0.4.0.wgt` plus a local checks JSON recording SHA-256 and embedded public certificate fingerprints. It does not embed your private keys. It verifies staged payload bytes against the build manifest and checks signature/certificate structure and validity dates. It **does not independently validate the XML signatures or the Samsung trust chain**; SDK packaging and the television are the signing/authorisation gates.

If Windows says the downloaded script is blocked, inspect it, then unblock **that file only**:

```powershell
Unblock-File .\scripts\Tizen-Local.ps1
```

Do not change the machine-wide execution policy. A policy-managed PC may require an approved local PowerShell execution route; the direct SDK commands below avoid the helper entirely.

Replace the placeholder with the TV's actual IPv4 address:

```powershell
.\scripts\Tizen-Local.ps1 -Action Install -SdkRoot 'C:\tizen-studio' -TvAddress 'YOUR_TV_IPV4_ADDRESS'
```

This connects only to that target, checks it appears as an authorised SDB device, installs the verified WGT and asks the SDK to run `CinemTV001.Launcher`. An SDK command success is not confirmation of the TV picture or remote behaviour. The helper does not enable preview or redirect Samsung Home.

The earlier cloud runtime could not execute the helper. Local Windows PowerShell parsing, Doctor, Samsung signing, package inspection, TV installation and SDK launch have now passed; physical acceptance remains incomplete. See [Windows validation](LOCAL-VALIDATION.md). The helper contains no credentials or guessed TV IP.

## 3. Direct SDK commands (fallback)

Run `npm run build` to generate the unsigned `dist\webapp` folder from this checkout. In PowerShell:

```powershell
$Tizen = 'C:\tizen-studio\tools\ide\bin\tizen.bat'
$Sdb = 'C:\tizen-studio\tools\sdb.exe'
& $Tizen version
& $Tizen security-profiles list
& $Tizen build-web -- "$PWD\dist\webapp"
& $Tizen package -t wgt -s CinematicTV -- "$PWD\dist\webapp\.buildResult"
Get-ChildItem .\dist\webapp -Filter *.wgt -Recurse
```

Use the actual generated WGT name and directory in the following commands, and the exact device serial shown by `sdb devices`:

```powershell
& $Sdb connect 'YOUR_TV_IPV4_ADDRESS:26101'
& $Sdb devices
& $Tizen install -s 'YOUR_TV_IPV4_ADDRESS:26101' --name 'ACTUAL_PACKAGE.wgt' -- 'ACTUAL_PACKAGE_DIRECTORY'
& $Tizen run -s 'YOUR_TV_IPV4_ADDRESS:26101' -p 'CinemTV001.Launcher'
```

`run -p` takes the **application ID**, not just `CinemTV001`. Do not rename a ZIP to `.wgt` and assume it is signed.

If Certificate Manager knows the profile but Web CLI cannot find it, use the real `profiles.xml` path from your local workspace:

```powershell
& $Tizen cli-config -g 'default.profiles.path=C:\YOUR_WORKSPACE\.metadata\.plugins\org.tizen.common.sign\profiles.xml'
```

That changes the CLI's global profile location; use it only when necessary. Do not paste or upload `profiles.xml`, `.p12` files, tokens or passwords to chat/GitHub.

## 4. First television acceptance

Leave HDMI preview **Off** initially. Confirm Home renders, the installed-app catalogue is real, your most-used apps launch, remote OK/Back/held OK work, favourites persist after closing, and native Samsung Settings/Home still function. Choose and pin the actual PC port rather than assuming HDMI 1.

Test fullscreen HDMI next, including audio, picture settings, PC text clarity, HDR/VRR/Game Mode where relevant. The TVWindow route is not certified to preserve every native source mode. Use Samsung Sources if anything differs.

Then enable preview. It defaults to the current TV source only, so merely browsing another HDMI tile cannot intentionally switch sources. Test rapid movement, unplug/replug, app switching, suspension and exit. It may still produce HDMI audio. Follow `HDMI-ACCEPTANCE.md` and disable preview on any fault. The TV's built-in idle protection is left untouched; confirm it behaves as expected with preview enabled.

## 5. Recovery and updates

Use native Home/Settings to leave a fault. Disable preview under Launcher Settings; the Recover HDMI action attempts cleanup but will not pretend a still-pending native callback is complete. An interrupted preview is disabled on next startup. Uninstall the launcher through Samsung Apps to revert; there are no watcher services or system patches to undo.

Back up preferences before an update or uninstall. Keep the author certificate unchanged. Do not assume Samsung preserves all application data during a reinstall or accepts an older version as a downgrade. Re-sign a corrected higher-version build when needed.
