/**
 * format.js
 *
 * Global localization formatting utilities for monetary currency, standard calendar
 * dates, ISO timestamps, and system display configurations.
 */
import { reactive } from 'vue';

export const displaySettings = reactive({
  currency_code: 'USD',
  currency_decimals: 2,
});

/**
 * Updates global reactive display settings (currency code and decimal precision).
 *
 * @param {Object} settings - Configuration payload containing currency_code and currency_decimals.
 * @returns {void}
 */
export function applyDisplaySettings(settings = {}) {
  displaySettings.currency_code = settings.currency_code || 'USD';
  displaySettings.currency_decimals = Number.isInteger(settings.currency_decimals)
    ? settings.currency_decimals
    : 2;
}

/**
 * Formats an integer cent amount into a localized currency string.
 *
 * @param {number} cents - Monetary value represented in lowest integer denomination (cents).
 * @param {string|null} [currency=null] - Optional override ISO 4217 currency code.
 * @param {number|null} [overrideDecimals=null] - Optional override decimal places.
 * @returns {string} Formatted currency representation (e.g., "$1,250.00").
 */
export function formatMoney(cents, currency = null, overrideDecimals = null) {
  const code = currency || displaySettings.currency_code;
  const decimals = Number.isInteger(overrideDecimals)
    ? overrideDecimals
    : displaySettings.currency_decimals;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(Number(cents || 0) / 100);
  } catch {
    return `${code} ${(Number(cents || 0) / 100).toFixed(decimals)}`;
  }
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
