/**
 * ============================================================================
 * MicroLedger Standard HTTP Error Representation
 * ============================================================================
 *
 * PURPOSE:
 * Custom Error subclass carrying HTTP status code, standardized application
 * error code (from SRS §8), human-readable message, and optional field details.
 */

/**
 * Standardized HTTP error class used across controllers, services, and middlewares.
 */
export class HttpError extends Error {
  /**
   * Constructs an instance of HttpError.
   *
   * @param {number} status - HTTP status code (e.g., 400, 401, 403, 404, 409, 422).
   * @param {string} code - Standardized uppercase error code (e.g., 'AUTH_INVALID_CREDENTIALS').
   * @param {string} message - User-facing error message.
   * @param {Object|Array|null} [details=null] - Optional field-level error details.
   */
  constructor(status, code, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
