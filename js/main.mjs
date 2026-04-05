import { APP_VERSION, LOCAL_IMAGE_URLS_FILE, CHANGE_INTERVAL_MS, STORAGE_KEYS } from './config.mjs';
import {
  setStoredValue,
  getStoredValue,
  clearStoredValue,
  getDisplayUrl,
  sanitizeUrlInAddressBar,
  cachePhotoUrls,
  getCachedPhotoUrls,
} from './storage.mjs';
import { initStatusOverlay, showStatus, hideStatus } from './status.mjs';
import { initializeTranslations } from './i18n.mjs';
import {
  Slideshow,
  fetchPhotosFromPexelsAPI,
  loadDefaultImageList,
  normalizeEntries,
  getPexelsErrorMessage,
} from './slideshow.mjs';

document.documentElement.classList.add('js-enabled');

// --- State ---
let t = {};
let slideshow;
let uiVisible = false;
let currentAttribution = null;
let fetchController = null;
let plashObserver = null;

// --- DOM Helpers ---
const $ = (id) => document.getElementById(id);

// --- Environment Detection ---

function detectEnvironment() {
  const ua = (navigator.userAgent || '').toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();
  if (typeof window.livelyPropertyListener === 'function' || window.chrome?.webview) {
    return 'usageLivelyWindows';
  }
  if (document.documentElement.classList.contains('is-plash-app') || ua.includes('plash')) {
    return 'usagePlashMac';
  }
  if (ua.includes('livelywallpaper')) return 'usageLivelyWindows';
  if (platform.includes('mac') || ua.includes('mac os') || ua.includes('macintosh')) {
    return 'usageBrowserMac';
  }
  if (platform.includes('win') || ua.includes('windows')) return 'usageBrowserWindows';
  return 'usageBrowserOther';
}

function instructionGroup() {
  const env = detectEnvironment();
  if (env === 'usagePlashMac' || env === 'usageBrowserMac') return 'mac';
  if (env === 'usageLivelyWindows' || env === 'usageBrowserWindows') return 'windows';
  return 'other';
}

// --- Usage Indicator ---

function updateUsageIndicator(showDetails) {
  const el = $('usage-indicator');
  if (!el) return;
  let text = `Photos provided by Pexels \u00b7 v${APP_VERSION}`;
  if (showDetails && currentAttribution) {
    if (currentAttribution.alt) text += ` \u00b7 ${currentAttribution.alt}`;
    if (currentAttribution.photographer) text += ` \u00b7 ${currentAttribution.photographer}`;
  }
  el.textContent = text;
  el.setAttribute(
    'href',
    currentAttribution?.pageUrl || currentAttribution?.imageUrl || 'https://www.pexels.com'
  );
  el.classList.toggle('hidden', !uiVisible);
}

function observePlashClass() {
  if (plashObserver || !('MutationObserver' in window)) return;
  plashObserver = new MutationObserver(() => {
    if (document.documentElement.classList.contains('is-plash-app')) {
      applyInstructions();
      updateUsageIndicator();
      plashObserver.disconnect();
      plashObserver = null;
    }
  });
  plashObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

// --- Instruction Rendering ---

function renderStepWithLink(el, prefix, link, suffix) {
  if (!el) return;
  el.textContent = '';
  if (prefix) el.appendChild(document.createTextNode(prefix + ' '));
  if (link?.href) {
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.text || '';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    if (link.className) a.className = link.className;
    el.appendChild(a);
  }
  if (suffix) el.appendChild(document.createTextNode(' ' + suffix));
}

function applyInstructions() {
  const ins = t.instructions?.[instructionGroup()];
  if (!ins) return;
  const steps = document.querySelectorAll('#input-container ol li');

  renderStepWithLink(steps[0], ins.step1Prefix, {
    href: ins.step1LinkHref,
    text: ins.step1LinkText,
    className: ins.step1LinkClass,
  });

  if (steps[1]) {
    const urlEl = $('current-url-display');
    steps[1].textContent = '';
    if (ins.step2Prefix) steps[1].appendChild(document.createTextNode(ins.step2Prefix + ' '));
    if (urlEl) {
      urlEl.textContent = getDisplayUrl();
      steps[1].appendChild(urlEl);
    }
    if (ins.step2Suffix) steps[1].appendChild(document.createTextNode(' ' + ins.step2Suffix));
  }

  if (steps[2] && ins.step3) steps[2].textContent = ins.step3;

  if (ins.step4LinkHref) {
    renderStepWithLink(
      steps[3],
      ins.step4Prefix,
      { href: ins.step4LinkHref, text: ins.step4LinkText, className: ins.step4LinkClass },
      ins.step4Suffix
    );
  } else if (steps[3] && ins.step4) {
    steps[3].textContent = ins.step4;
  }

  if (steps[4] && ins.step5) steps[4].textContent = ins.step5;
}

// --- Settings Form ---

function showSettingsForm() {
  slideshow?.pause();
  const apiKeyInput = $('apiKeyInput');
  const collectionUrlInput = $('collectionUrlInput');
  if (apiKeyInput) apiKeyInput.value = getStoredValue(STORAGE_KEYS.apiKey) || '';
  if (collectionUrlInput) {
    collectionUrlInput.value = getStoredValue(STORAGE_KEYS.lastCollectionUrl) || '';
  }
  const inputError = $('input-error');
  if (inputError) inputError.textContent = '';
  $('input-container')?.classList.remove('hidden');
  hideStatus();
  document.removeEventListener('keydown', handleEscKey);
  document.addEventListener('keydown', handleEscKey);
}

function hideSettingsForm() {
  $('input-container')?.classList.add('hidden');
  document.removeEventListener('keydown', handleEscKey);
  slideshow?.resume();
}

function handleEscKey(e) {
  if (e.key === 'Escape' && !$('input-container')?.classList.contains('hidden')) {
    hideSettingsForm();
  }
}

function clearSettings() {
  fetchController?.abort();
  slideshow?.stop();
  clearStoredValue(STORAGE_KEYS.apiKey);
  clearStoredValue(STORAGE_KEYS.collectionId);
  clearStoredValue(STORAGE_KEYS.lastCollectionUrl);
  currentAttribution = null;
  updateUsageIndicator();
  showSettingsForm();
}

// --- Data Loading ---

async function loadFromAPI(apiKey, collectionId) {
  fetchController?.abort();
  fetchController = new AbortController();
  const { signal } = fetchController;

  showStatus(t.statusLoading, false, { persistent: true });

  try {
    let entries = getCachedPhotoUrls(collectionId);
    let fromCache = !!entries;

    if (!entries) {
      entries = await fetchPhotosFromPexelsAPI(apiKey, collectionId, signal);
      if (entries.length > 0) cachePhotoUrls(collectionId, entries);
    }

    if (signal.aborted) return;

    const normalized = normalizeEntries(entries);
    if (normalized.length === 0) {
      showStatus(t.statusNoPhotosFound, true, { persistent: true });
      return;
    }

    const msg = fromCache
      ? `${normalized.length} ${t.wallpaperAltWallpaper} (cached). ${t.slideshowResumed}...`
      : `${normalized.length} ${t.wallpaperAltWallpaper}. ${t.slideshowResumed}...`;
    showStatus(msg, false, { duration: 3000 });
    slideshow.start(normalized);
    hideSettingsForm();
  } catch (error) {
    if (error.name === 'AbortError' || signal.aborted) return;
    console.error('Error fetching Pexels photos:', error);
    showStatus(getPexelsErrorMessage(t, error), true, { persistent: true });
  } finally {
    fetchController = null;
  }
}

async function loadDefaults() {
  if (slideshow?.running) return;
  try {
    const images = await loadDefaultImageList({
      currentTranslations: t,
      showStatus,
      hideStatus,
      localImageUrlsFile: LOCAL_IMAGE_URLS_FILE,
    });
    const normalized = normalizeEntries(images);
    if (normalized.length > 0) {
      slideshow.start(normalized);
      hideStatus();
    }
  } catch (error) {
    console.error('Failed to load local images:', error);
    showStatus(`${t.statusLocalFileNotFound} (${error.message})`, true, { persistent: true });
  }
}

// --- URL Extraction ---

export function extractCollectionIdFromUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'www.pexels.com' && parsed.hostname !== 'pexels.com') return null;
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length < 2 || segments[0] !== 'collections') return null;
    const parts = segments[1].split('-');
    if (parts.length < 2) return null;
    const id = parts.pop();
    return /^[a-zA-Z0-9]+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

// --- Settings Button Auto-Hide ---

function isTizenTV() {
  try {
    return typeof tizen !== 'undefined' && typeof tizen.power !== 'undefined';
  } catch (_e) {
    return false;
  }
}

function initSettingsAutoHide() {
  const btn = $('settingsButton');
  const label = $('settingsButtonLabel');
  const indicator = $('usage-indicator');
  if (!btn) return;

  // Hide settings button entirely on Samsung TV
  if (isTizenTV()) {
    btn.style.display = 'none';
    if (label) label.style.display = 'none';
    return;
  }

  let hideTimer;
  let lastMove = 0;

  const show = () => {
    btn.classList.add('settings-visible');
    label?.classList.add('settings-visible');
    uiVisible = true;
    indicator?.classList.remove('hidden');
  };

  const hide = () => {
    if (document.activeElement === btn) return;
    btn.classList.remove('settings-visible');
    label?.classList.remove('settings-visible');
    uiVisible = false;
    indicator?.classList.add('hidden');
  };

  const scheduleHide = () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 5000);
  };

  const onActivity = () => {
    const now = Date.now();
    if (now - lastMove < 50) return;
    lastMove = now;
    show();
    scheduleHide();
  };

  btn.addEventListener('focus', () => {
    show();
    clearTimeout(hideTimer);
  });
  btn.addEventListener('blur', scheduleHide);
  document.addEventListener('pointermove', onActivity, { passive: true });
  document.addEventListener('touchstart', onActivity, { passive: true });
  document.addEventListener(
    'keydown',
    (e) => {
      if (['Tab', 'Shift', 'Enter', ' '].includes(e.key)) onActivity();
    },
    { passive: true }
  );

  onActivity();
}

// --- Translation ---

function translatePage() {
  if (!t) return;

  document.title = t.formTitle || 'Pexel Wallpaper';

  const btn = $('settingsButton');
  const label = $('settingsButtonLabel');
  const closeBtn = $('closeFormButton');
  if (btn) btn.title = t.settingsButtonTitle;
  if (label) label.textContent = t.settingsButtonTitle;
  if (closeBtn) closeBtn.title = t.closeFormButtonTitle;

  const h2 = document.querySelector('#input-container h2');
  if (h2) h2.textContent = t.formTitle;

  const apiLabel = document.querySelector('label[for="apiKeyInput"]');
  if (apiLabel) {
    apiLabel.childNodes[0].nodeValue = `${t.apiKeyLabel} `;
    const link = apiLabel.querySelector('a');
    if (link) link.textContent = t.findApiKeyLink;
  }

  const apiInput = $('apiKeyInput');
  if (apiInput) apiInput.placeholder = t.apiKeyPlaceholder;

  const collLabel = document.querySelector('label[for="collectionUrlInput"]');
  if (collLabel) collLabel.textContent = t.collectionUrlLabel;

  const collInput = $('collectionUrlInput');
  if (collInput) collInput.placeholder = t.collectionUrlPlaceholder;

  const startBtn = $('startButton');
  if (startBtn) startBtn.textContent = t.startButtonText;

  const resetBtn = $('resetButton');
  if (resetBtn) resetBtn.textContent = t.resetButtonText;

  applyInstructions();
  updateUsageIndicator();
}

// --- Configuration ---

function handleConfiguration() {
  const params = new URLSearchParams(window.location.search);
  const apiKey = params.get('apiKey');
  const collectionUrl = params.get('collectionUrl');
  const collectionId = collectionUrl ? extractCollectionIdFromUrl(collectionUrl) : null;

  if (apiKey && collectionId) {
    setStoredValue(STORAGE_KEYS.apiKey, apiKey);
    setStoredValue(STORAGE_KEYS.collectionId, collectionId);
    setStoredValue(STORAGE_KEYS.lastCollectionUrl, collectionUrl);
    loadFromAPI(apiKey, collectionId);
  } else {
    const storedKey = getStoredValue(STORAGE_KEYS.apiKey);
    const storedId = getStoredValue(STORAGE_KEYS.collectionId);
    if (storedKey && storedId) {
      loadFromAPI(storedKey, storedId);
    } else {
      loadDefaults();
    }
  }

  sanitizeUrlInAddressBar();
}

// --- Photo Info Toggle ---

let infoTimer = null;
let infoVisible = false;

function showPhotoInfo() {
  const el = $('usage-indicator');
  if (!el) return;
  infoVisible = true;
  uiVisible = true;
  updateUsageIndicator(true);
  clearTimeout(infoTimer);
  infoTimer = setTimeout(hidePhotoInfo, 8000);
}

function hidePhotoInfo() {
  infoVisible = false;
  uiVisible = false;
  updateUsageIndicator(false);
  clearTimeout(infoTimer);
}

function togglePhotoInfo() {
  if (infoVisible) {
    hidePhotoInfo();
  } else {
    showPhotoInfo();
  }
}

// --- Photo Change Callback ---

function onPhotoChange({ entry, index, total, element }) {
  currentAttribution = entry;
  if (element) {
    element.alt =
      entry.alt || `${t.wallpaperAltWallpaper} ${index + 1} ${t.wallpaperAltOf} ${total}`;
  }
  if (infoVisible) showPhotoInfo();
  else updateUsageIndicator(false);
}

// --- Event Listeners ---

function attachEventListeners() {
  $('settingsButton')?.addEventListener('click', showSettingsForm);
  $('closeFormButton')?.addEventListener('click', hideSettingsForm);

  // Remote control & keyboard: description, next/prev, exit
  document.addEventListener('keydown', (e) => {
    const formOpen = !$('input-container')?.classList.contains('hidden');
    if (formOpen) return;

    switch (e.keyCode) {
      case 415: // Samsung Play
      case 10252: // Samsung Play/Pause
      case 19: // Samsung Pause
      case 13: // Enter / OK
        togglePhotoInfo();
        e.preventDefault();
        break;
      case 39: // Right arrow
        slideshow?.next();
        break;
      case 37: // Left arrow
        slideshow?.prev();
        break;
      case 10009: // Samsung Back
        try {
          tizen.application.getCurrentApplication().exit();
        } catch (_e) {
          /* not on Tizen */
        }
        break;
      default:
        if (e.key === 'i' || e.key === 'I') togglePhotoInfo();
        break;
    }
  });

  $('startButton')?.addEventListener('click', () => {
    const apiKey = $('apiKeyInput')?.value.trim();
    const collectionUrl = $('collectionUrlInput')?.value.trim();
    const inputError = $('input-error');
    if (inputError) inputError.textContent = '';

    if (!apiKey || !collectionUrl) {
      if (inputError) inputError.textContent = t.errorBothRequired;
      return;
    }

    const collectionId = extractCollectionIdFromUrl(collectionUrl);
    if (!collectionId) {
      if (inputError) inputError.textContent = t.errorInvalidPexelsUrl;
      return;
    }

    setStoredValue(STORAGE_KEYS.apiKey, apiKey);
    setStoredValue(STORAGE_KEYS.collectionId, collectionId);
    setStoredValue(STORAGE_KEYS.lastCollectionUrl, collectionUrl);
    loadFromAPI(apiKey, collectionId);
  });

  $('resetButton')?.addEventListener('click', () => {
    clearSettings();
    const apiKeyInput = $('apiKeyInput');
    const collectionUrlInput = $('collectionUrlInput');
    const inputError = $('input-error');
    if (apiKeyInput) apiKeyInput.value = '';
    if (collectionUrlInput) collectionUrlInput.value = '';
    if (inputError) inputError.textContent = '';
    showStatus(t.statusSettingsCleared, false, { duration: 4000 });
  });
}

// --- Tizen TV Integration ---

function initTizen() {
  try {
    tizen.power.request('SCREEN', 'SCREEN_NORMAL');
  } catch (_e) {
    /* not on Tizen */
  }
  try {
    webapis.appcommon.setScreenSaver(
      webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF,
      function () {},
      function () {}
    );
  } catch (_e) {
    /* not on Tizen */
  }
  try {
    tizen.tvinputdevice.registerKey('MediaPlay');
    tizen.tvinputdevice.registerKey('MediaPlayPause');
    tizen.tvinputdevice.registerKey('MediaPause');
  } catch (_e) {
    /* not on Tizen */
  }
}

// --- Init ---

document.addEventListener('DOMContentLoaded', async () => {
  initTizen();
  initStatusOverlay($('status-overlay'));

  const { currentTranslations } = await initializeTranslations();
  t = currentTranslations;

  const imgs = document.querySelectorAll('#wallpaper-container .wallpaper');
  slideshow = new Slideshow(imgs[0], imgs[1], {
    interval: CHANGE_INTERVAL_MS,
    onPhotoChange,
  });

  attachEventListeners();
  translatePage();
  handleConfiguration();
  observePlashClass();
  initSettingsAutoHide();

  // Ensure page can receive key events (important for Samsung TV after redirect)
  document.body.tabIndex = -1;
  document.body.focus();
});
