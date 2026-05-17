# CLAUDE.md — tizenwallpaper

## Project Overview

Samsung Tizen TV app that displays a fullscreen wallpaper slideshow of Pexels photos.
This is effectively a **third frontend** of the same wallpaper system:

| Frontend | Platform | Repo | Hosted at |
|---|---|---|---|
| **Plash/Lively web app** | macOS / Windows desktop | `Geert/pexel-wallpaper` (`docs/`) | `https://geert.github.io/pexel-wallpaper/` |
| **Browser fallback** | Any browser | `Geert/pexel-wallpaper` (`docs/`) | Same GitHub Pages URL |
| **Samsung TV app** | Samsung Smart TV (Tizen) | `Geert/tizenwallpaper` (this repo) | Packaged `.wgt` sideloaded to TV |

All three frontends share the same core JS modules (slideshow engine, i18n, storage, status overlay).
The Tizen version was forked from `pexel-wallpaper/docs/` on 2026-04-05 and diverged with TV-specific changes.

**Goal:** Merge this repo back into `Geert/pexel-wallpaper` as a third frontend build target.

## Repository

- **GitHub:** https://github.com/Geert/tizenwallpaper
- **Parent repo:** https://github.com/Geert/pexel-wallpaper
- **App ID:** `PxlWallppr.TizenWallpaper`
- **Package:** `PxlWallppr`
- **Current version:** 1.11.0

## File Structure

```
config.xml                 Tizen app manifest (widget config, CSP, privileges)
index.html                 Main page (identical to pexel-wallpaper except no PWA/favicon tags)
icon.png                   128x128 launcher icon (base64-embedded, no external file)
images/icon-512.png        512x512 icon for Samsung Store
css/style.css              Styles (IDENTICAL to pexel-wallpaper/docs/css/style.css)
js/config.mjs              Constants — diverged (see below)
js/main.mjs                App entry + Tizen integration — diverged (see below)
js/slideshow.mjs           Slideshow engine + API + local loading — diverged (see below)
js/storage.mjs             localStorage wrapper (IDENTICAL)
js/status.mjs              Status overlay (IDENTICAL)
js/i18n.mjs                Internationalization (IDENTICAL)
js/translations.json       Translation strings (IDENTICAL)
js/pexels_photo_data.json  Bundled photo metadata (1430 photos, ~326KB)
```

## How Code Diverged from pexel-wallpaper

The Tizen version was created by copying `pexel-wallpaper/docs/` into this repo, then making these changes:

### config.mjs
- `APP_VERSION`: `'1.1.0'` → `'1.11.0'`
- `LOCAL_IMAGE_URLS_FILE`: `'pexels_photo_urls.txt'` → `'js/pexels_photo_data.json'`
- Removed `LOCAL_IMAGE_DATA_FILE` (pexel-wallpaper has both txt and json; Tizen only uses json)

### main.mjs — Key Differences
1. **No URL parameter handling:** pexel-wallpaper reads `?apiKey=...&collectionUrl=...` from URL params. Tizen version removed this entirely — `handleConfiguration()` always calls `loadDefaults()`.
2. **Settings button always hidden:** pexel-wallpaper hides it only when `isTizenTV()` returns true. Tizen version unconditionally hides it (dead code after `return` statement).
3. **No Pexels API flow on launch:** pexel-wallpaper checks stored API key → loads from API. Tizen version skips all that, always loads from bundled JSON.

### slideshow.mjs — Key Differences
1. **Removed `loadDefaultImageListFromJson()`**: pexel-wallpaper has two loading paths: JSON-first, then txt fallback. Tizen version only has the generic `loadDefaultImageList()` that handles both JSON and txt based on file extension/content-type.
2. **Simplified `loadDefaultImageList()` signature**: No `localImageDataFile` parameter.

### index.html — Key Differences
- No favicon/PWA tags (`<link rel="icon">`, `<link rel="manifest">`, `<meta name="theme-color">`)
- Added `<link rel="preconnect" href="https://geert.github.io">`
- Title is `"Pexel Wallpaper"` instead of `"Pexel Wallpaper (Enhanced)"`

### Tizen-Only Code (in main.mjs)
- **`initTizen()`**: Requests screen wake lock (`tizen.power.request`), disables screensaver (`webapis.appcommon.setScreenSaver`), registers media remote keys
- **Remote control handler**: Samsung keycodes (415=Play, 10252=PlayPause, 19=Pause, 10009=Back) for photo info toggle, next/prev, exit
- **`isTizenTV()` detection**: Checks for `tizen.power` global

## JSON Format Difference

**pexel-wallpaper** `pexels_photo_data.json` (wrapper object):
```json
{
  "updatedAt": "2026-04-08T...",
  "collectionId": "vmnecek",
  "totalPhotos": 1442,
  "photos": [
    { "id": 20813926, "imageUrl": "...", "alt": "...", "photographer": "...",
      "photographerUrl": "...", "pageUrl": "...", "width": 4032, "height": 3024, "avgColor": "#5E727B" }
  ]
}
```

**tizenwallpaper** `pexels_photo_data.json` (flat array):
```json
[
  { "imageUrl": "...", "alt": "...", "photographer": "...", "id": 20813926, "pageUrl": "..." }
]
```

Key differences:
- pexel-wallpaper wraps in `{ photos: [...] }` with metadata; tizen is a flat `[...]`
- pexel-wallpaper has `width`, `height`, `avgColor`; tizen does not
- pexel-wallpaper has `photographerUrl`; tizen does not

## Samsung Tizen TV — Technical Requirements

### config.xml (Tizen Manifest)
- `tizen:profile name="tv-samsung"` — targets Samsung TV specifically
- `tizen:setting hwkey-event="enable"` — enables hardware remote key events
- `required_version="2.3"` — minimum Tizen version (very broad TV compatibility)
- **CSP (Content Security Policy):**
  - `default-src 'self'` — all code must be local
  - `script-src 'self'` — no remote scripts allowed
  - `img-src 'self' https://images.pexels.com https://*.pexels.com data:` — images from Pexels CDN OK
  - `connect-src 'self' https://api.pexels.com https://geert.github.io` — fetch/XHR allowed to these origins
- **Access origins:** `api.pexels.com`, `images.pexels.com`, `geert.github.io` (all with subdomains)
- **Privileges:** `power` (screen wake), `tv.inputdevice` (remote control keys)

### Samsung Store Requirements
- All application code (HTML/CSS/JS) MUST be bundled locally in the `.wgt` package
- Remote scripts are NOT allowed (CSP `script-src 'self'`)
- Remote images ARE allowed (fetched at runtime from CDN)
- Remote data fetching (JSON, API) IS allowed via `connect-src` — **the current local-only JSON is overly conservative; a remote JSON would work fine**
- The `.wgt` file is a renamed `.zip` containing all app files + `config.xml`
- App must handle `Back` key (keyCode 10009) to exit properly
- Screen must stay awake (no screensaver) — requires `tizen.power.request('SCREEN', 'SCREEN_NORMAL')`

### Build & Deploy
Requires Tizen Studio CLI or Jellyfin2Samsung's TizenSdb tooling:
```bash
# Package
tizen package -t wgt -s <certificate-profile> -- .

# Install via Jellyfin2Samsung's TizenSdb
TizenSdb resign PexelWallpaper.wgt <author.p12> <distributor.p12> <password>
TizenSdb permit-install <tv-ip> <device-profile.xml> /home/owner/share/tmp/sdk_tools
TizenSdb install <tv-ip> PexelWallpaper.wgt /home/owner/share/tmp/sdk_tools
TizenSdb launch <tv-ip> PxlWallppr.TizenWallpaper
```

## Merge Strategy Notes

### What a merge into pexel-wallpaper should achieve
1. **Single source of truth** for shared JS modules (slideshow, storage, status, i18n, config)
2. **Tizen-specific entry point** or build step that:
   - Adds `config.xml`, `icon.png`, `images/icon-512.png`
   - Removes PWA/favicon tags from index.html
   - Unconditionally hides settings button
   - Always loads from local/remote JSON (no URL-param API key flow)
   - Includes `initTizen()` and Samsung remote key handling
3. **Shared JSON format** — reconcile the two `pexels_photo_data.json` formats (or make `loadDefaultImageList` handle both)

### Files that are identical (can be shared as-is)
- `css/style.css`
- `js/storage.mjs`
- `js/status.mjs`
- `js/i18n.mjs`
- `js/translations.json`

### Files that need reconciliation
- `js/config.mjs` — needs platform-aware `LOCAL_IMAGE_URLS_FILE` path
- `js/main.mjs` — Tizen code is a subset + extensions; needs conditional logic or separate entry point
- `js/slideshow.mjs` — pexel-wallpaper's version is a superset (has both JSON and txt loading); Tizen's version simplified it
- `index.html` — minor differences (PWA tags, preconnect)
- `pexels_photo_data.json` — different formats between repos

### Architecture Decision: Remote vs Local JSON
The current Tizen app bundles `pexels_photo_data.json` locally. This was done to "remove API dependency" but is inconsistent: images are still fetched remotely from `images.pexels.com`. The CSP already allows `connect-src https://geert.github.io`, so fetching the JSON from GitHub Pages would work and would allow photo updates without rebuilding the app. The `pexel-wallpaper` repo already has a daily GitHub Actions workflow that updates `pexels_photo_data.json`.

### Recommended approach
- Keep pexel-wallpaper's `docs/` as the web frontend (GitHub Pages)
- Add a `tizen/` directory with Tizen-specific files (`config.xml`, icons)
- Use a build script to assemble the `.wgt` from `docs/` + `tizen/` overrides
- Or: use the same `index.html` with runtime `isTizenTV()` detection (already exists in the code)

## Commit History

```
88fe59e 2026-04-06 Include all 1430 photos from collection (was 80)
fda6313 2026-04-05 Always hide settings button in Tizen build
dc23c67 2026-04-05 Bundle photo metadata locally, remove API dependency
fcc8f42 2026-04-05 Sync bundled app: description in indicator, hide settings on TV
d171884 2026-04-05 Bundle all app code locally for Samsung Store compatibility
9e06a23 2026-04-05 Replace iframe with direct redirect to GitHub Pages
3bdb36b 2026-04-05 Fix remote control by keeping focus on wrapper instead of iframe
2ce3f0b 2026-04-05 Register Play/PlayPause remote keys to toggle photo description
776e5a7 2026-04-05 Add working Tizen TV wrapper app with screen wake and remote control
1c7fed3 2025-08-26 Merge pull request #1 (remove icon.png)
8940514 2025-08-26 Embed icon as base64 data URI
665aa1b 2025-08-26 Add README.md
```

## Evolution Summary

1. **Aug 2025**: Initial Tizen wrapper created as an iframe pointing to GitHub Pages
2. **Apr 5 2026**: Major rewrite — bundled all code locally for Samsung Store:
   - First as iframe → redirect → then fully bundled
   - Copied all JS/CSS/HTML from pexel-wallpaper
   - Added Tizen API integration (power, screensaver, remote control)
3. **Apr 5 2026**: Removed Pexels API dependency, bundled photo JSON locally
4. **Apr 6 2026**: Expanded from 80 to all 1430 photos
5. **Session 2026-05-17**: Analysis confirmed remote JSON fetch is technically possible and the local-only approach was overly conservative
