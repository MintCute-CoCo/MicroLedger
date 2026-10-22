import { reactive } from 'vue';

export const displaySettings = reactive({
  currency_code: 'USD',
  currency_decimals: 2,
});

export function applyDisplaySettings(settings = {}) {
  displaySettings.currency_code = settings.currency_code || 'USD';
  displaySettings.currency_decimals = Number.isInteger(settings.currency_decimals)
    ? settings.currency_decimals
    : 2;
}

export function formatMoney(cents, currency = null) {
  const code = currency || displaySettings.currency_code;
  const decimals = displaySettings.currency_decimals;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(cents || 0) / 100);
}

/**
 * Formats a calendar date without time components (e.g., "Oct 17, 2031").
 *
 * @param {string|Date} value - Raw date string, ISO timestamp, or Date object.
 * @returns {string} Human-readable date string (e.g., "Oct 17, 2031") or fallback dash.
 */
export function formatDate(value) {
  if (!value) {
    return '—';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate);
}

/**
 * Formats a date and timestamp using the user's local system time.
 *
 * @param {string|Date} value - Raw timestamp string or Date object.
 * @returns {string} Human-readable date and time string.
 */
export function formatDateTime(value) {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsedDate);
}
