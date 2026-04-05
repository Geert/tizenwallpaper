let statusOverlay = null;
let statusHideTimer = null;

export function initStatusOverlay(element) {
  statusOverlay = element;
}

export function showStatus(message, isError = false, options = {}) {
  if (!statusOverlay) return;

  const opts = typeof options === 'object' && options !== null ? options : {};
  const persistent = Boolean(opts.persistent);
  const duration = typeof opts.duration === 'number' ? opts.duration : 4000;

  statusOverlay.textContent = message;
  statusOverlay.classList.remove('hidden');
  statusOverlay.classList.toggle('error', Boolean(isError));
  statusOverlay.setAttribute('aria-live', isError ? 'assertive' : 'polite');

  if (statusHideTimer) {
    clearTimeout(statusHideTimer);
    statusHideTimer = null;
  }

  if (!persistent) {
    statusHideTimer = setTimeout(() => {
      if (!statusOverlay) {
        return;
      }
      statusOverlay.classList.add('hidden');
      statusOverlay.classList.remove('error');
      statusHideTimer = null;
    }, duration);
  }
}

export function hideStatus() {
  if (!statusOverlay) return;
  statusOverlay.classList.add('hidden');
  statusOverlay.classList.remove('error');
  if (statusHideTimer) {
    clearTimeout(statusHideTimer);
    statusHideTimer = null;
  }
}
