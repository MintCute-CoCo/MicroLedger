import ExcelJS from 'exceljs';
import { requireDatabase } from '../../db/knex.js';
import { HttpError } from '../../utils/http-error.js';
import { inventoryReport, salesReport, warrantyReport } from '../reports/service.js';
import {
  fetchClaimsExportRows,
  fetchProductsExportRows,
  fetchSalesExportRows,
  findStoreTimeZone,
  writeExportAudit,
} from './repository.js';

/**
 * Neutralizes potential formula injection in exported cell values.
 *
 * Purpose:
 * Prevents CSV / Spreadsheet Formula Injection (CWE-1236).
 * Prepends a single quote (`'`) if a string begins with dangerous formula execution
 * characters: '=', '+', '-', '@', horizontal tab, or carriage return.
 *
 * @param {*} value - Cell value to inspect and sanitize.
 * @returns {*} Sanitized cell value.
 */
function neutralizeFormulaInjection(value) {
  if (typeof value !== 'string') {
    return value;
  }

  // Regex matching formula trigger characters at start of string
  const formulaTriggerRegex = /^[=+\-@\t\r]/;
  const isFormulaTrigger = formulaTriggerRegex.test(value);

  if (isFormulaTrigger) {
    const neutralizedValue = `'${value}`;
    return neutralizedValue;
  }

  return value;
}

/**
 * Formats an individual cell value for CSV output.
 *
 * Purpose:
 * Sanitizes against formula injection, escapes inner double quotes by doubling them,
 * and surrounds the result with quotation marks.
 *
 * @param {*} value - Raw value to serialize.
 * @returns {string} Quoted, escaped CSV cell string.
 */
function formatCsvCell(value) {
  const safeValue = neutralizeFormulaInjection(value);

  let rawString = '';
  if (safeValue !== null && safeValue !== undefined) {
    rawString = String(safeValue);
  }

  const escapedQuotes = rawString.replace(/"/g, '""');
  const formattedCell = `"${escapedQuotes}"`;
  return formattedCell;
}

/**
 * Queries database records for the requested export type, enforcing date constraints and row limits.
 *
 * Purpose:
 * Routes export requests to appropriate repository queries, validates required
 * date parameters for sales exports, and caps results at 50,000 rows.
 *
 * @param {string} type - Export target type ('products', 'inventory', 'sales', 'claims').
 * @param {Object} query - Validated query parameters.
 * @param {import('knex').Knex} db - Knex database handle.
 * @returns {Promise<Array<Object>>} Matching database rows.
 * @throws {HttpError} Throws 404 for unknown export types, 422 if dates missing or > 50,000 rows.
 */
async function getExportRows(type, query, db) {
  let rows;

  if (type === 'products' || type === 'inventory') {
    // Inventory exports for Admin include confidential cost prices
    const includeCostPrice = type === 'inventory';
    rows = await fetchProductsExportRows(db, query, includeCostPrice);
  } else if (type === 'sales') {
    // Sales exports require an explicit date boundary to prevent unconstrained full-table scans
    const hasIsoRange = query.from && query.to;
    const hasDateRange = query.from_date && query.to_date;

    if (!hasIsoRange && !hasDateRange) {
      throw new HttpError(
        422,
        'VALIDATION_FAILED',
        'Sales exports require both from and to dates.'
      );
    }

    const timeZone = await findStoreTimeZone(db);
    rows = await fetchSalesExportRows(db, query, timeZone);
  } else if (type === 'claims') {
    const timeZone = await findStoreTimeZone(db);
    rows = await fetchClaimsExportRows(db, query, timeZone);
  } else {
    throw new HttpError(
      404,
      'EXPORT_NOT_FOUND',
      'This export type is not supported.'
    );
  }

  // Enforce maximum row limit: SRS / AI_CONTEXT specifies max 50,000 rows
  const maxRowLimit = 50000;
  if (rows.length > maxRowLimit) {
    throw new HttpError(
      422,
      'EXPORT_TOO_LARGE',
      'The export exceeds 50,000 rows. Narrow the filters.'
    );
  }

  return rows;
}

/**
 * Builds a dataset export file in CSV or XLSX format.
 *
 * Purpose:
 * Coordinates fetching dataset rows, neutralizes formula injection, logs an audit entry,
 * and formats the output into a downloadable CSV or Excel spreadsheet buffer.
 *
 * @param {Object} user - The authenticated Admin user performing the export.
 * @param {string} type - Dataset identifier ('products', 'inventory', 'sales', 'claims').
 * @param {Object} query - Validated query options and filters.
 * @returns {Promise<{content: Buffer, type: string, filename: string}>} File content buffer and metadata.
 */
export async function buildExport(user, type, query) {
  const db = requireDatabase();

  // 1. Fetch filtered dataset rows
  const rows = await getExportRows(type, query, db);

  // 2. Record security audit trail entry documenting the export action
  const auditDetails = {
    type: type,
    filters: query,
    row_count: rows.length,
  };
  await writeExportAudit(db, {
    userId: user.id,
    action: 'data.exported',
    entityType: 'export',
    details: auditDetails,
  });

  // 3. Determine column headers (from rows, or default headers if rows is empty)
  let headers;
  if (rows.length > 0) {
    const firstRow = rows[0];
    headers = Object.keys(firstRow);
  } else if (type === 'sales') {
    headers = [
      'sale_no',
      'sold_at',
      'customer',
      'staff',
      'payment_method',
      'subtotal',
      'discount_amount',
      'total',
      'status',
    ];
  } else if (type === 'claims') {
    headers = [
      'claim_no',
      'claim_date',
      'status',
      'sku',
      'product',
      'customer',
      'phone',
      'supplier',
      'expected_return_date',
      'actual_return_date',
      'problem',
      'resolution',
      'notes',
    ];
  } else {
    headers = [
      'sku',
      'name',
      'category',
      'unit',
      'selling_price',
      'stock_qty',
      'reorder_level',
      'status',
    ];
  }

  // 4. Generate CSV format if requested
  if (query.format === 'csv') {
    const csvLines = [];

    // Header line
    const headerLine = headers.map((header) => formatCsvCell(header)).join(',');
    csvLines.push(headerLine);

    // Data lines
    for (const row of rows) {
      const lineCells = headers.map((key) => formatCsvCell(row[key]));
      const dataLine = lineCells.join(',');
      csvLines.push(dataLine);
    }

    const csvContent = csvLines.join('\r\n');
    // Prepend UTF-8 Byte Order Mark (\uFEFF) for Excel compatibility with Unicode characters
    const csvWithBom = `\uFEFF${csvContent}`;
    const fileBuffer = Buffer.from(csvWithBom, 'utf8');

    const result = {
      content: fileBuffer,
      type: 'text/csv; charset=utf-8',
      filename: `${type}.csv`,
    };
    return result;
  }

  // 5. Generate Excel XLSX workbook
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(type);

  // Add header row
  sheet.addRow(headers);

  // Add data rows with formula neutralization and text format
  for (const row of rows) {
    const rowValues = headers.map((key) => neutralizeFormulaInjection(row[key]));
    const addedRow = sheet.addRow(rowValues);

    addedRow.eachCell((cell) => {
      if (typeof cell.value === 'string') {
        cell.numFmt = '@';
      }
    });
  }

  const xlsxArrayBuffer = await workbook.xlsx.writeBuffer();
  const fileBuffer = Buffer.from(xlsxArrayBuffer);

  const result = {
    content: fileBuffer,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `${type}.xlsx`,
  };
  return result;
}

/**
 * Transforms report data into structured worksheet definitions.
 *
 * Purpose:
 * Organizes complex multi-section report structures (sales breakdown, voided sales,
 * current stock, stock movements, claim statuses, overdue claims) into tabular sheets.
 *
 * @param {string} name - Report name ('sales', 'inventory', 'warranty').
 * @param {Object} data - Output data from report service.
 * @returns {Array<{name: string, columns: Array<string>, rows: Array<Object>}>} Array of sheet descriptors.
 * @throws {HttpError} Throws 404 EXPORT_NOT_FOUND if report name is invalid.
 */
function formatReportSheets(name, data) {
  if (name === 'sales') {
    const salesGroupRows = data.groups.map((row) => {
      const formattedRow = {
        group: row.key,
        quantity: row.quantity,
        subtotal: row.subtotal,
        discount: row.discount,
        total: row.total,
      };
      return formattedRow;
    });

    const sheets = [
      {
        name: 'Sales',
        columns: ['group', 'quantity', 'subtotal', 'discount', 'total'],
        rows: salesGroupRows,
      },
      {
        name: 'Voided',
        columns: ['sale_no', 'sold_at', 'customer', 'staff', 'total', 'void_reason'],
        rows: data.voided,
      },
    ];
    return sheets;
  }

  if (name === 'inventory') {
    const sheets = [
      {
        name: 'Current stock',
        columns: ['sku', 'name', 'category', 'stock_qty', 'reorder_level', 'cost_price'],
        rows: data.current,
      },
      {
        name: 'Movements',
        columns: ['created_at', 'sku', 'name', 'type', 'quantity_change', 'balance_after', 'user', 'reason'],
        rows: data.movements,
      },
    ];
    return sheets;
  }

  if (name === 'warranty') {
    const sheets = [
      {
        name: 'Claim status',
        columns: ['status', 'count'],
        rows: data.statuses,
      },
      {
        name: 'Overdue claims',
        columns: ['claim_no', 'product', 'customer', 'phone', 'supplier', 'expected_return_date', 'daysOverdue'],
        rows: data.overdue,
      },
      {
        name: 'Claims by supplier',
        columns: ['supplier', 'count'],
        rows: data.bySupplier,
      },
    ];
    return sheets;
  }

  throw new HttpError(
    404,
    'EXPORT_NOT_FOUND',
    'This report export is not supported.'
  );
}

/**
 * Builds an analytical report export file in CSV or XLSX format.
 *
 * Purpose:
 * Invokes report calculation services, organizes output into worksheets, validates
 * row limits, logs an audit entry, and renders a multi-sheet Excel or sectional CSV document.
 *
 * @param {Object} user - The authenticated Admin user performing the export.
 * @param {string} name - Report identifier ('sales', 'inventory', 'warranty').
 * @param {Object} query - Report parameters and filters.
 * @returns {Promise<{content: Buffer, type: string, filename: string}>} File content buffer and metadata.
 */
export async function buildReportExport(user, name, query) {
  // 1. Validate supported report types
  const supportedReports = ['sales', 'inventory', 'warranty'];
  const isSupported = supportedReports.includes(name);

  if (!isSupported) {
    throw new HttpError(
      404,
      'EXPORT_NOT_FOUND',
      'This report export is not supported.'
    );
  }

  // 2. Prepare query filters without the format parameter
  const reportFilters = { ...query };
  delete reportFilters.format;

  // 3. Fetch report calculation data from report services
  let reportData;
  if (name === 'sales') {
    const grouping = reportFilters.group || 'day';
    const salesFilters = {
      ...reportFilters,
      group: grouping,
    };
    reportData = await salesReport(salesFilters);
  } else if (name === 'inventory') {
    reportData = await inventoryReport(user, reportFilters);
  } else {
    reportData = await warrantyReport();
  }

  // 4. Structure data into report sheets
  const sheets = formatReportSheets(name, reportData);

  // 5. Enforce 50,000 maximum row limit
  const totalRowCount = sheets.reduce((accumulator, sheet) => {
    const count = accumulator + sheet.rows.length;
    return count;
  }, 0);

  const maxRowLimit = 50000;
  if (totalRowCount > maxRowLimit) {
    throw new HttpError(
      422,
      'EXPORT_TOO_LARGE',
      'The export exceeds 50,000 rows. Narrow the filters.'
    );
  }

  // 6. Record audit trail entry
  const db = requireDatabase();
  const auditDetails = {
    report: name,
    filters: reportFilters,
    row_count: totalRowCount,
  };
  await writeExportAudit(db, {
    userId: user.id,
    action: 'data.exported',
    entityType: 'report',
    details: auditDetails,
  });

  // 7. Render CSV format with sectional headers
  if (query.format === 'csv') {
    // Collect unique columns across all report sections
    const columnSet = new Set(['section']);
    for (const sheet of sheets) {
      for (const col of sheet.columns) {
        columnSet.add(col);
      }
    }
    const combinedColumns = Array.from(columnSet);

    const csvLines = [];

    // Header line
    const headerLine = combinedColumns.map((col) => formatCsvCell(col)).join(',');
    csvLines.push(headerLine);

    // Sectional data rows
    for (const sheet of sheets) {
      for (const row of sheet.rows) {
        const enrichedRow = {
          ...row,
          section: sheet.name,
        };
        const cellValues = combinedColumns.map((col) => formatCsvCell(enrichedRow[col]));
        const line = cellValues.join(',');
        csvLines.push(line);
      }
    }

    const csvContent = csvLines.join('\r\n');
    const csvWithBom = `\uFEFF${csvContent}`;
    const fileBuffer = Buffer.from(csvWithBom, 'utf8');

    const result = {
      content: fileBuffer,
      type: 'text/csv; charset=utf-8',
      filename: `${name}-report.csv`,
    };
    return result;
  }

  // 8. Render multi-worksheet Excel workbook
  const workbook = new ExcelJS.Workbook();

  for (const reportSheet of sheets) {
    const sheet = workbook.addWorksheet(reportSheet.name);

    // Add sheet headers
    sheet.addRow(reportSheet.columns);

    // Add sheet rows
    for (const row of reportSheet.rows) {
      const rowValues = reportSheet.columns.map((key) => neutralizeFormulaInjection(row[key]));
      const addedRow = sheet.addRow(rowValues);

      addedRow.eachCell((cell) => {
        if (typeof cell.value === 'string') {
          cell.numFmt = '@';
        }
      });
    }
  }

  const xlsxArrayBuffer = await workbook.xlsx.writeBuffer();
  const fileBuffer = Buffer.from(xlsxArrayBuffer);

  const result = {
    content: fileBuffer,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `${name}-report.xlsx`,
  };
  return result;
}
