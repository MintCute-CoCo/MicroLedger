import { HttpError } from '../../utils/http-error.js';
import {
  countWarranties,
  findActiveProductForWarranty,
  findCustomerById,
  findStoreTimeZone,
  findWarranties,
  findWarrantyByIdForUpdate,
  getStoreTodayDate,
  insertManualWarranty,
  runInTransaction,
  updateWarrantyCustomer,
  writeWarrantyAudit,
} from './repository.js';

/**
 * Warranties Service Layer
 *
 * Implements business logic for querying warranties, issuing manual warranties,
 * and attaching customer information to anonymous sale warranties.
 * Strictly adheres to the project architecture rule: "Services do business logic only."
 */

/**
 * Resolves today's calendar date in the store's configured time zone.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} [trxOrDb] - Knex client or active transaction.
 * @returns {Promise<string>} Date string formatted as 'YYYY-MM-DD'.
 */
async function todayInStore(trxOrDb) {
  const storeZone = await findStoreTimeZone(trxOrDb);
  const storeToday = await getStoreTodayDate(trxOrDb, storeZone);
  return storeToday;
}

/**
 * Normalizes a date value into an ISO 'YYYY-MM-DD' formatted string.
 *
 * @param {Date|string|null|undefined} val - Value to convert.
 * @returns {string} Date string or empty string if not provided.
 */
function toDateString(val) {
  if (!val) {
    return '';
  }
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  return String(val).slice(0, 10);
}

/**
 * Retrieves a paginated list of warranties with computed validity and usability status.
 *
 * @param {Object} filters - Search and filtering parameters.
 * @param {string} [filters.q] - Search query across products, customers, serials, and invoices.
 * @param {string} [filters.validity] - Validity filter ('active' | 'expired' | 'all').
 * @param {number} filters.page - Current page number.
 * @param {number} filters.page_size - Page size limit.
 * @returns {Promise<{ items: Array<Object>, total: number, page: number, pageSize: number }>}
 */
export async function listWarranties(filters) {
  const today = await todayInStore();

  const [rows, totalCount] = await Promise.all([
    findWarranties(null, filters, today),
    countWarranties(null, filters, today),
  ]);

  const items = rows.map((row) => {
    const expiryDateStr = toDateString(row.expiry_date);
    const isValid = expiryDateStr >= today;
    const validityStatus = isValid ? 'Active' : 'Expired';
    const isUsable = row.sale_status !== 'voided';

    return {
      ...row,
      id: String(row.id),
      product_id: String(row.product_id),
      customer_id: row.customer_id === null ? null : String(row.customer_id),
      validity: validityStatus,
      usable: isUsable,
    };
  });

  return {
    items,
    total: totalCount,
    page: filters.page,
    pageSize: filters.page_size,
  };
}

/**
 * Manually creates a warranty record for a customer and product outside a regular POS sale.
 *
 * @param {Object} actor - Authenticated user creating the warranty.
 * @param {number|string} actor.id - User ID of administrator.
 * @param {Object} input - Warranty creation payload.
 * @param {string} input.productId - Target product ID.
 * @param {string} input.customerId - Target customer ID.
 * @param {string} [input.startDate] - Start date (defaults to today in store).
 * @param {number} [input.warrantyMonths] - Warranty duration in months (defaults to product warranty_months).
 * @returns {Promise<Object>} Created warranty details.
 * @throws {HttpError} If product not found/inactive, customer not found, or months < 1.
 */
export async function createManualWarranty(actor, input) {
  return await runInTransaction(async (trx) => {
    const product = await findActiveProductForWarranty(trx, input.productId);
    if (!product) {
      throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Active product not found.');
    }

    const customer = await findCustomerById(trx, input.customerId);
    if (!customer) {
      throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');
    }

    const months = input.warrantyMonths ?? product.warranty_months;
    if (months < 1) {
      throw new HttpError(422, 'VALIDATION_FAILED', 'The product must have a warranty period greater than zero.');
    }

    const storeToday = await todayInStore(trx);
    const start = input.startDate ?? storeToday;

    const createdRow = await insertManualWarranty(trx, {
      productId: product.id,
      customerId: customer.id,
      startDate: start,
      months: months,
    });

    const auditDetails = {
      product_id: String(product.id),
      warranty_months: months,
    };

    await writeWarrantyAudit(trx, actor.id, 'warranty.manual_created', createdRow.id, auditDetails);

    return {
      id: String(createdRow.id),
      productId: String(product.id),
      customerId: String(customer.id),
      startDate: createdRow.start_date,
      expiryDate: createdRow.expiry_date,
      source: createdRow.source,
    };
  });
}

/**
 * Attaches a customer record to an unassigned warranty (e.g., from an anonymous walk-in sale).
 *
 * @param {Object} actor - Authenticated user performing the update.
 * @param {number|string} actor.id - User ID.
 * @param {string|number} id - Target warranty ID.
 * @param {string|number} customerId - Customer ID to attach.
 * @returns {Promise<{ id: string, customerId: string }>} Updated warranty reference.
 * @throws {HttpError} If warranty not found, customer already attached, or customer not found.
 */
export async function attachWarrantyCustomer(actor, id, customerId) {
  return await runInTransaction(async (trx) => {
    const row = await findWarrantyByIdForUpdate(trx, id);
    if (!row) {
      throw new HttpError(404, 'WARRANTY_NOT_FOUND', 'Warranty not found.');
    }

    if (row.customer_id) {
      throw new HttpError(409, 'WARRANTY_CUSTOMER_ALREADY_ATTACHED', 'This warranty already has a customer.');
    }

    const customer = await findCustomerById(trx, customerId);
    if (!customer) {
      throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');
    }

    await updateWarrantyCustomer(trx, id, customerId);

    const auditDetails = {
      customer_id: String(customerId),
    };

    await writeWarrantyAudit(trx, actor.id, 'warranty.customer_attached', id, auditDetails);

    return {
      id: String(id),
      customerId: String(customerId),
    };
  });
}
