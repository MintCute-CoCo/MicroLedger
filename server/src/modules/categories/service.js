import { requireDatabase } from '../../db/knex.js';
import { HttpError } from '../../utils/http-error.js';
import {
  countActiveProducts,
  findCategory,
  insertCategory,
  selectCategories,
  updateCategoryRow,
  writeCategoryAudit,
} from './repository.js';

/**
 * Transforms an internal database category row into a public category response object.
 *
 * Purpose:
 * Converts primary keys to strings and sanitizes fields for client consumption,
 * parsing product count aggregations into numeric values.
 *
 * @param {Object} row - Raw category row from the database.
 * @returns {Object} Public category representation.
 */
function publicCategory(row) {
  const categoryId = String(row.id);
  const rawCount = row.active_product_count ?? 0;
  const activeProductCount = Number(rawCount);

  const formattedCategory = {
    id: categoryId,
    name: row.name,
    description: row.description,
    status: row.status,
    activeProductCount: activeProductCount,
  };

  return formattedCategory;
}

/**
 * Maps database constraint errors to user-friendly HTTP domain errors.
 *
 * Purpose:
 * Catches PostgreSQL unique constraint violations on category names (e.g. `categories_name_uq`)
 * and translates them into a standardized 409 Conflict HttpError.
 *
 * @param {Error} error - The caught database error.
 * @throws {HttpError} Throws 409 CATEGORY_EXISTS on unique name conflicts; otherwise rethrows the error.
 */
function mapCategoryError(error) {
  const isUniqueConstraintViolation = error.code === '23505';
  const isCategoryNameConstraint = error.constraint === 'categories_name_uq';

  if (isUniqueConstraintViolation && isCategoryNameConstraint) {
    throw new HttpError(
      409,
      'CATEGORY_EXISTS',
      'A category with that name already exists.'
    );
  }

  throw error;
}

/**
 * Retrieves a list of categories formatted for public consumption.
 *
 * Purpose:
 * Fetches categories from the repository based on the specified status filter,
 * along with the count of active products linked to each category.
 *
 * @param {string} [status='active'] - Status filter ('active', 'inactive', or 'all').
 * @returns {Promise<Array<Object>>} Array of public category objects.
 */
export async function listCategories(status = 'active') {
  // 1. Obtain database instance
  const database = requireDatabase();

  // 2. Fetch category rows from repository
  const rows = await selectCategories(database, status);

  // 3. Format database rows into public API objects
  const publicCategories = rows.map((row) => publicCategory(row));

  return publicCategories;
}

/**
 * Creates a new category and records an audit log entry.
 *
 * Purpose:
 * Inserts a new category within a database transaction, logs the creation event
 * in `audit_logs`, and returns the newly created category profile.
 *
 * @param {Object} actor - The authenticated user performing the action.
 * @param {Object} input - Validated category input data.
 * @param {string} input.name - Category name.
 * @param {string|null} [input.description] - Category description.
 * @returns {Promise<Object>} The created category formatted for public response.
 * @throws {HttpError} Throws 409 CATEGORY_EXISTS if the category name is already in use.
 */
export async function createCategory(actor, input) {
  const database = requireDatabase();

  try {
    const result = await database.transaction(async (trx) => {
      // 1. Insert the new category row
      const insertResult = await insertCategory(trx, input);
      const createdCategoryRow = insertResult[0];

      // 2. Record audit log entry for category creation
      const auditDetails = {
        name: createdCategoryRow.name,
      };
      await writeCategoryAudit(
        trx,
        actor.id,
        'category.created',
        createdCategoryRow.id,
        auditDetails
      );

      // 3. Return the formatted public category
      const publicCreated = publicCategory(createdCategoryRow);
      return publicCreated;
    });

    return result;
  } catch (error) {
    mapCategoryError(error);
  }
}

/**
 * Updates an existing category and records an audit log entry.
 *
 * Purpose:
 * Implements category modification business logic:
 * 1. Verifies the category exists.
 * 2. Enforces business rule BR-03 (AC-007): Prevents deactivating a category that still contains active products.
 * 3. Applies the updates within a database transaction.
 * 4. Logs the change event in the audit trail.
 *
 * @param {Object} actor - The authenticated user performing the update.
 * @param {number|string} id - Primary key ID of the category to update.
 * @param {Object} changes - Validated update fields (name, description, status).
 * @returns {Promise<Object>} The updated category formatted for public response.
 * @throws {HttpError} Throws 404 CATEGORY_NOT_FOUND if category does not exist.
 * @throws {HttpError} Throws 409 CATEGORY_HAS_ACTIVE_PRODUCTS if deactivating with active products.
 * @throws {HttpError} Throws 409 CATEGORY_EXISTS if updated name conflicts with existing category.
 */
export async function updateCategory(actor, id, changes) {
  const database = requireDatabase();

  try {
    const result = await database.transaction(async (trx) => {
      // 1. Check if category exists with pessimistic lock
      const currentCategory = await findCategory(trx, id, true);
      if (!currentCategory) {
        throw new HttpError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
      }

      // 2. Validate category deactivation rule (BR-03 / AC-007)
      const isDeactivating = changes.status === 'inactive';
      const isCurrentlyNotInactive = currentCategory.status !== 'inactive';

      if (isDeactivating && isCurrentlyNotInactive) {
        const countResult = await countActiveProducts(trx, id);
        const activeProductCount = Number(countResult.count);

        if (activeProductCount > 0) {
          throw new HttpError(
            409,
            'CATEGORY_HAS_ACTIVE_PRODUCTS',
            'Move or deactivate the active products before deactivating this category.'
          );
        }
      }

      // 3. Update category row in database
      const updateResult = await updateCategoryRow(trx, id, changes);
      const updatedCategoryRow = updateResult[0];

      // 4. Record audit log entry documenting previous state and changes
      const auditDetails = {
        before: currentCategory,
        changes: changes,
      };
      await writeCategoryAudit(
        trx,
        actor.id,
        'category.updated',
        id,
        auditDetails
      );

      // 5. Return formatted public category
      const publicUpdated = publicCategory(updatedCategoryRow);
      return publicUpdated;
    });

    return result;
  } catch (error) {
    mapCategoryError(error);
  }
}
