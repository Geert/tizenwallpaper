import { SENSITIVE_QUERY_KEYS, CACHE_DURATION_MS } from './config.mjs';

const storageFallback = {};

export function setStoredValue(key, value) {
  try {
    if (value === undefined || value === null || value === '') {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch (error) {
    if (value === undefined || value === null || value === '') {
      delete storageFallback[key];
    } else {
      storageFallback[key] = value;
    }
    console.warn('Persisted storage unavailable, using in-memory fallback:', error);
  }
}

export function getStoredValue(key) {
  try {
    const value = localStorage.getItem(key);
    if (value !== null && value !== undefined) {
      return value;
    }
  } catch (error) {
    console.warn('Persisted storage unavailable, falling back to memory for read:', error);
  }
  return storageFallback[key] || null;
}

export function clearStoredValue(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(
      'Persisted storage unavailable while clearing, removing from memory fallback.',
      error
    );
  }
  delete storageFallback[key];
}

export function getDisplayUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

export function sanitizeUrlInAddressBar() {
  try {
    const currentUrl = new URL(window.location.href);
    let updated = false;

    SENSITIVE_QUERY_KEYS.forEach((key) => {
      if (currentUrl.searchParams.has(key)) {
        currentUrl.searchParams.delete(key);
        updated = true;
      }
    });

    if (updated) {
      const newSearch = currentUrl.searchParams.toString();
      const newUrl = `${currentUrl.origin}${currentUrl.pathname}${newSearch ? `?${newSearch}` : ''}${currentUrl.hash}`;
      window.history.replaceState({}, document.title, newUrl);
    }
  } catch (error) {
    console.warn('Could not sanitize URL in address bar:', error);
  }
}

export function cachePhotoUrls(collectionId, urls) {
  const cacheEntry = {
    timestamp: new Date().getTime(),
    urls,
  };
  try {
    localStorage.setItem(`pexelCache_${collectionId}`, JSON.stringify(cacheEntry));
    console.log(`Cached URLs for collection ${collectionId}`);
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, cache not saved:', error);
    } else {
      console.error('Error saving to localStorage:', error);
    }
  }
}

export function getCachedPhotoUrls(collectionId) {
  try {
    const cachedItem = localStorage.getItem(`pexelCache_${collectionId}`);
    if (!cachedItem) return null;

    const cacheEntry = JSON.parse(cachedItem);
    const now = new Date().getTime();

    if (now - cacheEntry.timestamp > CACHE_DURATION_MS) {
      console.log(`Cache for collection ${collectionId} expired.`);
      localStorage.removeItem(`pexelCache_${collectionId}`);
      return null;
    }

    console.log(`Using cached URLs for collection ${collectionId}`);
    return cacheEntry.urls;
  } catch (error) {
    console.error('Error reading from localStorage or parsing JSON:', error);
    return null;
  }
}
