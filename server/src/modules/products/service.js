import { HttpError } from '../../utils/http-error.js';
import {
  countProductsQuery,
  findCategory,
  insertOpeningMovement,
  insertProduct,
  insertProductAudit,
  listProductsQuery,
  lookupProductsQuery,
  runInTransaction,
  selectProduct,
  updateProductRow,
} from './repository.js';

/**
 * Transforms a raw database product row into a standardized public API representation.
 * Masks the cost price field for non-Admin staff users (AC-006 / AC-030).
 *
 * @param {Object} row - Raw product row from database joined with category.
 * @param {string} role - Role of the requesting user ('admin' or 'staff').
 * @returns {Object} Cleaned, formatted product object.
 */
function publicProduct(row, role) {
  const product = {
    id: String(row.id),
    sku: row.sku,
    name: row.name,
    categoryId: String(row.category_id),
    categoryName: row.category_name,
    unit: row.unit,
    sellingPrice: row.selling_price,
    stockQty: row.stock_qty,
    reorderLevel: row.reorder_level,
    warrantyMonths: row.warranty_months,
    tracksSerial: row.tracks_serial,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  // Cost price is classified information restricted strictly to administrators
  if (role === 'admin') {
    product.costPrice = row.cost_price;
  }

  return product;
}

/**
 * Maps database errors (such as unique index conflicts) into user-friendly HTTP errors.
 *
 * @param {Error} error - Captured database error.
 * @throws {HttpError} Translated 409 conflict error or re-throws the original error.
 */
function mapProductError(error) {
  const isUniqueViolation = error.code === '23505';
  const isSkuConstraint = error.constraint === 'products_sku_active_uq';

  if (isUniqueViolation && isSkuConstraint) {
    throw new HttpError(
      409,
      'SKU_DUPLICATE',
      'The SKU is already used by an active product.'
    );
  }

  throw error;
}

/**
 * Converts a decimal monetary amount string or number to integer minor units (cents).
 * Avoids floating-point rounding inaccuracies when comparing prices.
 *
 * @param {string|number} amount - Monetary amount (e.g. "12.50").
 * @returns {number} Integer representing amount in cents.
 */
function toMinorUnits(amount) {
  const stringAmount = String(amount);
  const parts = stringAmount.split('.');
  const wholePart = parts[0];
  const fractionPart = parts[1] || '';

  const paddedFraction = fractionPart.padEnd(2, '0').slice(0, 2);
  const totalCents = Number(wholePart) * 100 + Number(paddedFraction);

  return totalCents;
}

/**
 * Retrieves a paginated list of catalog products based on search filters and sorting options.
 *
 * @param {Object} user - The authenticated user requesting the catalog.
 * @param {Object} filters - Search, filter, sorting, and pagination options.
 * @returns {Promise<Object>} Paginated products array and total count.
 */
export async function listProducts(user, filters) {
  const pageSize = filters.page_size;
  const page = filters.page;
  const offset = (page - 1) * pageSize;

  const [rows, countRecord] = await Promise.all([
    listProductsQuery(null, user, filters).limit(pageSize).offset(offset),
    countProductsQuery(null, user, filters),
  ]);

  const items = rows.map((row) => publicProduct(row, user.role));
  const total = Number(countRecord?.count ?? 0);

  return {
    items,
    total,
    page,
    pageSize,
  };
}

/**
 * Performs fast POS ranked search across active catalog products matching a query string.
 *
 * @param {Object} user - Authenticated user with role metadata.
 * @param {string} query - Free-text search string for SKU or name matching.
 * @returns {Promise<Array<Object>>} Top matching product items.
 */
export async function lookupProducts(user, query) {
  const rows = await lookupProductsQuery(null, query);
  const items = rows.map((row) => publicProduct(row, user.role));
  return items;
}

/**
 * Retrieves full details for a single product by primary key ID.
 *
 * @param {Object} user - Authenticated user with role metadata.
 * @param {number|string} id - Product primary key.
 * @returns {Promise<Object>} Formatted product details.
 * @throws {HttpError} 404 if product not found.
 */
export async function getProduct(user, id) {
  const row = await selectProduct(null, id);

  if (!row) {
    throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
  }

  return publicProduct(row, user.role);
}

/**
 * Creates a new product catalog entry and optionally records initial opening stock.
 *
 * @param {Object} user - Authenticated administrator creating the product.
 * @param {Object} input - Validated product creation payload.
 * @returns {Promise<Object>} Created product details.
 * @throws {HttpError} 422 if category inactive, 409 if SKU duplicate.
 */
export async function createProduct(user, input) {
  // Pre-validate that the chosen category exists and is currently active
  const category = await findCategory(null, input.categoryId);
  if (!category || category.status !== 'active') {
    throw new HttpError(422, 'CATEGORY_INACTIVE', 'Choose an active category.');
  }

  // Construct initial product model with sensible defaults
  const productData = {
    sku: input.sku.trim(),
    name: input.name,
    category_id: input.categoryId,
    unit: input.unit ?? 'pcs',
    cost_price: input.costPrice ?? '0',
    selling_price: input.sellingPrice,
    stock_qty: input.openingStock ?? 0,
    reorder_level: input.reorderLevel ?? 5,
    warranty_months: input.warrantyMonths ?? 0,
    tracks_serial: input.tracksSerial ?? false,
    status: 'active',
  };

  try {
    return await runInTransaction(async (trx) => {
      // Re-verify category with row lock inside transaction to prevent concurrent deactivation
      const currentCategory = await findCategory(trx, input.categoryId, true);
      if (!currentCategory || currentCategory.status !== 'active') {
        throw new HttpError(422, 'CATEGORY_INACTIVE', 'Choose an active category.');
      }

      // Insert product record
      const [created] = await insertProduct(trx, productData);

      // Record opening inventory movement transaction if initial stock was provided
      if (productData.stock_qty > 0) {
        await insertOpeningMovement(trx, {
          productId: created.id,
          quantity: productData.stock_qty,
          userId: user.id,
        });
      }

      // Record audit log entry
      await insertProductAudit(trx, user.id, created.id, 'product.created', {
        sku: created.sku,
        opening_stock: productData.stock_qty,
      });

      // Retrieve full joined product details
      const row = await selectProduct(trx, created.id);
      return publicProduct(row, user.role);
    });
  } catch (error) {
    mapProductError(error);
  }
}

/**
 * Updates an existing product's metadata, category, status, or pricing.
 * Note: stock quantity can never be modified through this function (SRS-INV-01).
 *
 * @param {Object} user - Authenticated administrator updating the product.
 * @param {number|string} id - Product primary key.
 * @param {Object} changes - Validated field modifications.
 * @returns {Promise<Object>} Updated product details.
 * @throws {HttpError} 404, 409, or 422 depending on constraint validations.
 */
export async function updateProduct(user, id, changes) {
  try {
    return await runInTransaction(async (trx) => {
      // Lock target product row for update
      const current = await selectProduct(trx, id, true);
      if (!current) {
        throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
      }

      // Guard: Deactivating a product with existing stock requires explicit confirmation
      const isDeactivating = changes.status === 'inactive' && current.status === 'active';
      const hasRemainingStock = current.stock_qty > 0;
      const lacksConfirmation = !changes.confirmDeactivate;

      if (isDeactivating && hasRemainingStock && lacksConfirmation) {
        throw new HttpError(
          409,
          'PRODUCT_DEACTIVATION_CONFIRMATION_REQUIRED',
          'Confirm deactivation while stock remains.'
        );
      }

      // Guard: Reactivating a product requires that its parent category is currently active
      const isReactivating = changes.status === 'active' && current.status !== 'active';
      const isCategoryInactive = current.category_status !== 'active';

      if (isReactivating && isCategoryInactive) {
        throw new HttpError(
          409,
          'CATEGORY_INACTIVE',
          'Reactivate the product category before reactivating this product.'
        );
      }

      // Guard: Changing category requires that target category is active
      const isCategoryChanging = changes.categoryId !== undefined &&
        String(changes.categoryId) !== String(current.category_id);

      if (isCategoryChanging) {
        const targetCategory = await findCategory(trx, changes.categoryId, true);
        if (!targetCategory || targetCategory.status !== 'active') {
          throw new HttpError(422, 'CATEGORY_INACTIVE', 'Choose an active category.');
        }
      }

      // Assemble update dictionary
      const updatePayload = {};

      if (changes.name !== undefined) {
        updatePayload.name = changes.name;
      }
      if (changes.categoryId !== undefined) {
        updatePayload.category_id = changes.categoryId;
      }
      if (changes.unit !== undefined) {
        updatePayload.unit = changes.unit;
      }
      if (changes.costPrice !== undefined) {
        updatePayload.cost_price = changes.costPrice;
      }
      if (changes.sellingPrice !== undefined) {
        updatePayload.selling_price = changes.sellingPrice;
      }
      if (changes.reorderLevel !== undefined) {
        updatePayload.reorder_level = changes.reorderLevel;
      }
      if (changes.warrantyMonths !== undefined) {
        updatePayload.warranty_months = changes.warrantyMonths;
      }
      if (changes.tracksSerial !== undefined) {
        updatePayload.tracks_serial = changes.tracksSerial;
      }
      if (changes.status !== undefined) {
        updatePayload.status = changes.status;
      }

      // Persist modifications
      await updateProductRow(trx, id, updatePayload);

      // Inspect if cost or selling price changed and log dedicated price change audit
      const costChanged = changes.costPrice !== undefined &&
        toMinorUnits(changes.costPrice) !== toMinorUnits(current.cost_price);

      const sellingPriceChanged = changes.sellingPrice !== undefined &&
        toMinorUnits(changes.sellingPrice) !== toMinorUnits(current.selling_price);

      if (costChanged || sellingPriceChanged) {
        const beforePrices = {};
        const afterPrices = {};

        if (costChanged) {
          beforePrices.cost_price = current.cost_price;
          afterPrices.cost_price = changes.costPrice;
        }

        if (sellingPriceChanged) {
          beforePrices.selling_price = current.selling_price;
          afterPrices.selling_price = changes.sellingPrice;
        }

        await insertProductAudit(trx, user.id, id, 'product.price_changed', {
          before: beforePrices,
          after: afterPrices,
        });
      }

      // Log general product update audit trail (excluding confirmation flag)
      const auditChanges = {};
      for (const [key, val] of Object.entries(changes)) {
        if (key !== 'confirmDeactivate') {
          auditChanges[key] = val;
        }
      }

      await insertProductAudit(trx, user.id, id, 'product.updated', {
        changes: auditChanges,
      });

      // Return refreshed product details
      const updatedRow = await selectProduct(trx, id);
      return publicProduct(updatedRow, user.role);
    });
  } catch (error) {
    mapProductError(error);
  }
}
