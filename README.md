# Tizen Wallpaper TV App

Fullscreen wallpaper slideshow for Samsung Smart TVs, powered by [Pexels](https://www.pexels.com) photos. This is the Samsung TV frontend of the [Pexel Wallpaper](https://github.com/Geert/pexel-wallpaper) project.

## How It Works

The app displays photos from a bundled JSON file (`js/pexels_photo_data.json`, 1430 photos) in a continuous fullscreen slideshow. Photos rotate every 5 minutes with a smooth crossfade transition. The actual images are fetched at runtime from the Pexels CDN.

## Architecture

| Component | Source | Notes |
|---|---|---|
| HTML/CSS/JS | Local (bundled in `.wgt`) | Required by Samsung Store CSP |
| Photo metadata | Local JSON (`js/pexels_photo_data.json`) | Could be remote — see below |
| Photo images | Remote (`images.pexels.com`) | Fetched at runtime |
| Translations | Local JSON (`js/translations.json`) | EN, NL, DE, FR |

### Note on Local vs Remote JSON

The photo metadata JSON is currently bundled locally, but the Samsung Store CSP allows `connect-src https://geert.github.io`, so the JSON could be fetched from GitHub Pages instead. This would allow updating the photo collection without rebuilding the app. The main `pexel-wallpaper` repo already has a daily GitHub Actions workflow that keeps `pexels_photo_data.json` up to date.

## Remote Control

| Button | Action |
|---|---|
| Enter / Play / PlayPause | Toggle photo description overlay |
| Right arrow | Next photo |
| Left arrow | Previous photo |
| Back | Exit app |
| `i` key | Toggle photo info (keyboard fallback) |

## Project Structure

```
config.xml                 Tizen widget manifest (app ID, CSP, privileges)
index.html                 Main page
icon.png                   128x128 launcher icon
images/icon-512.png        512x512 Samsung Store icon
css/style.css              Styles (shared with pexel-wallpaper)
js/main.mjs                Entry point + Tizen TV integration
js/slideshow.mjs           Slideshow engine + photo loading
js/config.mjs              Constants (version, paths, timing)
js/storage.mjs             localStorage wrapper with in-memory fallback
js/status.mjs              Status overlay (loading, errors)
js/i18n.mjs                i18n (auto-detects browser language)
js/translations.json       Translation strings (EN, NL, DE, FR)
js/pexels_photo_data.json  Bundled photo metadata (1430 entries, ~326KB)
```

## Relationship to pexel-wallpaper

This repo was forked from [`Geert/pexel-wallpaper`](https://github.com/Geert/pexel-wallpaper) `docs/` directory on 2026-04-05. The core JS modules are shared:

| File | Status |
|---|---|
| `css/style.css` | Identical |
| `js/storage.mjs` | Identical |
| `js/status.mjs` | Identical |
| `js/i18n.mjs` | Identical |
| `js/translations.json` | Identical |
| `js/config.mjs` | Diverged (different file paths, version) |
| `js/main.mjs` | Diverged (Tizen init, no URL params, no API key flow) |
| `js/slideshow.mjs` | Diverged (simplified loading, no separate JSON loader) |
| `index.html` | Diverged (no PWA tags, added preconnect) |

**Planned:** Merge this repo back into `pexel-wallpaper` as a Tizen build target.

## Tizen-Specific Features

- **Screen wake lock**: `tizen.power.request('SCREEN', 'SCREEN_NORMAL')` prevents the TV from going to standby
- **Screensaver disabled**: `webapis.appcommon.setScreenSaver(OFF)` keeps the display on
- **Samsung remote keys**: Registers `MediaPlay`, `MediaPlayPause`, `MediaPause` for remote control
- **Back key exit**: Handles keyCode 10009 to exit the app properly
- **No settings UI**: Settings button is hidden; the app always uses bundled photo data

## Build & Install

Requires [Tizen Studio CLI](https://developer.tizen.org/development/tizen-studio/download) or Jellyfin2Samsung's TizenSdb, and a Samsung TV in Developer Mode.

```bash
# Package into .wgt
tizen package -t wgt -s <certificate-profile> -- .

# Install via Jellyfin2Samsung's TizenSdb
TizenSdb resign PexelWallpaper.wgt <author.p12> <distributor.p12> <password>
TizenSdb permit-install <tv-ip> <device-profile.xml> /home/owner/share/tmp/sdk_tools
TizenSdb install <tv-ip> PexelWallpaper.wgt /home/owner/share/tmp/sdk_tools
TizenSdb launch <tv-ip> PxlWallppr.TizenWallpaper
```

## Samsung Store / Tizen Technical Requirements

- **All code must be local**: `script-src 'self'` in CSP — no remote JS
- **Remote images allowed**: `img-src` includes `https://images.pexels.com`
- **Remote data fetch allowed**: `connect-src` includes `https://api.pexels.com` and `https://geert.github.io`
- **Minimum Tizen version**: 2.3 (broad TV compatibility)
- **App must handle Back key** (keyCode 10009) to exit
- **Screen must stay awake** via Tizen power API
- **`.wgt` format**: Renamed `.zip` with `config.xml` at root

## Updating Photos

Currently requires rebuilding the `.wgt`:
1. Generate new `pexels_photo_data.json` (via `fetch_pexels_urls.py` in pexel-wallpaper repo)
2. Replace `js/pexels_photo_data.json`
3. Bump `APP_VERSION` in `js/config.mjs`
4. Rebuild and reinstall `.wgt`

With remote JSON loading (not yet implemented), photo updates would be automatic.
