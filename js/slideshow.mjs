import {
  PEXELS_BASE_URL,
  PHOTOS_PER_PAGE,
  PHOTO_SIZE_TO_DISPLAY,
  FETCH_USER_AGENT,
  PEXELS_PAGE_BASE_URL,
  LOCAL_IMAGE_URLS_FILE,
} from './config.mjs';

// --- Utilities ---

export function extractPexelsId(text) {
  if (typeof text !== 'string') return null;
  const slug = text.trim().replace(/\/$/, '');
  const photoSlugMatch = slug.match(/\/photo\/(?:[^/]*-)?(\d+)(?:\/)?$/i);
  if (photoSlugMatch?.[1]) return photoSlugMatch[1];
  const imagePathMatch = slug.match(/\/photos\/(\d+)(?:\/|$)/i);
  if (imagePathMatch?.[1]) return imagePathMatch[1];
  return null;
}

export function normalizeEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    const url = entry.trim();
    if (!url) return null;
    const id = extractPexelsId(url);
    return {
      imageUrl: url,
      pageUrl: id ? `${PEXELS_PAGE_BASE_URL}${id}/` : url.includes('pexels.com') ? url : null,
      photographer: null,
      photographerUrl: null,
      alt: null,
    };
  }
  if (typeof entry === 'object') {
    const imageUrl = entry.imageUrl || entry.src || entry.url;
    if (!imageUrl) return null;
    const id = entry.id || extractPexelsId(entry.pageUrl || '') || extractPexelsId(imageUrl);
    return {
      imageUrl,
      pageUrl: entry.pageUrl || (id ? `${PEXELS_PAGE_BASE_URL}${id}/` : null),
      photographer: entry.photographer || null,
      photographerUrl: entry.photographerUrl || null,
      alt: entry.alt || null,
    };
  }
  return null;
}

export function normalizeEntries(list) {
  return (Array.isArray(list) ? list : []).map(normalizeEntry).filter(Boolean);
}

// --- Slideshow Engine ---

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export class Slideshow {
  constructor(imgA, imgB, { interval, onPhotoChange }) {
    this._imgA = imgA;
    this._imgB = imgB;
    this._activeImg = imgA;
    this._interval = interval;
    this._onPhotoChange = onPhotoChange;
    this._entries = [];
    this._index = 0;
    this._timerId = null;
    this._active = false;
    this._generation = 0;
    this._preloader = new Image();

    this._handleVisibility = this._handleVisibility.bind(this);
    document.addEventListener('visibilitychange', this._handleVisibility);
  }

  start(entries) {
    this._generation++;
    this._clearTimer();
    this._entries = entries.slice();
    this._index = 0;
    this._active = true;

    if (this._entries.length === 0) {
      this._active = false;
      return;
    }

    shuffle(this._entries);
    this._tick();
  }

  stop() {
    this._generation++;
    this._clearTimer();
    this._entries = [];
    this._index = 0;
    this._active = false;
  }

  pause() {
    this._clearTimer();
    this._active = false;
  }

  resume() {
    if (!this._active && this._entries.length > 0) {
      this._active = true;
      this._scheduleNext();
    }
  }

  get running() {
    return this._active;
  }

  get entryCount() {
    return this._entries.length;
  }

  next() {
    if (!this._active || this._entries.length === 0) return;
    this._clearTimer();
    this._tick();
  }

  prev() {
    if (!this._active || this._entries.length === 0) return;
    this._clearTimer();
    this._index = (this._index - 2 + this._entries.length) % this._entries.length;
    this._tick();
  }

  async _tick() {
    if (this._entries.length === 0) return;

    const gen = this._generation;
    const entry = this._entries[this._index];

    await this._showImage(entry, gen);
    if (gen !== this._generation) return;

    this._onPhotoChange?.({
      entry,
      index: this._index,
      total: this._entries.length,
      element: this._activeImg,
    });

    this._index = (this._index + 1) % this._entries.length;
    if (this._index === 0) shuffle(this._entries);
    this._preloadNext();

    if (this._active && !document.hidden) {
      this._scheduleNext();
    }
  }

  async _showImage(entry, gen) {
    const next = this._activeImg === this._imgA ? this._imgB : this._imgA;
    next.src = entry.imageUrl;

    try {
      await next.decode();
    } catch {
      // decode may fail for broken images — still swap
    }

    if (gen !== this._generation) return;

    next.classList.add('active');
    this._activeImg.classList.remove('active');
    this._activeImg = next;
  }

  _preloadNext() {
    const entry = this._entries[this._index];
    if (entry) this._preloader.src = entry.imageUrl;
  }

  _scheduleNext() {
    this._clearTimer();
    this._timerId = setTimeout(() => this._tick(), this._interval);
  }

  _clearTimer() {
    if (this._timerId) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }
  }

  _handleVisibility() {
    if (document.hidden) {
      this._clearTimer();
    } else if (this._active && this._entries.length > 0) {
      this._clearTimer();
      this._tick();
    }
  }

  destroy() {
    this.stop();
    document.removeEventListener('visibilitychange', this._handleVisibility);
  }
}

// --- API Helpers ---

function buildHeaders(apiKey) {
  return { Authorization: apiKey, 'User-Agent': FETCH_USER_AGENT };
}

function buildPexelsPageUrl(photo) {
  if (photo?.id) return `${PEXELS_PAGE_BASE_URL}${photo.id}/`;
  const id =
    extractPexelsId(photo?.url || '') || extractPexelsId(photo?.src?.[PHOTO_SIZE_TO_DISPLAY] || '');
  return id ? `${PEXELS_PAGE_BASE_URL}${id}/` : null;
}

export function getPexelsErrorMessage(translations, error) {
  if (!translations) {
    return `Error fetching wallpapers${error?.status ? ` (HTTP ${error.status})` : ''}.`;
  }
  if (error?.isNetworkError) {
    return translations.statusErrorNetwork || 'Network error. Check your connection and retry.';
  }
  const status = typeof error?.status === 'number' ? error.status : null;
  if (status === 401) return translations.statusError401;
  if (status === 429) return translations.statusError429;
  if (status) {
    return (translations.statusErrorGeneric || 'Something went wrong (HTTP {status}).').replace(
      '{status}',
      status
    );
  }
  return translations.statusNoPhotosFound;
}

export async function fetchPhotosFromPexelsAPI(apiKey, collectionId, signal) {
  const entries = [];
  let nextPageUrl = `${PEXELS_BASE_URL}collections/${collectionId}?type=photos&per_page=${PHOTOS_PER_PAGE}&page=1`;
  const headers = buildHeaders(apiKey);

  while (nextPageUrl) {
    if (signal?.aborted) return entries;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort, { once: true });

    let response;
    try {
      response = await fetch(nextPageUrl, { headers, signal: controller.signal });
    } catch (err) {
      if (err.name === 'AbortError') {
        if (signal?.aborted) return entries;
        const timeout = new Error('Request timed out');
        timeout.isNetworkError = true;
        throw timeout;
      }
      err.isNetworkError = true;
      throw err;
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
    }

    if (!response.ok) {
      let details = null;
      try {
        details = await response.json();
      } catch (_e) {
        // Ignore parse errors — details stay null
      }
      const err = new Error('Pexels API error');
      err.status = response.status;
      err.details = details;
      throw err;
    }

    const data = await response.json();
    for (const photo of data.media || []) {
      if (photo.type === 'Photo' && photo.src?.[PHOTO_SIZE_TO_DISPLAY]) {
        entries.push({
          imageUrl: photo.src[PHOTO_SIZE_TO_DISPLAY],
          pageUrl: buildPexelsPageUrl(photo),
          photographer: photo.photographer || null,
          photographerUrl: photo.photographer_url || null,
          id: photo.id || null,
          alt: photo.alt || null,
        });
      }
    }

    nextPageUrl = data.next_page || null;
    if (nextPageUrl) await new Promise((r) => setTimeout(r, 200));
  }

  return entries;
}

export async function loadDefaultImageList({
  currentTranslations,
  showStatus,
  hideStatus,
  localImageUrlsFile = LOCAL_IMAGE_URLS_FILE,
}) {
  const response = await fetch(localImageUrlsFile);
  if (!response.ok) {
    showStatus(`${currentTranslations.statusLocalFileNotFound} (HTTP ${response.status})`, true, {
      persistent: true,
    });
    return [];
  }
  const text = await response.text();
  const images = text
    .split('\n')
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => {
      const id = extractPexelsId(url);
      return {
        imageUrl: url,
        pageUrl: id ? `${PEXELS_PAGE_BASE_URL}${id}/` : url.includes('pexels.com') ? url : null,
        photographerUrl: null,
        id,
      };
    });

  if (images.length === 0) {
    showStatus(currentTranslations.statusLocalFileNotFound, true, { persistent: true });
    return [];
  }

  hideStatus?.();
  return images;
}
