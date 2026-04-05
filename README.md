# Tizen Wallpaper TV App

Fullscreen wallpaper slideshow for Samsung Smart TVs. All app code runs locally (for Samsung Store compatibility), while photos are fetched dynamically from the Pexels API. The fallback photo list auto-updates from GitHub Pages.

## Architecture

- **Local (bundled in .wgt):** HTML, CSS, JavaScript, translations, icon
- **Remote (fetched at runtime):** Pexels API photos, fallback photo URLs from GitHub Pages
- **Auto-updating photos:** The Pexels API is queried on each launch (24h cache). New photos added to the collection appear automatically.
- **Fallback photo list:** Fetched from `https://geert.github.io/pexel-wallpaper/pexels_photo_urls.txt`, updated daily by GitHub Actions.

## Remote control

| Button | Action |
|---|---|
| Enter / Play | Toggle photo description |
| Right arrow | Next photo |
| Left arrow | Previous photo |
| Back | Exit app |

## Project structure

```
config.xml           Tizen app manifest
index.html           Main page
icon.png             128x128 launcher icon
css/style.css        Styles
js/main.mjs          App entry point + Tizen integration
js/slideshow.mjs     Slideshow engine + API fetching
js/config.mjs        Constants (version, API URLs, timing)
js/storage.mjs       localStorage wrapper
js/status.mjs        Status overlay
js/i18n.mjs          Internationalization
js/translations.json Translation strings
```

## Build & install

Requires [Tizen Studio CLI](https://developer.tizen.org/development/tizen-studio/download) and a Samsung TV in Developer Mode.

```bash
# Package
tizen package -t wgt -s <certificate-profile> -- .

# Install (via Jellyfin2Samsung's TizenSdb)
TizenSdb resign PexelWallpaper.wgt <author.p12> <distributor.p12> <password>
TizenSdb permit-install <tv-ip> <device-profile.xml> /home/owner/share/tmp/sdk_tools
TizenSdb install <tv-ip> PexelWallpaper.wgt /home/owner/share/tmp/sdk_tools
TizenSdb launch <tv-ip> PxlWallppr.TizenWallpaper
```

## Updating

- **New photos:** Add to your Pexels collection — the app picks them up automatically (24h cache)
- **Code changes:** Bump `APP_VERSION` in `js/config.mjs`, rebuild .wgt, reinstall
- **Fallback list:** Updated automatically by GitHub Actions daily
