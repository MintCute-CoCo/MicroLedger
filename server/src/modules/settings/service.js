import { HttpError } from '../../utils/http-error.js';
import {
  fetchSettings,
  isTimeZoneSupportedByDb,
  runInTransaction,
  upsertSetting,
  writeSettingsAudit,
} from './repository.js';

/**
 * Default fallback configuration values for store settings.
 */
const defaults = {
  currency_code: 'USD',
  currency_decimals: 2,
  time_zone: 'UTC',
  store_name: 'MicroLedger Store',
  store_tagline: 'Retail POS & Inventory Solutions',
  store_address: '70000 Ho Chi Minh City, Vietnam',
  store_phone: '+84 (028) 3822-9999',
};

/**
 * Validates that a string is a recognized IANA time zone identifier (e.g. 'America/New_York', 'UTC')
 * and is supported by the database engine.
 *
 * @param {string} zone - Time zone string to validate.
 * @returns {Promise<boolean>} True if the time zone is valid and supported.
 * @throws {HttpError} 422 if the time zone is unparseable or unrecognized.
 */
export async function validateTimeZone(zone) {
  try {
    // Attempt instantiating Intl formatter with specified time zone
    new Intl.DateTimeFormat('en', { timeZone: zone });
  } catch {
    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'Enter a valid IANA time zone.',
      { field: 'time_zone' }
    );
  }

  const supported = await isTimeZoneSupportedByDb(zone);
  if (!supported) {
    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'The specified time zone is not supported by the database.',
      { field: 'time_zone' }
    );
  }

  return true;
}

/**
 * Retrieves current store settings merged with system defaults.
 *
 * @returns {Promise<Object>} Effective settings.
 */
export async function getSettings() {
  const rows = await fetchSettings();
  const settingsValues = { ...defaults };

  for (const row of rows) {
    settingsValues[row.key] = row.value;
  }

  return settingsValues;
}

/**
 * Atomically updates system store settings in the database and records an audit log entry.
 *
 * @param {number} actorId - User ID of the administrator modifying settings.
 * @param {Object} input - Partial settings key-value object to update.
 * @returns {Promise<Object>} Updated effective settings dictionary.
 */
export async function updateSettings(actorId, input) {
  return await runInTransaction(async (trx) => {
    // Retrieve setting rows before update for audit comparison
    const beforeRows = await fetchSettings(trx);
    const before = {};
    for (const row of beforeRows) {
      before[row.key] = row.value;
    }

    const after = {
      ...defaults,
      ...before,
      ...input,
    };

    // Upsert each provided setting key
    for (const [key, value] of Object.entries(input)) {
      await upsertSetting(key, value, trx);
    }

    // Record system audit log entry
    await writeSettingsAudit(actorId, before, after, trx);

    return after;
  });
}
