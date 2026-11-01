import { requireDatabase } from '../../db/knex.js';

/**
 * Executes a callback within a managed database transaction.
 *
 * @param {Function} callback - Async function that receives the active transaction client.
 * @returns {Promise<any>} Result of the transaction callback execution.
 */
export async function runInTransaction(callback) {
  const db = requireDatabase();
  return await db.transaction(callback);
}

/**
 * Retrieves all key-value pairs stored in the settings table.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<Array<{ key: string, value: any }>>} List of setting records.
 */
export async function fetchSettings(trxOrDb) {
  const db = trxOrDb || requireDatabase();
  const rows = await db('settings').select('key', 'value');
  return rows;
}

/**
 * Inserts or updates a setting entry in the settings table using PostgreSQL ON CONFLICT (key) DO UPDATE.
 * Note: the value column is of type JSONB, so scalar values are JSON-stringified.
 *
 * @param {string} key - Setting identifier key (e.g. 'time_zone', 'currency_code').
 * @param {any} value - Setting value.
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @returns {Promise<void>}
 */
export async function upsertSetting(key, value, trx) {
  const jsonValue = JSON.stringify(value);

  await trx('settings')
    .insert({
      key,
      value: jsonValue,
    })
    .onConflict('key')
    .merge({
      value: jsonValue,
    });
}

/**
 * Records an audit log entry for changes made to system store settings.
 *
 * @param {number} actorId - User ID of the administrator updating settings.
 * @param {Object} before - Setting values prior to this update.
 * @param {Object} after - Setting values after applying this update.
 * @param {import('knex').Knex.Transaction} trx - Active database transaction client.
 * @returns {Promise<void>}
 */
export async function writeSettingsAudit(actorId, before, after, trx) {
  await trx('audit_logs').insert({
    user_id: actorId,
    action: 'settings.updated',
    entity_type: 'settings',
    details: {
      before,
      after,
    },
  });
}

/**
 * Verifies whether a given time zone name is recognized and supported by the database engine.
 *
 * @param {string} zone - IANA time zone identifier.
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or transaction.
 * @returns {Promise<boolean>} True if the database engine recognizes the time zone.
 */
export async function isTimeZoneSupportedByDb(zone, trxOrDb) {
  const db = trxOrDb || requireDatabase();
  try {
    await db.raw('SELECT (now() AT TIME ZONE ?)', [zone]);
    return true;
  } catch {
    return false;
  }
}

