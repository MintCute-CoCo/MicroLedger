import { HttpError } from '../../utils/http-error.js';
import {
  deductStock,
  findActiveWarrantyClaimForSaleItems,
  findSaleById,
  findSaleByIdempotencyKey,
  findSaleCustomer,
  findStoreTimeZone,
  getSaleStartDate,
  insertSale,
  insertSaleInventoryTransaction,
  insertSaleItems,
  insertSaleItemSerials,
  insertSaleWarranties,
  lockIdempotencyKey,
  lockSaleProducts,
  markSaleVoided,
  releaseSaleItemSerials,
  runInTransaction,
  saleDetailsQuery,
  saleItems,
  salesCountQuery,
  salesListQuery,
  salesUserFilterOptions,
  updateStock,
  writeSaleAudit,
} from './repository.js';

/**
 * Maximum permissible stock quantity represented by standard 32-bit signed integer limits.
 */
const MAX_STOCK_LIMIT = 2_147_483_647;

/**
 * Converts a decimal monetary amount string or number to integer minor units (cents).
 * Avoids floating-point rounding inaccuracies during monetary calculations.
 *
 * @param {string|number|null} amount - Monetary amount (e.g. "12.50").
 * @returns {number} Integer representing amount in cents.
 */
function toMinorUnits(amount) {
  const amountStr = String(amount ?? '0');
  const parts = amountStr.split('.');
  const wholePart = parts[0];
  const fractionPart = parts[1] || '';

  const paddedFraction = fractionPart.padEnd(2, '0').slice(0, 2);
  const totalCents = Number(wholePart) * 100 + Number(paddedFraction);

  return totalCents;
}

/**
 * Converts an integer count of minor units (cents) into a formatted decimal string.
 *
 * @param {number} amount - Integer amount in cents.
 * @returns {string} Formatted decimal string (e.g. "12.50").
 */
function fromMinorUnits(amount) {
  const units = Math.floor(amount / 100);
  const cents = amount % 100;
  const paddedCents = String(cents).padStart(2, '0');
  return `${units}.${paddedCents}`;
}

/**
 * Transforms a raw sale item row into a standardized public representation.
 *
 * @param {Object} row - Raw sale item database record.
 * @returns {Object} Cleaned sale item object.
 */
function publicItem(row) {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    sku: row.sku_snapshot,
    name: row.name_snapshot,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    lineTotal: row.line_total,
  };
}

/**
 * Transforms a raw sale header row and its line items into a standardized public representation.
 *
 * @param {Object} row - Raw sale header database record.
 * @param {Array<Object>} [items=[]] - Formatted line items.
 * @returns {Object} Cleaned sale object.
 */
function publicSale(row, items = []) {
  const customerId = row.customer_id === null ? null : String(row.customer_id);
  const customerName = row.customer_name ?? 'Walk-in';

  return {
    id: String(row.id),
    saleNo: row.sale_no,
    soldAt: row.sold_at,
    userId: String(row.user_id),
    staffName: row.staff_name,
    customerId,
    customerName,
    customerPhone: row.customer_phone,
    subtotal: row.subtotal,
    discountAmount: row.discount_amount,
    total: row.total,
    paymentMethod: row.payment_method,
    status: row.status,
    voidReason: row.void_reason ?? null,
    items,
  };
}

/**
 * Retrieves a complete sale record including all of its line item snapshots.
 *
 * @param {import('knex').Knex|import('knex').Knex.Transaction} trxOrDb - Database client or transaction.
 * @param {number|string} id - Sale primary key.
 * @returns {Promise<Object>} Full public sale object.
 */
async function saleWithItems(trxOrDb, id) {
  const saleRecord = await saleDetailsQuery(trxOrDb, id);
  const itemRows = await saleItems(trxOrDb, id);
  const formattedItems = itemRows.map(publicItem);

  return publicSale(saleRecord, formattedItems);
}

/**
 * Consolidates duplicate product line entries in a sale checkout payload by summing their quantities
 * and concatenating serial numbers. Returns sorted array by product ID to prevent deadlocks.
 *
 * @param {Array<Object>} items - Raw array of line items from checkout payload.
 * @returns {Array<Object>} Merged and sorted line items.
 * @throws {HttpError} 422 if combined quantity overflows integer limits.
 */
function mergeItems(items) {
  const mergedMap = new Map();

  for (const item of items) {
    const productIdKey = String(BigInt(item.productId));
    const priorItem = mergedMap.get(productIdKey);

    const existingQty = priorItem?.quantity ?? 0;
    const combinedQuantity = existingQty + item.quantity;

    if (combinedQuantity > MAX_STOCK_LIMIT) {
      throw new HttpError(422, 'VALIDATION_FAILED', 'The combined quantity is too large.');
    }

    const priorSerials = priorItem?.serialNumbers ?? [];
    const itemSerials = item.serialNumbers ?? [];
    const combinedSerials = [...priorSerials, ...itemSerials];

    mergedMap.set(productIdKey, {
      quantity: combinedQuantity,
      serialNumbers: combinedSerials,
    });
  }

  const mergedList = [...mergedMap.entries()].map(([productId, itemDetails]) => ({
    productId,
    ...itemDetails,
  }));

  // Sort by product ID ascending to avoid database deadlock during locking
  mergedList.sort((left, right) => (BigInt(left.productId) < BigInt(right.productId) ? -1 : 1));

  return mergedList;
}

/**
 * Creates an HTTP 409 conflict error instance.
 *
 * @param {string} code - Application-specific conflict error code.
 * @param {string} message - Human-readable explanation.
 * @param {Object} [details] - Context details.
 * @returns {HttpError} Instantiated HTTP 409 error.
 */
function stockError(code, message, details) {
  return new HttpError(409, code, message, details);
}

/**
 * Completes a POS sale transaction atomically with full inventory deductions,
 * line item snapshots, serial number tracking, warranty activations, and audit trails.
 * Enforces idempotency via the Idempotency-Key header.
 *
 * @param {Object} user - The authenticated cashier user completing the sale.
 * @param {Object} input - Validated checkout payload.
 * @param {string} idempotencyKey - Unique client-provided request idempotency key.
 * @returns {Promise<Object>} Completed sale details.
 * @throws {HttpError} 404, 409, or 422 for constraint failures.
 */
export async function completeSale(user, input, idempotencyKey) {
  if (!idempotencyKey || idempotencyKey.length < 1 || idempotencyKey.length > 64) {
    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'Provide a valid Idempotency-Key header.',
      { field: 'Idempotency-Key' }
    );
  }

  // Merge duplicate lines for the same product
  const mergedLines = mergeItems(input.items);
  if (mergedLines.length > 100) {
    throw new HttpError(422, 'VALIDATION_FAILED', 'A sale may contain at most 100 distinct products.');
  }

  try {
    return await runInTransaction(async (trx) => {
      // Acquire PostgreSQL transaction-scoped advisory lock for this idempotency key
      await lockIdempotencyKey(trx, idempotencyKey);

      // Check if this sale was already processed in a previous replayed request (AC-021)
      const existingSale = await findSaleByIdempotencyKey(trx, idempotencyKey);
      if (existingSale) {
        return await saleWithItems(trx, existingSale.id);
      }

      // If customer assigned, verify existence
      if (input.customerId) {
        const customer = await findSaleCustomer(trx, input.customerId);
        if (!customer) {
          throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');
        }
      }

      // Lock all products in ascending ID order to prevent race conditions and deadlocks
      const productIds = mergedLines.map((line) => line.productId);
      const lockedProducts = await lockSaleProducts(trx, productIds);
      const productById = new Map(lockedProducts.map((p) => [String(p.id), p]));

      const pricedLines = [];
      let subtotalMinor = 0;

      for (const line of mergedLines) {
        const product = productById.get(line.productId);

        if (!product) {
          throw new HttpError(
            404,
            'PRODUCT_NOT_FOUND',
            'A product in the sale was not found.',
            { productId: line.productId }
          );
        }

        if (product.status !== 'active') {
          throw stockError(
            'PRODUCT_INACTIVE',
            `${product.name} is inactive.`,
            { productId: line.productId, productName: product.name }
          );
        }

        // Validate serial tracking requirements
        if (product.tracks_serial) {
          const serialCount = line.serialNumbers.length;
          const uniqueSerials = new Set(line.serialNumbers);
          const hasDuplicateSerials = uniqueSerials.size !== serialCount;

          if (line.quantity > 100 || serialCount !== line.quantity || hasDuplicateSerials) {
            throw new HttpError(
              422,
              'VALIDATION_FAILED',
              `Enter one unique serial number per ${product.name} unit (up to 100).`,
              { productId: line.productId, field: 'serialNumbers' }
            );
          }
        } else if (line.serialNumbers.length > 0) {
          throw new HttpError(
            422,
            'VALIDATION_FAILED',
            `${product.name} does not track serial numbers.`,
            { productId: line.productId, field: 'serialNumbers' }
          );
        }

        // Guard against overselling
        if (product.stock_qty < line.quantity) {
          throw stockError(
            'INSUFFICIENT_STOCK',
            `Only ${product.stock_qty} units of ${product.name} are available.`,
            {
              productId: line.productId,
              productName: product.name,
              available: product.stock_qty,
              requested: line.quantity,
            }
          );
        }

        const unitPriceMinor = toMinorUnits(product.selling_price);
        const lineTotalMinor = unitPriceMinor * line.quantity;

        if (
          !Number.isSafeInteger(lineTotalMinor) ||
          !Number.isSafeInteger(subtotalMinor + lineTotalMinor)
        ) {
          throw new HttpError(422, 'VALIDATION_FAILED', 'The sale total is too large.');
        }

        subtotalMinor += lineTotalMinor;
        pricedLines.push({
          ...line,
          product,
          unitPriceMinor,
          lineTotalMinor,
        });
      }

      // Calculate discount and net total
      const discountMinor = toMinorUnits(input.discountAmount);
      if (discountMinor > subtotalMinor) {
        throw new HttpError(
          422,
          'VALIDATION_FAILED',
          'The discount cannot exceed the subtotal.',
          { field: 'discountAmount' }
        );
      }

      const totalMinor = subtotalMinor - discountMinor;

      // Atomically deduct stock from each product
      for (const line of pricedLines) {
        const updated = await deductStock(trx, line.product.id, line.quantity);
        if (!updated.length) {
          throw stockError(
            'INSUFFICIENT_STOCK',
            `Stock changed for ${line.product.name}.`,
            { productId: String(line.product.id), productName: line.product.name }
          );
        }
        line.newStockQty = updated[0].stock_qty;
      }

      // Insert master sale record
      const [createdSale] = await insertSale(trx, {
        idempotency_key: idempotencyKey,
        user_id: user.id,
        customer_id: input.customerId ?? null,
        subtotal: fromMinorUnits(subtotalMinor),
        discount_amount: fromMinorUnits(discountMinor),
        total: fromMinorUnits(totalMinor),
        payment_method: input.paymentMethod,
      });

      // Insert line item snapshots
      const itemSnapshots = pricedLines.map((line) => ({
        sale_id: createdSale.id,
        product_id: line.product.id,
        sku_snapshot: line.product.sku,
        name_snapshot: line.product.name,
        quantity: line.quantity,
        unit_price: fromMinorUnits(line.unitPriceMinor),
        line_total: fromMinorUnits(line.lineTotalMinor),
      }));

      const createdItems = await insertSaleItems(trx, itemSnapshots);

      // Record immutable inventory ledger transactions
      for (const line of pricedLines) {
        await insertSaleInventoryTransaction(trx, {
          product_id: line.product.id,
          type: 'sale',
          quantity_change: -line.quantity,
          balance_after: line.newStockQty,
          reason: createdSale.sale_no,
          reference_type: 'sale',
          reference_id: createdSale.id,
          user_id: user.id,
        });
      }

      // Lookup store time zone and calculate start date for warranty records
      const timeZone = await findStoreTimeZone(trx);
      const startDate = await getSaleStartDate(trx, createdSale.id, timeZone);

      // Record serial numbers and warranties
      for (let i = 0; i < pricedLines.length; i += 1) {
        const line = pricedLines[i];
        const saleItem = createdItems[i];

        if (line.product.tracks_serial) {
          const serialRecords = line.serialNumbers.map((serialNo) => ({
            sale_item_id: saleItem.id,
            product_id: line.product.id,
            serial_no: serialNo,
          }));
          await insertSaleItemSerials(trx, serialRecords);
        }

        const warrantyMonths = Number(line.product.warranty_months);
        if (warrantyMonths > 0) {
          const serials = line.product.tracks_serial ? line.serialNumbers : [null];
          const warrantyRecords = serials.map((serialNo) => ({
            sale_item_id: saleItem.id,
            product_id: line.product.id,
            customer_id: input.customerId ?? null,
            serial_no: serialNo,
            start_date: startDate,
            expiry_date: trx.raw("?::date + (?::text || ' months')::interval", [
              startDate,
              warrantyMonths,
            ]),
            source: 'sale',
          }));
          await insertSaleWarranties(trx, warrantyRecords);
        }
      }

      // Record system audit log entry
      await writeSaleAudit(trx, user.id, createdSale.id, 'sale.completed', {
        sale_no: createdSale.sale_no,
        total: createdSale.total,
        item_count: pricedLines.length,
      });

      return await saleWithItems(trx, createdSale.id);
    });
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'serial_active_uq') {
      throw new HttpError(
        409,
        'SERIAL_DUPLICATE',
        'A serial number is already active for this product.'
      );
    }
    throw error;
  }
}

/**
 * Retrieves a paginated list of sales history matching filter parameters.
 *
 * @param {Object} filters - Validated filter and pagination options.
 * @returns {Promise<Object>} Paginated sales items and total count.
 */
export async function listSales(filters) {
  const timeZone = await findStoreTimeZone();
  const queryFilters = {
    ...filters,
    timeZone,
  };

  const [rows, countRecord] = await Promise.all([
    salesListQuery(null, queryFilters),
    salesCountQuery(null, queryFilters),
  ]);

  const items = rows.map((row) => publicSale({ ...row, user_id: row.user_id }, []));
  const total = Number(countRecord?.count ?? 0);

  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.page_size,
  };
}

/**
 * Retrieves distinct staff users who have created sales transactions, for filtering dropdowns.
 *
 * @returns {Promise<Array<{ id: string, fullName: string }>>} List of staff users.
 */
export async function listSalesFilterUsers() {
  const users = await salesUserFilterOptions();
  return users.map((user) => ({
    id: String(user.id),
    fullName: user.full_name,
  }));
}

/**
 * Retrieves full details and line items for a specific sale by primary key ID.
 *
 * @param {number|string} id - Sale primary key.
 * @returns {Promise<Object>} Sale details with items.
 * @throws {HttpError} 404 if sale not found.
 */
export async function getSale(id) {
  const exists = await findSaleById(null, id);
  if (!exists) {
    throw new HttpError(404, 'SALE_NOT_FOUND', 'Sale not found.');
  }

  return await saleWithItems(null, id);
}

/**
 * Voids an existing completed sale, restores inventory stock, records a void_reversal ledger row,
 * releases captured serial numbers, and writes an audit log (Admin only).
 *
 * @param {Object} actor - Authenticated administrator user performing the void.
 * @param {number|string} id - Primary key of the sale to void.
 * @param {string} reason - Mandatory reason for voiding.
 * @returns {Promise<Object>} Refreshed sale details with voided status.
 * @throws {HttpError} 404, 409 for constraint violations.
 */
export async function voidSale(actor, id, reason) {
  return await runInTransaction(async (trx) => {
    // Lock target sale row
    const sale = await findSaleById(trx, id, true);
    if (!sale) {
      throw new HttpError(404, 'SALE_NOT_FOUND', 'Sale not found.');
    }

    if (sale.status === 'voided') {
      throw stockError('SALE_ALREADY_VOIDED', 'This sale has already been voided.');
    }

    // Retrieve line items
    const lines = await saleItems(trx, id);
    const saleItemIds = lines.map((line) => line.id);

    // Guard: Prevent voiding if an active warranty claim exists for any sale item
    const activeClaim = await findActiveWarrantyClaimForSaleItems(trx, saleItemIds);
    if (activeClaim) {
      throw stockError(
        'SALE_HAS_CLAIMS',
        'This sale has a warranty claim and cannot be voided.'
      );
    }

    // Lock product rows in ascending order
    const uniqueProductIds = [...new Set(lines.map((line) => String(line.product_id)))];
    uniqueProductIds.sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1));

    const lockedProducts = await lockSaleProducts(trx, uniqueProductIds);
    const productsById = new Map(lockedProducts.map((p) => [String(p.id), p]));

    // Mark sale as voided
    await markSaleVoided(trx, id, actor.id, reason);

    // Release any serial numbers associated with this sale
    await releaseSaleItemSerials(trx, saleItemIds);

    // Restore stock and record inventory void reversals
    for (const line of lines) {
      const product = productsById.get(String(line.product_id));
      const nextStock = product.stock_qty + line.quantity;

      if (nextStock > MAX_STOCK_LIMIT) {
        throw stockError('STOCK_LIMIT_EXCEEDED', 'Voiding this sale would exceed the stock limit.');
      }

      await updateStock(trx, product.id, nextStock);

      await insertSaleInventoryTransaction(trx, {
        product_id: product.id,
        type: 'void_reversal',
        quantity_change: line.quantity,
        balance_after: nextStock,
        reason,
        reference_type: 'sale',
        reference_id: sale.id,
        user_id: actor.id,
      });

      product.stock_qty = nextStock;
    }

    // Record audit log entry
    await writeSaleAudit(trx, actor.id, id, 'sale.voided', { reason });

    return await saleWithItems(trx, id);
  });
}
