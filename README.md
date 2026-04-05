# Tizen Wallpaper TV App

Fullscreen wallpaper slideshow for Samsung Smart TVs. Loads [geert.github.io/pexel-wallpaper](https://geert.github.io/pexel-wallpaper/) in a thin Tizen wrapper that keeps the screen on and disables the TV screensaver.

## What it does

- Displays the Pexel Wallpaper slideshow fullscreen on your Samsung TV
- Keeps the screen on via the Tizen Power API (no auto-dimming or sleep)
- Disables the built-in TV screensaver
- Handles the Back button on the remote (exits the app)
- All slideshow logic runs on GitHub Pages — updates are instant, no re-deploy needed

## Project structure

```
config.xml   — Tizen app manifest (privileges, CSP, access origins)
index.html   — Local wrapper: Tizen API calls + iframe to GitHub Pages
icon.png     — 128×128 launcher icon
```

## Requirements

- Samsung Smart TV with Tizen OS (2015 or later)
- [Tizen Studio](https://developer.tizen.org/development/tizen-studio/download) on your PC
- Samsung developer account (free, for certificate signing)

## Sideloading to your TV

### 1. Enable Developer Mode on the TV

1. Open the **Apps** panel on your TV.
2. Press `12345` on the remote — a dialog appears.
3. Toggle **Developer Mode** on and enter your PC's IP address.
4. Restart the TV.

### 2. Set up Tizen Studio

1. Install Tizen Studio and the **TV Extensions** via Package Manager.
2. Open **Certificate Manager** → create a new **Samsung certificate profile**.
   - For the distributor certificate, add the **DUID** of your TV (shown in Device Manager after connecting).
3. Open **Device Manager** → click **Remote Device Manager** → add your TV's IP.
4. Connect to the TV (right-click → Connect).

### 3. Build and install

```bash
# Package the app (from the project directory)
tizen package -t wgt -s <your-certificate-profile> -- .

# Install on connected TV
tizen install -n PxlWallppr.wgt -t <device-name>
```

Or use Tizen Studio's GUI: **Run As → Tizen Web Application**.

### 4. Run

Find **Pexel Wallpaper** in the TV's app list and launch it.

## Sharing with others

**Sideloading** requires adding each TV's DUID to your certificate profile. This works for a handful of devices.

For broader distribution, submit through the [Samsung TV Seller Office](https://seller.samsungapps.com/). Note: hosted/iframe apps may require special approval from Samsung.

## Useful links

- [Samsung TV Web App Guide](https://developer.samsung.com/smarttv/develop/getting-started/overview.html)
- [Tizen Studio Download](https://developer.tizen.org/development/tizen-studio/download)
- [Samsung TV Seller Office](https://seller.samsungapps.com/)
- [Tizen Power API](https://docs.tizen.org/application/web/guides/device/power/)
- [TV Remote Control Handling](https://developer.samsung.com/smarttv/develop/guides/user-interaction/remote-control.html)
