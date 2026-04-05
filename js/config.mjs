export const APP_VERSION = '1.1.0';
export const LOCAL_IMAGE_URLS_FILE =
  'https://geert.github.io/pexel-wallpaper/pexels_photo_urls.txt';
export const CHANGE_INTERVAL_MS = 300000; // 5 minutes
export const PHOTO_SIZE_TO_DISPLAY = 'original';
export const PEXELS_BASE_URL = 'https://api.pexels.com/v1/';
export const PHOTOS_PER_PAGE = 80;
export const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
export const FETCH_USER_AGENT = 'PexelWallpaperDynamic/1.4';
export const PEXELS_PAGE_BASE_URL = 'https://www.pexels.com/photo/';

export const STORAGE_KEYS = {
  apiKey: 'pexelWallpaper.apiKey',
  collectionId: 'pexelWallpaper.collectionId',
  lastCollectionUrl: 'pexelWallpaper.lastCollectionUrl',
};

export const SENSITIVE_QUERY_KEYS = ['apiKey', 'collectionUrl'];
