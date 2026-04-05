const FALLBACK_TRANSLATIONS = {
  us: {
    settingsButtonTitle: 'Settings',
    closeFormButtonTitle: 'Close',
    formTitle: 'Wallpapers',
    apiKeyLabel: 'API Key:',
    collectionUrlLabel: 'Collection URL:',
    collectionUrlPlaceholder: 'e.g., https://www.pexels.com/collections/wallpapers-vmnecek/',
    startButtonText: 'Start',
    resetButtonText: 'Reset saved settings',
    statusLoading: 'Loading...',
    errorBothRequired: 'API Key and Collection URL are required.',
    errorInvalidPexelsUrl: 'Invalid Collection URL.',
    statusSettingsCleared: 'Stored API settings cleared. Enter new details to resume.',
    statusError401: 'Unauthorized: please double-check your Pexels API key.',
    statusError429: 'Rate limit reached. Wait a moment before trying again.',
    statusErrorGeneric: 'Something went wrong (HTTP {status}). Please try again later.',
    statusErrorNetwork: 'Network error while contacting Pexels. Check your connection and retry.',
    statusLocalFileNotFound:
      'Default wallpaper file (pexels_photo_urls.txt) not found or empty. Run fetch_pexels_urls.py or configure a Pexels API source.',
    usageLabel: 'Using',
    usagePlashMac: 'Plash on macOS',
    usageLivelyWindows: 'Lively on Windows',
    usageBrowserMac: 'Browser on macOS',
    usageBrowserWindows: 'Browser on Windows',
    usageBrowserOther: 'Browser',
    instructions: {
      mac: {
        step1Prefix: 'Install Plash:',
        step1LinkText: 'Open Plash in App Store',
        step1LinkHref: 'https://apps.apple.com/app/plash/id1494023538',
        step1LinkClass: 'setup-button plash-button',
        step2Prefix: "In Plash, under 'Websites', add this URL:",
        step3: 'Enable Browsing Mode in Plash and continue via the screen on your desktop.',
        step4Prefix: 'By default, wallpapers from ',
        step4LinkText: 'Pexels Wallpaper Collection',
        step4LinkHref: 'https://www.pexels.com/nl-nl/collections/wallpapers-vmnecek/',
        step4LinkClass: 'collection-link',
        step4Suffix: ' are shown.',
        step5:
          'To use another collection, enter your Pexels API key and paste that collection URL below.',
      },
      windows: {
        step1Prefix: 'Install Lively Wallpaper:',
        step1LinkText: 'Open Lively in Microsoft Store',
        step1LinkHref: 'https://apps.microsoft.com/detail/9NTM2QC6QWS7',
        step1LinkClass: 'setup-button plash-button',
        step2Prefix: "In Lively, choose the '+' button and add this URL:",
        step3: 'Apply the wallpaper in Lively so it runs on your desktop.',
        step4Prefix: 'By default, wallpapers from ',
        step4LinkText: 'Pexels Wallpaper Collection',
        step4LinkHref: 'https://www.pexels.com/nl-nl/collections/wallpapers-vmnecek/',
        step4LinkClass: 'collection-link',
        step4Suffix: ' are shown.',
        step5:
          'To use another collection, enter your Pexels API key and paste that collection URL below.',
      },
      other: {
        step1Prefix: 'Open this wallpaper in your browser:',
        step1LinkText: 'Bookmark this page',
        step1LinkHref: 'https://geert.github.io/pexel-wallpaper/',
        step1LinkClass: 'setup-button plash-button',
        step2Prefix: 'Add this URL to your preferred wallpaper app:',
        step3: 'Keep this page running so the slideshow stays active.',
        step4Prefix: 'By default, wallpapers from ',
        step4LinkText: 'Pexels Wallpaper Collection',
        step4LinkHref: 'https://www.pexels.com/nl-nl/collections/wallpapers-vmnecek/',
        step4LinkClass: 'collection-link',
        step4Suffix: ' are shown.',
        step5:
          'To use another collection, enter your Pexels API key and paste that collection URL below.',
      },
    },
  },
};

let allTranslations = FALLBACK_TRANSLATIONS;
let currentTranslations = FALLBACK_TRANSLATIONS.us;
let currentLang = 'us';

export function getBrowserLanguage() {
  const lang = navigator.language || navigator.userLanguage || 'us';
  return lang.split('-')[0].toLowerCase();
}

async function loadTranslationsFromFile() {
  const response = await fetch('js/translations.json');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function initializeTranslations() {
  try {
    allTranslations = await loadTranslationsFromFile();
    console.log('Translations loaded successfully.');
  } catch (error) {
    console.error('Could not load translations:', error);
    allTranslations = FALLBACK_TRANSLATIONS;
  }

  currentLang = getBrowserLanguage();
  currentTranslations =
    allTranslations[currentLang] || allTranslations.us || FALLBACK_TRANSLATIONS.us;
  return { currentLang, currentTranslations, allTranslations };
}

export function setCurrentLanguage(lang) {
  currentLang = lang;
  currentTranslations =
    allTranslations[currentLang] || allTranslations.us || FALLBACK_TRANSLATIONS.us;
  return currentTranslations;
}
