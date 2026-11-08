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
  time_zone: 'UTC',
  store_name: 'MicroLedger Store',
  store_tagline: 'Retail POS & Inventory Solutions',
  store_address: '70000 Ho Chi Minh City, Vietnam',
  store_phone: '+84 (028) 3822-9999',
  receipt_footer: 'Please retain this physical receipt for customer service and warranty claims.',
});

/**
 * Updates global reactive display settings (currency code, precision decimals, store time zone, and profile).
 *
 * @param {Object} settings - Configuration payload containing currency, time zone, and store metadata.
 * @returns {void}
 */
export function applyDisplaySettings(settings = {}) {
  displaySettings.currency_code = settings.currency_code || 'USD';
  displaySettings.currency_decimals = Number.isInteger(settings.currency_decimals)
    ? settings.currency_decimals
    : 2;

  if (settings.time_zone) {
    displaySettings.time_zone = String(settings.time_zone).trim();
  }

  if (settings.store_name !== undefined && settings.store_name !== null) {
    displaySettings.store_name = String(settings.store_name).trim();
  }
  if (settings.store_tagline !== undefined && settings.store_tagline !== null) {
    displaySettings.store_tagline = String(settings.store_tagline).trim();
  }
  if (settings.store_address !== undefined && settings.store_address !== null) {
    displaySettings.store_address = String(settings.store_address).trim();
  }
  if (settings.store_phone !== undefined && settings.store_phone !== null) {
    displaySettings.store_phone = String(settings.store_phone).trim();
  }
  if (settings.receipt_footer !== undefined && settings.receipt_footer !== null) {
    displaySettings.receipt_footer = String(settings.receipt_footer).trim();
  }
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
 * Formats a calendar date without time components in the configured store time zone (e.g., "Oct 17, 2031").
 * Conforms to SRS-UI-07: dates display in the store time zone.
 *
 * @param {string|Date} value - Raw date string, ISO timestamp, or Date object.
 * @param {string|null} [overrideTimeZone=null] - Optional override time zone identifier.
 * @returns {string} Human-readable date string (e.g., "Oct 17, 2031") or fallback dash.
 */
export function formatDate(value, overrideTimeZone = null) {
  if (!value) {
    return '—';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  const targetTimeZone = overrideTimeZone || displaySettings.time_zone || 'UTC';
  const formatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };

  try {
    if (targetTimeZone) {
      formatOptions.timeZone = targetTimeZone;
    }
    return new Intl.DateTimeFormat('en-US', formatOptions).format(parsedDate);
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(parsedDate);
  }
}

/**
 * Formats a date and timestamp in the configured store time zone.
 * Conforms to SRS-UI-07: dates and times display in the store time zone.
 *
 * @param {string|Date} value - Raw timestamp string or Date object.
 * @param {string|null} [overrideTimeZone=null] - Optional override time zone identifier.
 * @returns {string} Human-readable date and time string.
 */
export function formatDateTime(value, overrideTimeZone = null) {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  const targetTimeZone = overrideTimeZone || displaySettings.time_zone || 'UTC';
  const formatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };

  try {
    if (targetTimeZone) {
      formatOptions.timeZone = targetTimeZone;
    }
    return new Intl.DateTimeFormat('en-US', formatOptions).format(parsedDate);
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(parsedDate);
  }
}
