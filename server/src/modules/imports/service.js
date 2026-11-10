import ExcelJS from 'exceljs';
import { Readable } from 'node:stream';
import { HttpError } from '../../utils/http-error.js';
import {
  runInTransaction,
  runInRowSavepoint,
  findAllCategories,
  findProductsBySkus,
  createImportLog,
  findImportLogById,
  findImportLogByIdForUpdate,
  expireImportLog,
  markImportLogCommitted,
  insertProduct,
  updateProduct,
  insertInventoryTransaction,
  insertAuditLog,
  listImportLogs,
} from './repository.js';

/**
 * Standard product columns supported in import templates and files.
 */
const columns = [
  'sku',
  'name',
  'category',
  'selling_price',
  'cost_price',
  'unit',
  'reorder_level',
  'warranty_months',
  'tracks_serial',
  'opening_stock',
];

/**
 * Minimum mandatory columns required for importing products.
 */
const required = ['sku', 'name', 'category', 'selling_price'];

/**
 * Maximum number of data rows permissible per import file.
 */
const MAX_DATA_ROWS = 5000;

/**
 * Maximum file upload size in bytes (5 MB).
 */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Sanitizes and trims a raw input value into a string.
 *
 * @param {any} value - Raw value to sanitize.
 * @returns {string} Trimmed string value.
 */
function clean(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

/**
 * Extracts the display or calculated value from an ExcelJS cell.
 * Handles rich text objects, formula results, and primitive strings or numbers.
 *
 * @param {any} cell - ExcelJS cell object or primitive value.
 * @returns {string|number|any} Extracted cell value.
 */
function cellValue(cell) {
  if (cell === null || cell === undefined) {
    return '';
  }

  let value = cell;

  if (cell?.result !== undefined) {
    value = cell.result;
  } else if (cell?.text !== undefined && cell.type === ExcelJS.ValueType.Formula) {
    value = cell.result;
  }

  if (typeof value === 'object' && value?.text) {
    return value.text;
  }

  return value;
}

/**
 * Parses and validates numerical fields such as prices, stock counts, and thresholds.
 *
 * @param {any} value - Raw input value.
 * @param {string} column - Name of the column being parsed.
 * @param {Object} [options] - Parsing configuration options.
 * @param {boolean} [options.money=false] - Whether to parse as a monetary currency value with up to 2 decimal places.
 * @param {number} [options.fallback=0] - Default value when the cell is empty.
 * @returns {number|string} Parsed number or formatted decimal string.
 * @throws {Error} If numerical format constraints are violated.
 */
function parseNumber(value, column, options = {}) {
  const isMoney = Boolean(options.money);
  const fallback = options.fallback !== undefined ? options.fallback : 0;

  if (value === '' || value === null || value === undefined) {
    return fallback;
  }

  const text = clean(value);
  const pattern = isMoney ? /^\d{1,10}(?:\.\d{1,2})?$/ : /^\d+$/;

  if (!pattern.test(text)) {
    const formatDescription = isMoney
      ? 'amount with up to 2 decimals'
      : 'whole number';
    throw new Error(`${column} must be a non-negative ${formatDescription}.`);
  }

  if (isMoney) {
    return Number(text).toFixed(2);
  }

  return Number(text);
}

/**
 * Parses a boolean cell value representing flags like serial tracking.
 * Accepts boolean primitives or textual synonyms ('true', 'false', 'yes', 'no', '1', '0').
 *
 * @param {any} value - Raw input value.
 * @returns {boolean} Parsed boolean representation.
 * @throws {Error} If the value cannot be interpreted as a valid boolean.
 */
function parseBoolean(value) {
  if (value === '' || value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const cleanedLower = clean(value).toLowerCase();

  if (['true', 'yes', '1'].includes(cleanedLower)) {
    return true;
  }

  if (['false', 'no', '0'].includes(cleanedLower)) {
    return false;
  }

  throw new Error('tracks_serial must be true or false.');
}

/**
 * Streaming RFC 4180 CSV parser that parses rows and enforces MAX_DATA_ROWS during parsing.
 *
 * @param {string} text - UTF-8 CSV content string.
 * @param {number} maxDataRows - Maximum data rows allowed (excluding header).
 * @returns {Array<Array<string>>} Parsed raw rows.
 * @throws {HttpError} If data rows exceed maxDataRows during parsing.
 */
function parseCsvWithRowLimit(text, maxDataRows) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const maxTotalRows = maxDataRows + 1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        row.push(field);
        field = '';
        if (row.length > 0) {
          rows.push(row);
          if (rows.length > maxTotalRows) {
            throw new HttpError(
              422,
              'IMPORT_LIMIT_EXCEEDED',
              'Files may contain at most 5,000 data rows.'
            );
          }
          row = [];
        }
      } else if (char === '\n') {
        row.push(field);
        field = '';
        if (row.length > 0) {
          rows.push(row);
          if (rows.length > maxTotalRows) {
            throw new HttpError(
              422,
              'IMPORT_LIMIT_EXCEEDED',
              'Files may contain at most 5,000 data rows.'
            );
          }
          row = [];
        }
      } else {
        field += char;
      }
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
    if (rows.length > maxTotalRows) {
      throw new HttpError(
        422,
        'IMPORT_LIMIT_EXCEEDED',
        'Files may contain at most 5,000 data rows.'
      );
    }
  }

  return rows;
}

/**
 * Reads and decodes an uploaded spreadsheet or CSV file buffer into structured row objects.
 * Validates file signature, row limits, header mapping, and mandatory columns.
 *
 * @param {Express.Multer.File} file - Multer file object containing the uploaded file buffer.
 * @param {Record<string, string>} [mapping={}] - Optional column header alias mapping.
 * @returns {Promise<{ ext: string, rows: Array<{ rowNumber: number, source: Record<string, any> }> }>} Decoded rows.
 * @throws {HttpError} If file type, structure, or limits are invalid.
 */
async function decodeFile(file, mapping = {}) {
  if (!file) {
    throw new HttpError(422, 'IMPORT_FILE_TYPE', 'Choose an .xlsx or .csv file.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new HttpError(422, 'IMPORT_LIMIT_EXCEEDED', 'Files may not exceed 5 MB.');
  }

  const filenameParts = file.originalname.split('.');
  const ext = filenameParts.pop()?.toLowerCase();

  if (!['xlsx', 'csv'].includes(ext)) {
    throw new HttpError(422, 'IMPORT_FILE_TYPE', 'Only .xlsx and .csv files are supported.');
  }

  const rawRows = [];

  try {
    if (ext === 'xlsx') {
      // Validate ZIP / XLSX magic signature (PK\x03\x04 or 0x50 0x4B)
      const hasValidSignature = file.buffer.length >= 4 &&
        file.buffer[0] === 0x50 &&
        file.buffer[1] === 0x4b;

      if (!hasValidSignature) {
        throw new Error('Invalid XLSX signature.');
      }

      const stream = Readable.from([file.buffer]);
      const reader = new ExcelJS.stream.xlsx.WorkbookReader(stream, {
        sharedStrings: 'cache',
        hyperlinks: 'ignore',
        worksheets: 'emit',
        entries: 'ignore',
      });

      for await (const worksheet of reader) {
        for await (const row of worksheet) {
          const rowValues = row.values.slice(1).map(cellValue);
          rawRows.push(rowValues);

          // Hard limit check during streaming read (header + 5000 data rows)
          if (rawRows.length > MAX_DATA_ROWS + 1) {
            throw new HttpError(
              422,
              'IMPORT_LIMIT_EXCEEDED',
              'Files may contain at most 5,000 data rows.'
            );
          }
        }
        // Only inspect the first worksheet in the workbook
        break;
      }
    } else {
      // For CSV files, ensure there are no illegal null bytes
      if (file.buffer.includes(0)) {
        throw new Error('Invalid CSV file.');
      }

      const utf8Text = file.buffer.toString('utf8').replace(/^\uFEFF/, '');
      const parsedCsvRows = parseCsvWithRowLimit(utf8Text, MAX_DATA_ROWS);
      rawRows.push(...parsedCsvRows);
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    const message = error.message || 'The file could not be read.';
    throw new HttpError(422, 'IMPORT_FILE_TYPE', message);
  }

  if (rawRows.length === 0) {
    throw new HttpError(422, 'IMPORT_FILE_TYPE', 'The file is empty.');
  }

  const dataRowCount = rawRows.length - 1;
  if (dataRowCount > MAX_DATA_ROWS) {
    throw new HttpError(
      422,
      'IMPORT_LIMIT_EXCEEDED',
      'Files may contain at most 5,000 data rows.'
    );
  }

  // Parse header columns and build column position lookup map
  const rawHeaders = rawRows[0];
  const headers = rawHeaders.map((cell) => clean(cell).toLowerCase());
  const positions = new Map();

  headers.forEach((header, index) => {
    const mappedHeader = mapping[header] || header;
    const normalizedKey = mappedHeader.toLowerCase();
    positions.set(normalizedKey, index);
  });

  // Verify that all mandatory columns are accounted for in the headers
  const missingColumns = required.filter((col) => !positions.has(col));
  if (missingColumns.length > 0) {
    throw new HttpError(
      422,
      'IMPORT_FILE_TYPE',
      `Missing required columns: ${missingColumns.join(', ')}.`
    );
  }

  // Extract subsequent rows as raw data objects
  const rawDataRows = rawRows.slice(1);
  const formattedRows = rawDataRows.map((row, index) => {
    const sourceRecord = {};

    for (const column of columns) {
      if (positions.has(column)) {
        const columnIndex = positions.get(column);
        sourceRecord[column] = cellValue(row[columnIndex]);
      } else {
        sourceRecord[column] = '';
      }
    }

    return {
      rowNumber: index + 2,
      source: sourceRecord,
    };
  });

  return {
    ext,
    rows: formattedRows,
  };
}

/**
 * Validates, normalizes, and classifies each row in an import batch.
 * Identifies errors, warnings, whether the product is new or an update to an existing SKU,
 * and attaches foreign key associations.
 *
 * @param {Array<{ rowNumber: number, source: Record<string, any> }>} sourceRows - Raw imported rows.
 * @returns {Promise<Array<Object>>} Classified rows with status, errors, warnings, and normalized data.
 */
async function classifyRows(sourceRows) {
  // Query category lookup table
  const categories = await findAllCategories();
  const categoryMap = new Map();
  for (const category of categories) {
    const normalizedName = category.name.trim().toLowerCase();
    categoryMap.set(normalizedName, category);
  }

  // Query existing products matching SKUs present in this file
  const extractedSkus = sourceRows
    .map((row) => clean(row.source.sku).toLowerCase())
    .filter(Boolean);

  const existingProducts = extractedSkus.length > 0
    ? await findProductsBySkus(extractedSkus)
    : [];

  const skuMap = new Map();
  for (const product of existingProducts) {
    const normalizedSku = product.sku.trim().toLowerCase();
    skuMap.set(normalizedSku, product);
  }

  const seenSkusInFile = new Set();

  return sourceRows.map(({ rowNumber, source }) => {
    const errors = [];
    const warnings = [];
    const data = {};

    // Check mandatory fields
    for (const col of required) {
      if (!clean(source[col])) {
        errors.push({ column: col, message: 'This field is required.' });
      }
    }

    data.sku = clean(source.sku);
    data.name = clean(source.name);
    data.categoryName = clean(source.category);

    const normalizedSku = data.sku.toLowerCase();

    // Check intra-file duplicate SKU
    if (normalizedSku) {
      if (seenSkusInFile.has(normalizedSku)) {
        errors.push({ column: 'sku', message: 'SKU is duplicated in this file.' });
      }
      seenSkusInFile.add(normalizedSku);
    }

    // Verify category reference
    const matchedCategory = categoryMap.get(data.categoryName.toLowerCase());
    if (data.categoryName && !matchedCategory) {
      errors.push({ column: 'category', message: 'Category does not exist.' });
    } else if (matchedCategory && matchedCategory.status !== 'active') {
      errors.push({ column: 'category', message: 'Category is inactive.' });
    }

    // Validate string lengths
    if (data.sku.length > 50) {
      errors.push({ column: 'sku', message: 'SKU may not exceed 50 characters.' });
    }
    if (data.name.length > 200) {
      errors.push({ column: 'name', message: 'Name may not exceed 200 characters.' });
    }

    // Parse monetary selling price
    try {
      data.sellingPrice = parseNumber(source.selling_price, 'selling_price', { money: true });
    } catch (parseErr) {
      errors.push({ column: 'selling_price', message: parseErr.message });
    }

    // Parse monetary cost price
    try {
      data.costPrice = parseNumber(source.cost_price, 'cost_price', { money: true });
    } catch (parseErr) {
      errors.push({ column: 'cost_price', message: parseErr.message });
    }

    // Parse integer thresholds and inventory fields
    const integerFields = [
      { sourceCol: 'reorder_level', dataKey: 'reorderLevel', fallback: 5, max: 1_000_000 },
      { sourceCol: 'warranty_months', dataKey: 'warrantyMonths', fallback: 0, max: 120 },
      { sourceCol: 'opening_stock', dataKey: 'openingStock', fallback: 0, max: 1_000_000 },
    ];

    for (const { sourceCol, dataKey, fallback, max } of integerFields) {
      try {
        const parsedVal = parseNumber(source[sourceCol], sourceCol, { fallback });
        if (parsedVal > max) {
          throw new Error(`${sourceCol} exceeds the allowed limit.`);
        }
        data[dataKey] = parsedVal;
      } catch (parseErr) {
        errors.push({ column: sourceCol, message: parseErr.message });
      }
    }

    // Parse serial tracking flag
    try {
      data.tracksSerial = parseBoolean(source.tracks_serial);
    } catch (parseErr) {
      errors.push({ column: 'tracks_serial', message: parseErr.message });
    }

    data.unit = clean(source.unit) || 'pcs';
    data.categoryId = matchedCategory?.id;

    if (data.unit.length > 20) {
      errors.push({ column: 'unit', message: 'unit may not exceed 20 characters.' });
    }

    // Check match against existing database products
    const existingDbProduct = skuMap.get(normalizedSku);
    if (existingDbProduct?.status === 'inactive') {
      errors.push({ column: 'sku', message: 'SKU belongs to an inactive product.' });
    }

    // Classify row status: error, update, or new
    let status = 'new';
    if (errors.length > 0) {
      status = 'error';
    } else if (existingDbProduct) {
      status = 'update';
    }

    // If updating an existing product, opening stock will be ignored
    if (status === 'update' && Number(data.openingStock) > 0) {
      warnings.push({
        column: 'opening_stock',
        message: 'Opening stock is ignored for an existing product.',
      });
    }

    return {
      rowNumber,
      status,
      errors,
      warnings,
      productId: existingDbProduct?.id ?? null,
      data,
    };
  });
}

/**
 * Creates an import preview session by decoding the uploaded file, classifying rows,
 * persisting the preview in the import_logs table, and returning the first page of results.
 *
 * @param {Object} user - The authenticated administrative user initiating the preview.
 * @param {Express.Multer.File} file - The uploaded file object.
 * @param {Record<string, string>} [mapping={}] - Optional column header alias mapping.
 * @param {Object} [pagination={ page: 1, page_size: 25 }] - Pagination parameters.
 * @returns {Promise<Object>} Created preview summary and paginated row slice.
 */
export async function createPreview(user, file, mapping = {}, pagination = { page: 1, page_size: 25 }) {
  const decoded = await decodeFile(file, mapping);
  const rows = await classifyRows(decoded.rows);

  // Calculate status counts
  const counts = {
    total: rows.length,
    new: 0,
    update: 0,
    error: 0,
    warning: 0,
  };

  for (const row of rows) {
    counts[row.status] += 1;
    if (row.warnings.length > 0) {
      counts.warning += 1;
    }
  }

  // Persist import preview record in the database
  const createdLog = await createImportLog({
    userId: user.id,
    filename: file.originalname,
    fileType: decoded.ext,
    rowsTotal: counts.total,
    rowsValid: counts.new + counts.update,
    rowsError: counts.error,
    status: 'previewed',
    payload: JSON.stringify(rows),
  });

  const page = pagination.page;
  const pageSize = pagination.page_size;
  const startIndex = (page - 1) * pageSize;
  const pagedRows = rows.slice(startIndex, startIndex + pageSize);

  return {
    id: String(createdLog.id),
    filename: file.originalname,
    counts,
    rows: pagedRows,
    page,
    pageSize,
    expiresAt: createdLog.expires_at,
  };
}

/**
 * Retrieves the error details for an import preview session.
 * Used to generate the error CSV report.
 *
 * @param {string|number} id - Import log primary identifier.
 * @returns {Promise<Array<Object>>} Array of row records that contain errors.
 * @throws {HttpError} 404 if not found, 410 if expired.
 */
export async function getPreviewErrors(id) {
  const row = await findImportLogById(id);

  if (!row) {
    throw new HttpError(404, 'IMPORT_NOT_FOUND', 'Import not found.');
  }

  const now = new Date();
  const expiresAt = new Date(row.expires_at);
  if (expiresAt < now) {
    throw new HttpError(410, 'IMPORT_EXPIRED', 'This import preview has expired.');
  }

  const payload = typeof row.payload === 'string'
    ? JSON.parse(row.payload)
    : (row.payload || []);

  const errorRows = payload.filter((item) => item.errors && item.errors.length > 0);
  return errorRows;
}

/**
 * Retrieves the paginated preview details and status counts for an active import session.
 *
 * @param {string|number} id - Import log primary identifier.
 * @param {Object} pagination - Pagination parameters ({ page, page_size }).
 * @returns {Promise<Object>} Import session preview details.
 * @throws {HttpError} 404 if not found, 410 if expired.
 */
export async function getPreview(id, pagination) {
  const row = await findImportLogById(id);

  if (!row) {
    throw new HttpError(404, 'IMPORT_NOT_FOUND', 'Import not found.');
  }

  const now = new Date();
  const expiresAt = new Date(row.expires_at);
  if (expiresAt < now) {
    throw new HttpError(410, 'IMPORT_EXPIRED', 'This import preview has expired.');
  }

  const rows = typeof row.payload === 'string'
    ? JSON.parse(row.payload)
    : (row.payload || []);

  const page = pagination.page;
  const pageSize = pagination.page_size;
  const startIndex = (page - 1) * pageSize;
  const pagedRows = rows.slice(startIndex, startIndex + pageSize);

  const newCount = rows.filter((r) => r.status === 'new').length;
  const updateCount = rows.filter((r) => r.status === 'update').length;
  const warningCount = rows.filter((r) => r.warnings && r.warnings.length > 0).length;

  const counts = {
    total: row.rows_total,
    new: newCount,
    update: updateCount,
    error: row.rows_error,
    warning: warningCount,
  };

  return {
    id: String(row.id),
    filename: row.filename,
    status: row.status,
    counts,
    rows: pagedRows,
    page,
    pageSize,
    expiresAt: row.expires_at,
  };
}

/**
 * Commits an import preview batch into the database within a transaction.
 * In 'all' mode, commits only if there are zero errors; in 'valid_only' mode,
 * commits valid rows and skips rows with errors.
 *
 * @param {Object} user - Authenticated user committing the import.
 * @param {string|number} id - Import log primary identifier.
 * @param {'all'|'valid_only'} mode - Commit mode.
 * @returns {Promise<Object>} Summary of created, updated, and skipped records.
 * @throws {HttpError} 404, 409, or 410 if constraints fail.
 */
export async function commitPreview(user, id, mode) {
  const result = await runInTransaction(async (trx) => {
    // Lock the import log row for atomic status check
    const log = await findImportLogByIdForUpdate(id, trx);

    if (!log) {
      throw new HttpError(404, 'IMPORT_NOT_FOUND', 'Import not found.');
    }

    if (log.status !== 'previewed') {
      throw new HttpError(409, 'IMPORT_ALREADY_COMMITTED', 'This import cannot be committed again.');
    }

    const now = new Date();
    const expiresAt = new Date(log.expires_at);
    if (expiresAt < now) {
      await expireImportLog(id, trx);
      return { expired: true };
    }

    const rows = typeof log.payload === 'string'
      ? JSON.parse(log.payload)
      : (log.payload || []);

    // Mode "all" requires strictly zero error rows
    const hasErrorRows = rows.some((row) => row.status === 'error');
    if (mode === 'all' && hasErrorRows) {
      throw new HttpError(409, 'IMPORT_HAS_ERRORS', 'Fix or skip error rows before committing.');
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      if (row.status === 'error') {
        skipped += 1;
        continue;
      }

      const rowData = row.data;

      try {
        // Execute each row inside an isolated transaction savepoint
        await runInRowSavepoint(trx, async (rowTrx) => {
          const productAttributes = {
            sku: rowData.sku,
            name: rowData.name,
            category_id: rowData.categoryId,
            unit: rowData.unit,
            cost_price: rowData.costPrice,
            selling_price: rowData.sellingPrice,
            stock_qty: row.status === 'new' ? rowData.openingStock : undefined,
            reorder_level: rowData.reorderLevel,
            warranty_months: rowData.warrantyMonths,
            tracks_serial: rowData.tracksSerial,
            status: 'active',
          };

          if (row.status === 'new') {
            const inserted = await insertProduct(productAttributes, rowTrx);

            // Record initial inventory transaction if opening stock was provided
            if (rowData.openingStock > 0) {
              await insertInventoryTransaction({
                productId: inserted.id,
                quantityChange: rowData.openingStock,
                balanceAfter: rowData.openingStock,
                reason: 'Product import',
                userId: user.id,
              }, rowTrx);
            }

            // Log individual product import audit trail
            await insertAuditLog({
              userId: user.id,
              action: 'product.imported',
              entityType: 'product',
              entityId: inserted.id,
              details: {
                sku: rowData.sku,
                import_id: String(id),
              },
            }, rowTrx);
          } else {
            // Update existing active product without altering stock balance
            await updateProduct(row.productId, {
              sku: rowData.sku,
              name: rowData.name,
              category_id: rowData.categoryId,
              unit: rowData.unit,
              cost_price: rowData.costPrice,
              selling_price: rowData.sellingPrice,
              reorder_level: rowData.reorderLevel,
              warranty_months: rowData.warrantyMonths,
              tracks_serial: rowData.tracksSerial,
            }, rowTrx);
          }
        });

        if (row.status === 'new') {
          created += 1;
        } else {
          updated += 1;
        }
      } catch (error) {
        // PostgreSQL unique violation (code 23505) e.g. concurrent SKU conflict
        if (error.code === '23505') {
          if (mode === 'all') {
            throw new HttpError(409, 'SKU_DUPLICATE', `SKU conflict on row ${row.rowNumber}.`);
          }
          skipped += 1;
          continue;
        }
        throw error;
      }
    }

    // Mark import log as committed
    await markImportLogCommitted(id, trx);

    // Record system audit log for the committed import batch
    await insertAuditLog({
      userId: user.id,
      action: 'import.committed',
      entityType: 'import',
      entityId: id,
      details: {
        created,
        updated,
        skipped,
        mode,
      },
    }, trx);

    return {
      id: String(id),
      created,
      updated,
      skipped,
      status: 'committed',
    };
  });

  if (result.expired) {
    throw new HttpError(410, 'IMPORT_EXPIRED', 'This import preview has expired.');
  }

  return result;
}

/**
 * Retrieves up to 100 recent import logs ordered from newest to oldest.
 *
 * @returns {Promise<Array<Object>>} List of recent import records.
 */
export async function listImports() {
  const logs = await listImportLogs();
  return logs;
}

export { columns as importColumns };
