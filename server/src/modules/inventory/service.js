import { HttpError } from '../../utils/http-error.js';
import {
  countMovements,
  findStoreTimeZone,
  insertMovement,
  inventoryRows,
  inventorySummary,
  lockProduct,
  movementRows,
  productExists,
  runInTransaction,
  updateProductStock,
  writeInventoryAudit,
} from './repository.js';

/**
 * Maximum permissible stock quantity represented by standard 32-bit signed integer limits.
 */
const MAX_STOCK = 2_147_483_647;

/**
 * Helper function to create an HTTP 409 conflict error with consistent formatting.
 *
 * @param {string} code - Application-specific error code string.
 * @param {string} message - Human-readable explanation.
 * @param {Object} [details=null] - Optional additional context details.
 * @returns {HttpError} Instantiated HTTP 409 conflict error.
 */
function stockConflict(code, message, details = null) {
  return new HttpError(409, code, message, details);
}

/**
 * Receives incoming stock shipments for a product and updates the ledger atomically.
 *
 * @param {Object} user - The authenticated user recording the stock receipt.
 * @param {Object} input - Stock-in input payload.
 * @param {string|number} input.productId - Target product primary key.
 * @param {number} input.quantity - Inward quantity to add to current stock.
 * @param {string} [input.note] - Optional shipment note or reference.
 * @returns {Promise<Object>} Created movement details and updated stock quantity.
 * @throws {HttpError} 404 if product not found, 409 if inactive or stock limit exceeded.
 */
export async function stockIn(user, input) {
  return await runInTransaction(async (trx) => {
    // Lock the product row to prevent race conditions during receipt
    const product = await lockProduct(trx, input.productId);
    if (!product) {
      throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    }

    if (product.status !== 'active') {
      throw stockConflict(
        'PRODUCT_INACTIVE',
        'Stock cannot be received for an inactive product.'
      );
    }

    const currentStock = product.stock_qty;
    const incomingQuantity = input.quantity;
    const nextStock = currentStock + incomingQuantity;

    if (nextStock > MAX_STOCK) {
      throw stockConflict(
        'STOCK_LIMIT_EXCEEDED',
        'The resulting stock quantity is too large.'
      );
    }

    // Persist new stock balance in products table
    await updateProductStock(trx, product.id, nextStock);

    // Record immutable ledger transaction
    const [movement] = await insertMovement(trx, {
      productId: product.id,
      type: 'stock_in',
      quantityChange: incomingQuantity,
      balanceAfter: nextStock,
      reason: input.note,
      userId: user.id,
    });

    // Write audit trail entry
    await writeInventoryAudit(trx, user.id, product.id, 'inventory.stock_in', {
      quantity: incomingQuantity,
      balance_after: nextStock,
    });

    return {
      movementId: String(movement.id),
      productId: String(product.id),
      stockQty: nextStock,
      createdAt: movement.created_at,
    };
  });
}

/**
 * Adjusts stock levels for discrepancies (e.g. damages, cycle count reconciliations).
 * Supports both relative delta changes and absolute target stock updates.
 *
 * @param {Object} user - Authenticated administrator performing the adjustment.
 * @param {Object} input - Stock adjustment payload.
 * @param {string|number} input.productId - Target product primary key.
 * @param {number} [input.quantityChange] - Signed relative difference to adjust.
 * @param {number} [input.newQuantity] - Absolute new stock target.
 * @param {string} input.reason - Mandatory explanation for this adjustment.
 * @returns {Promise<Object>} Created movement details, delta, and new stock balance.
 * @throws {HttpError} 404 if product not found, 422 if zero change, 409 if negative or overflow.
 */
export async function adjustStock(user, input) {
  return await runInTransaction(async (trx) => {
    // Lock the product row for atomic adjustment calculation
    const product = await lockProduct(trx, input.productId);
    if (!product) {
      throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    }

    const currentStock = product.stock_qty;

    // Determine the signed delta quantity
    let quantityChange;
    if (input.quantityChange !== undefined) {
      quantityChange = input.quantityChange;
    } else {
      quantityChange = input.newQuantity - currentStock;
    }

    if (quantityChange === 0) {
      throw new HttpError(
        422,
        'ZERO_STOCK_CHANGE',
        'The adjustment would not change stock.'
      );
    }

    const nextStock = currentStock + quantityChange;

    if (nextStock < 0) {
      throw stockConflict(
        'NEGATIVE_STOCK',
        `The adjustment would make stock negative. Current stock is ${currentStock}.`,
        { available: currentStock }
      );
    }

    if (nextStock > MAX_STOCK) {
      throw stockConflict(
        'STOCK_LIMIT_EXCEEDED',
        'The resulting stock quantity is too large.'
      );
    }

    // Update stock balance
    await updateProductStock(trx, product.id, nextStock);

    // Record immutable ledger row
    const [movement] = await insertMovement(trx, {
      productId: product.id,
      type: 'adjustment',
      quantityChange,
      balanceAfter: nextStock,
      reason: input.reason,
      userId: user.id,
    });

    // Write audit trail entry
    await writeInventoryAudit(trx, user.id, product.id, 'inventory.adjusted', {
      quantity_change: quantityChange,
      balance_after: nextStock,
      reason: input.reason,
    });

    return {
      movementId: String(movement.id),
      productId: String(product.id),
      quantityChange,
      stockQty: nextStock,
      createdAt: movement.created_at,
    };
  });
}

/**
 * Retrieves a paginated list of current product inventory levels along with aggregate metrics.
 * Cost price and inventory valuation are masked for non-Admin staff roles.
 *
 * @param {Object} user - Authenticated user with role metadata.
 * @param {Object} filters - Search, low stock, and pagination criteria.
 * @returns {Promise<Object>} Paginated inventory items and overview summary metrics.
 */
export async function listInventory(user, filters) {
  const [rows, summary] = await Promise.all([
    inventoryRows(null, user, filters),
    inventorySummary(null, filters),
  ]);

  const items = rows.map((row) => {
    const productItem = {
      id: String(row.id),
      sku: row.sku,
      name: row.name,
      categoryId: String(row.category_id),
      categoryName: row.category_name,
      stockQty: row.stock_qty,
      reorderLevel: row.reorder_level,
      status: row.status,
    };

    // Staff must never see cost price or inventory value (AC-006 / AC-030)
    if (user.role === 'admin') {
      productItem.costPrice = row.cost_price;
      productItem.stockValue = row.stock_value;
    }

    return productItem;
  });

  const totalProducts = Number(summary?.product_count ?? 0);
  const totalUnits = Number(summary?.total_units ?? 0);
  const lowStockCount = Number(summary?.low_stock_count ?? 0);

  return {
    items,
    total: totalProducts,
    totalUnits,
    lowStockCount,
    page: filters.page,
    pageSize: filters.page_size,
  };
}

/**
 * Helper to fetch and format movement ledger rows with total pagination count.
 *
 * @param {Object} filters - Movement query filters with time zone.
 * @param {number|string|null} productId - Specific product ID, or null for all movements.
 * @returns {Promise<Object>} Paginated movement items and total count.
 */
async function movementResult(filters, productId) {
  const [rows, countRecord] = await Promise.all([
    movementRows(null, filters, productId),
    countMovements(null, filters, productId),
  ]);

  const items = rows.map((row) => ({
    id: String(row.id),
    productId: String(row.product_id),
    sku: row.sku,
    productName: row.product_name,
    type: row.type,
    quantityChange: row.quantity_change,
    balanceAfter: row.balance_after,
    reason: row.reason,
    createdAt: row.created_at,
    userName: row.user_name,
  }));

  const total = Number(countRecord?.count ?? 0);

  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.page_size,
  };
}

/**
 * Lists global stock movement ledger transactions with user-configured time zone adjustments.
 *
 * @param {Object} filters - Search, type, date range, and pagination parameters.
 * @returns {Promise<Object>} Paginated stock movements across all catalog items.
 */
export async function listMovements(filters) {
  const timeZone = await findStoreTimeZone();
  const queryWithTimeZone = {
    ...filters,
    timeZone,
  };

  return await movementResult(queryWithTimeZone, null);
}

/**
 * Lists stock movement ledger history for a specific product item.
 *
 * @param {number|string} productId - Target product primary key.
 * @param {Object} filters - Search, date range, and pagination parameters.
 * @returns {Promise<Object>} Paginated stock movements for the requested product.
 * @throws {HttpError} 404 if product does not exist.
 */
export async function listProductMovements(productId, filters) {
  const exists = await productExists(null, productId);
  if (!exists) {
    throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
  }

  const timeZone = await findStoreTimeZone();
  const queryWithTimeZone = {
    ...filters,
    timeZone,
  };

  return await movementResult(queryWithTimeZone, productId);
}
