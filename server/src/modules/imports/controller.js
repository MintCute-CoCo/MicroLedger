import ExcelJS from 'exceljs';
import { HttpError } from '../../utils/http-error.js';
import { commitSchema, mappingSchema, previewPageSchema } from './schema.js';
import {
  commitPreview,
  createPreview,
  getPreview,
  getPreviewErrors,
  importColumns,
  listImports,
} from './service.js';

/**
 * Sanitizes and formats a scalar value for safe CSV output.
 * Neutralizes potential formula injection characters (=, +, -, @, tab, carriage return)
 * and escapes double quotes according to RFC 4180 standards.
 *
 * @param {any} value - Cell value to format.
 * @returns {string} Escaped, quoted CSV cell string.
 */
function csvText(value) {
  const rawText = String(value ?? '');
  const neutralizedText = rawText.replace(/^[=+\-@\t\r]/, (prefix) => `'${prefix}`);
  const escapedQuotes = neutralizedText.replace(/"/g, '""');
  return `"${escapedQuotes}"`;
}

/**
 * Handles uploading an import spreadsheet/CSV and generating a classified preview.
 *
 * @param {import('express').Request} req - Express request with uploaded file and optional mapping.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} HTTP 201 with preview results and counts.
 */
export async function previewController(req, res) {
  let mapping;

  if (req.body.mapping) {
    try {
      mapping = JSON.parse(req.body.mapping);
    } catch {
      throw new HttpError(422, 'VALIDATION_FAILED', 'Column mapping must be valid JSON.');
    }
  }

  const checkedMapping = mappingSchema.safeParse(mapping);
  if (!checkedMapping.success) {
    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'Invalid column mapping.',
      checkedMapping.error.issues
    );
  }

  const parsedPage = previewPageSchema.safeParse(req.query);
  if (!parsedPage.success) {
    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'Invalid preview page.',
      parsedPage.error.issues
    );
  }

  const actor = req.user;
  const file = req.file;
  const mappingData = checkedMapping.data;
  const pageData = parsedPage.data;

  const previewResult = await createPreview(actor, file, mappingData, pageData);
  return res.status(201).json(previewResult);
}

/**
 * Retrieves a list of recent import history records.
 *
 * @param {import('express').Request} _req - Express request.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON object containing array of import records.
 */
export async function listImportsController(_req, res) {
  const items = await listImports();
  return res.json({ items });
}

/**
 * Retrieves a paginated slice of rows and summary counts for a previously uploaded import preview.
 *
 * @param {import('express').Request} req - Express request with import ID in params.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} Preview page data and metadata.
 */
export async function getPreviewController(req, res) {
  const importId = req.params.id;

  const isValidId = /^\d+$/.test(importId) && BigInt(importId) >= 1n;
  if (!isValidId) {
    throw new HttpError(404, 'IMPORT_NOT_FOUND', 'Import not found.');
  }

  const parsedPage = previewPageSchema.safeParse(req.query);
  if (!parsedPage.success) {
    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'Invalid preview page.',
      parsedPage.error.issues
    );
  }

  const preview = await getPreview(importId, parsedPage.data);
  return res.json(preview);
}

/**
 * Commits an import preview into the database.
 * Supports mode 'all' (fail if any errors exist) or 'valid_only' (skip error rows).
 *
 * @param {import('express').Request} req - Express request with import ID in params and mode in body.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} Summary of committed items and counts.
 */
export async function commitController(req, res) {
  const importId = req.params.id;

  const isValidId = /^\d+$/.test(importId) && BigInt(importId) >= 1n;
  if (!isValidId) {
    throw new HttpError(404, 'IMPORT_NOT_FOUND', 'Import not found.');
  }

  const parsedBody = commitSchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'Choose a commit mode.',
      parsedBody.error.issues
    );
  }

  const actor = req.user;
  const commitMode = parsedBody.data.mode;

  const result = await commitPreview(actor, importId, commitMode);
  return res.json(result);
}

/**
 * Generates and downloads a CSV error report for a specific import preview.
 *
 * @param {import('express').Request} req - Express request with import ID in params.
 * @param {import('express').Response} res - Express response stream.
 * @returns {Promise<import('express').Response>} CSV attachment containing error rows.
 */
export async function errorsController(req, res) {
  const importId = req.params.id;
  const errorRows = await getPreviewErrors(importId);

  const headerLine = ['row', 'column', 'reason'];
  const dataLines = [];

  for (const row of errorRows) {
    for (const err of row.errors) {
      dataLines.push([row.rowNumber, err.column, err.message]);
    }
  }

  const allLines = [headerLine, ...dataLines];
  const csvBody = allLines
    .map((line) => line.map(csvText).join(','))
    .join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="import-${importId}-errors.csv"`);

  // Prefix with UTF-8 Byte Order Mark (BOM) for compatibility with Excel
  return res.send(`\uFEFF${csvBody}`);
}

/**
 * Generates and downloads sample import template files in CSV or XLSX format.
 *
 * @param {import('express').Request} req - Express request with optional format query ('csv' or 'xlsx').
 * @param {import('express').Response} res - Express response stream.
 * @returns {Promise<void|import('express').Response>} File attachment download.
 */
export async function templateController(req, res) {
  const columns = [...importColumns];
  const exampleRow = [
    'SKU-001',
    'Example product',
    'Hardware',
    '12.50',
    '6.00',
    'pcs',
    '5',
    '0',
    'false',
    '0',
  ];

  const format = req.query.format;

  // Handle CSV template generation
  if (format === 'csv') {
    const csvContent = [columns, exampleRow]
      .map((row) => row.map(csvText).join(','))
      .join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="microledger-import-template.csv"');

    return res.send(`\uFEFF${csvContent}`);
  }

  // Reject unsupported template formats
  if (format && format !== 'xlsx') {
    throw new HttpError(422, 'VALIDATION_FAILED', 'Format must be xlsx or csv.');
  }

  // Handle XLSX template generation
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Products');

  worksheet.addRow(columns);
  worksheet.addRow(exampleRow);

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="microledger-import-template.xlsx"'
  );

  await workbook.xlsx.write(res);
  return res.end();
}
