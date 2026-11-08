/**
 * ============================================================================
 * MicroLedger Database Target Host Guard Utility
 * ============================================================================
 *
 * PURPOSE:
 * Prevents accidental execution of destructive database scripts (reset, clean)
 * against remote, cloud, or production databases, regardless of NODE_ENV.
 */

/**
 * Validates that a connection string points strictly to a safe local development target.
 * Throws a fatal Error if the target appears remote or production without explicit override.
 *
 * @param {string} connectionString - PostgreSQL connection URL.
 * @throws {Error} If target host or database name indicates production or remote host.
 */
export function assertDestructiveOperationAllowed(connectionString) {
  if (!connectionString) {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DESTRUCTIVE_DB !== 'true') {
      throw new Error(
        'Refusing to execute destructive database operation in production without ALLOW_DESTRUCTIVE_DB=true'
      );
    }
    return;
  }

  try {
    const url = new URL(connectionString);
    const host = (url.hostname || '').toLowerCase();
    const pathname = (url.pathname || '').toLowerCase();

    // Recognized local/container hosts
    const isLocalHost =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === 'postgres' ||
      host === 'db';

    // Cloud / managed providers or remote hosts
    const isCloudOrRemote =
      !isLocalHost ||
      host.includes('supabase') ||
      host.includes('neon') ||
      host.includes('rds') ||
      host.includes('railway') ||
      host.includes('render') ||
      host.includes('elephantsql') ||
      host.includes('azure') ||
      host.includes('aws');

    const isProductionName = pathname.includes('prod') || pathname.includes('live');

    // Remote or production database target check:
    // Requires explicit ALLOW_REMOTE_DESTRUCTIVE_DB=true in addition to ALLOW_DESTRUCTIVE_DB=true
    if (isCloudOrRemote || isProductionName) {
      if (
        process.env.ALLOW_DESTRUCTIVE_DB !== 'true' ||
        process.env.ALLOW_REMOTE_DESTRUCTIVE_DB !== 'true'
      ) {
        throw new Error(
          `Refusing to execute destructive database operation against remote or cloud database target (host: "${host}", db: "${pathname}"). Both ALLOW_DESTRUCTIVE_DB=true and ALLOW_REMOTE_DESTRUCTIVE_DB=true are strictly required for remote databases.`
        );
      }
    }

    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DESTRUCTIVE_DB !== 'true') {
      throw new Error(
        'Refusing to execute destructive database operation in production without ALLOW_DESTRUCTIVE_DB=true'
      );
    }
  } catch (err) {
    if (err.message.includes('Refusing to execute destructive database operation')) {
      throw err;
    }
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        `Could not verify database host safety: ${err.message}. Refusing destructive execution.`
      );
    }
  }
}
