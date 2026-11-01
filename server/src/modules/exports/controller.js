import { HttpError } from '../../utils/http-error.js';
import { exportQuerySchema } from './schema.js';
import { buildExport, buildReportExport } from './service.js';

/**
 * Controller to handle file downloads for dataset and report exports.
 *
 * Purpose:
 * Validates request query parameters, routes to either the dataset export generator
 * or analytical report export generator based on route parameters, configures
 * the appropriate Content-Type and Content-Disposition download headers, and transmits
 * the binary or text payload to the client.
 *
 * @param {import('express').Request} req - Express request object containing params and query.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} Express response with binary file attachment.
 * @throws {HttpError} Throws 422 VALIDATION_FAILED if export filters are invalid or row count exceeds 50,000.
 * @throws {HttpError} Throws 404 EXPORT_NOT_FOUND if export type or report name is not supported.
 */
export async function exportController(req, res) {
  // 1. Validate incoming query parameters against the export query schema
  const parseResult = exportQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    const validationErrors = parseResult.error.issues;
    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'Check the export filters.',
      validationErrors
    );
  }

  // 2. Extract validated query parameters and current authenticated user
  const currentUser = req.user;
  const validatedFilters = parseResult.data;

  // 3. Delegate to appropriate export generator based on route parameter
  let exportFile;
  if (req.params.name) {
    const reportName = req.params.name;
    exportFile = await buildReportExport(
      currentUser,
      reportName,
      validatedFilters
    );
  } else {
    const datasetType = req.params.type;
    exportFile = await buildExport(
      currentUser,
      datasetType,
      validatedFilters
    );
  }

  // 4. Configure HTTP response headers for attachment download
  const mimeType = exportFile.type;
  const downloadFileName = exportFile.filename;

  res.setHeader('Content-Type', mimeType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${downloadFileName}"`
  );

  // 5. Send file content buffer
  return res.send(exportFile.content);
}
