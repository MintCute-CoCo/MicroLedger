/**
 * Categories Repository
 *
 * Handles database operations for the `categories` table and related category queries.
 * Strictly adheres to the project architecture rule: "Repositories do SQL only."
 */

/**
 * Retrieves categories optionally filtered by status, including a count of active products.
 *
 * Purpose:
 * Executes a SELECT query on `categories` with a LEFT JOIN to an aggregated subquery
 * that counts active products in each category, ordering the results by category name ascending.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {string} [status] - Filter status ('active', 'inactive', or 'all').
 * @returns {import('knex').Knex.QueryBuilder} Knex query builder resolving to category rows with active product counts.
 */
export function selectCategories(trx, status) {
  // 1. Build subquery to count active products per category
  const productCountsSubquery = trx('products');
  productCountsSubquery.select('category_id');
  productCountsSubquery.count('id as active_product_count');
  productCountsSubquery.where('status', 'active');
  productCountsSubquery.groupBy('category_id');
  const productCountsAlias = productCountsSubquery.as('pc');

  // 2. Query categories and join the product counts
  const query = trx('categories');
  query.leftJoin(productCountsAlias, 'pc.category_id', 'categories.id');
  query.select(
    'categories.id',
    'categories.name',
    'categories.description',
    'categories.status',
    'pc.active_product_count'
  );
  query.orderBy('categories.name', 'asc');

  // 3. Conditionally filter by status if 'active' or 'inactive' was specified
  const shouldFilterStatus = status === 'active' || status === 'inactive';
  if (shouldFilterStatus) {
    query.where('categories.status', status);
  }

  return query;
}

/**
 * Finds a single category by its primary key ID.
 *
 * Purpose:
 * Queries the `categories` table for a record matching the given ID,
 * optionally acquiring a pessimistic row lock (`FOR UPDATE`) during transactions.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {number|string} id - Category primary key ID.
 * @param {boolean} [lock=false] - Whether to acquire a pessimistic row lock.
 * @returns {import('knex').Knex.QueryBuilder} Knex query builder resolving to the category row, or undefined.
 */
export function findCategory(trx, id, lock = false) {
  const query = trx('categories');
  query.where({ id });
  query.first();

  if (lock) {
    query.forUpdate();
  }

  return query;
}

/**
 * Inserts a new category record into the database.
 *
 * Purpose:
 * Writes a new row to the `categories` table with the supplied name and description,
 * returning the newly generated record attributes.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {Object} categoryData - Attributes of the category to insert.
 * @param {string} categoryData.name - Unique category name.
 * @param {string|null} [categoryData.description] - Category description.
 * @returns {import('knex').Knex.QueryBuilder} Knex query returning the inserted row fields.
 */
export function insertCategory(trx, { name, description }) {
  const insertPayload = {
    name: name,
    description: description,
  };

  const query = trx('categories');
  query.insert(insertPayload);
  query.returning(['id', 'name', 'description', 'status']);

  return query;
}

/**
 * Counts the number of active products associated with a specific category.
 *
 * Purpose:
 * Checks whether a category contains active products before allowing deactivation,
 * adhering to business rule BR-03 and acceptance criteria AC-007.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {number|string} categoryId - Primary key ID of the category.
 * @returns {import('knex').Knex.QueryBuilder} Knex query resolving to an object with the count property.
 */
export function countActiveProducts(trx, categoryId) {
  const query = trx('products');
  query.where({
    category_id: categoryId,
    status: 'active',
  });
  query.count('id as count');
  query.first();

  return query;
}

/**
 * Updates an existing category row in the database.
 *
 * Purpose:
 * Applies modifications to the specified category row and returns the updated fields.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {number|string} id - Category primary key ID.
 * @param {Object} changes - Key-value map of changes to apply.
 * @returns {import('knex').Knex.QueryBuilder} Knex query returning the updated row fields.
 */
export function updateCategoryRow(trx, id, changes) {
  const query = trx('categories');
  query.where({ id });
  query.update(changes);
  query.returning(['id', 'name', 'description', 'status']);

  return query;
}

/**
 * Inserts an audit trail record for category management actions.
 *
 * Purpose:
 * Records an immutable event in the `audit_logs` table documenting category creation or updates.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @param {number|string} actorId - ID of the user performing the action.
 * @param {string} action - Action identifier (e.g. 'category.created', 'category.updated').
 * @param {number|string} categoryId - Target category ID.
 * @param {Object} details - Additional event details for the audit log.
 * @returns {import('knex').Knex.QueryBuilder} Knex query inserting the audit log row.
 */
export function writeCategoryAudit(trx, actorId, action, categoryId, details) {
  const auditRow = {
    user_id: actorId,
    action: action,
    entity_type: 'category',
    entity_id: categoryId,
    details: details,
  };

  const query = trx('audit_logs');
  query.insert(auditRow);

  return query;
}
