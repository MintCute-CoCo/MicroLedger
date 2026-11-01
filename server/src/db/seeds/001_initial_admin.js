/**
 * ============================================================================
 * MicroLedger Seed File: 001_initial_admin.js
 * ============================================================================
 *
 * PURPOSE:
 * Provisions the initial Administrator account (`admin`) and default system
 * settings if they do not already exist. Reads administrative credentials from
 * environment variables (INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_PASSWORD, INITIAL_ADMIN_FULL_NAME).
 */

import { hashPassword } from '../../utils/passwords.js';

/**
 * Executes the initial administrator account and settings seed.
 *
 * @param {import('knex').Knex} knex - Knex query builder client.
 * @returns {Promise<void>} Resolves when initial admin and settings are seeded.
 */
export async function seed(knex) {
  const username = process.env.INITIAL_ADMIN_USERNAME?.trim();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const fullName = process.env.INITIAL_ADMIN_FULL_NAME?.trim();

  if (!username || !password || !fullName) {
    throw new Error('INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_PASSWORD, and INITIAL_ADMIN_FULL_NAME are required');
  }
  if (username.length < 3 || username.length > 50 || fullName.length > 100 || password.length < 8 || password.length > 128 || password.toLowerCase() === username.toLowerCase()) {
    throw new Error('Initial Admin values exceed the documented limits');
  }

  await knex.transaction(async (trx) => {
    const admin = await trx('users').whereRaw('lower(username) = lower(?)', [username]).first('id');
    if (!admin) {
      const passwordHash = await hashPassword(password);
      await trx('users').insert({
        username,
        password_hash: passwordHash,
        full_name: fullName,
        role: 'admin',
        must_change_password: false,
      });
    }

    const settings = [
      { key: 'currency_code', value: JSON.stringify('USD') },
      { key: 'currency_decimals', value: JSON.stringify(2) },
      { key: 'time_zone', value: JSON.stringify('UTC') },
    ];
    for (const setting of settings) {
      await trx('settings').insert(setting).onConflict('key').ignore();
    }
  });
}
