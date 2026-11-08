/**
 * ============================================================================
 * MicroLedger Global HTTP Error Handling & 404 Middleware
 * ============================================================================
 *
 * PURPOSE:
 * Formats all unhandled route requests into standard 404 NOT_FOUND JSON responses,
 * and intercepts all application-level errors (HttpError, Zod validation, database errors)
 * into standardized MicroLedger error payloads: `{ code, message, details }`.
 * Prevents internal server stack trace and credential leakage.
 */

/**
 * Handles requests that do not match any registered endpoint, returning a 404.
 *
 * @param {import('express').Request} _req - Unmatched Express request.
 * @param {import('express').Response} res - Express response.
 * @returns {void}
 */
export function notFoundHandler(_req, res) {
  res.status(404).json({
    code: 'NOT_FOUND', message: 'The requested resource was not found.', details: null,
  });
}

/**
 * Sanitizes an error message and stack trace to scrub database credentials,
 * connection URIs, bearer tokens, and password values before writing to server logs.
 *
 * @param {Error|any} val - Error object or string.
 * @returns {string} Redacted error description safe for application logs.
 */
function sanitizeForLogs(val) {
  if (!val) return '';
  const text = typeof val === 'string' ? val : (val.stack || val.message || String(val));
  return text
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, 'postgres://[REDACTED_AUTH]@')
    .replace(/(?:password|pwd|secret|token|bearer)\s*[:=]\s*['"]?[^\s,'"]+['"]?/gi, '$1: [REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, 'Bearer [REDACTED_JWT]');
}

/**
 * Global Express error handling middleware.
 * Serializes custom HttpError instances or sanitizes internal 500 errors.
 *
 * @param {Error|import('../utils/http-error.js').HttpError} error - Captured error object.
 * @param {import('express').Request} _req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next callback.
 * @returns {import('express').Response|void} Formatted JSON error response.
 */
export function errorHandler(error, _req, res, next) {
  if (res.headersSent) return next(error);

  const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
    ? error.status
    : 500;
  const isServer = status >= 500;
  const code = isServer ? 'INTERNAL_ERROR' : (error.code ?? 'REQUEST_ERROR');
  const message = isServer ? 'An unexpected error occurred.' : error.message;

  if (isServer) {
    console.error('[ServerError]', sanitizeForLogs(error));
  }

  return res.status(status).json({
    code,
    message,
    details: isServer ? null : (error.details ?? null),
  });
}
