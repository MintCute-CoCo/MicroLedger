import { HttpError } from '../../utils/http-error.js';
import { auditQuerySchema } from './schema.js';
import { listAuditLogs } from './service.js';

/**
 * Controller to handle incoming HTTP requests for listing audit logs.
 *
 * Purpose:
 * Receives the HTTP request, validates and parses the query parameters against
 * the audit query schema, invokes the service layer to fetch the matching
 * audit logs, and returns the results as a JSON response.
 *
 * Inputs:
 * @param {import('express').Request} req - The incoming Express HTTP request containing query parameters.
 * @param {import('express').Response} res - The Express HTTP response object.
 *
 * Expected Output:
 * @returns {Promise<import('express').Response>} Express response with HTTP status 200 and the paginated audit logs JSON.
 * @throws {HttpError} Throws HTTP 422 VALIDATION_FAILED when query string parameters fail schema validation.
 */
export async function listAuditLogsController(req, res) {
  // 1. Safely parse incoming query parameters using the Zod validation schema
  const parseResult = auditQuerySchema.safeParse(req.query);

  // 2. Check if validation failed; if so, extract error details and throw HttpError 422
  if (!parseResult.success) {
    const validationIssues = parseResult.error.issues;
    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'Check the submitted filters.',
      validationIssues
    );
  }

  // 3. Extract the validated and sanitized query filter data
  const validatedFilters = parseResult.data;

  // 4. Delegate to the audit service to fetch the paginated audit logs
  const auditLogsResult = await listAuditLogs(validatedFilters);

  // 5. Return HTTP 200 OK along with the audit logs payload
  return res.status(200).json(auditLogsResult);
}
