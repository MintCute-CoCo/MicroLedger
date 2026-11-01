import { requireDatabase } from '../../db/knex.js';
import { countAuditLogs, findAuditLogs } from './repository.js';

/**
 * Service function to retrieve a paginated list of audit logs based on search filters.
 *
 * Purpose:
 * Coordinates the audit log retrieval process by delegating SQL operations
 * to the repository layer. Concurrently fetches the paginated records and the total
 * count of matching rows, and packages them into a standardized pagination response.
 *
 * Inputs:
 * @param {Object} filters - Validated query parameters.
 * @param {string} [filters.user_id] - Filter by specific operator user ID.
 * @param {string} [filters.action] - Substring to search within action names.
 * @param {string} [filters.entity_type] - Entity type filter.
 * @param {string} [filters.from] - Earliest timestamp (inclusive) in ISO format.
 * @param {string} [filters.to] - Latest timestamp (inclusive) in ISO format.
 * @param {number} filters.page - Current page number (1-indexed).
 * @param {number} filters.page_size - Maximum number of records per page.
 *
 * Expected Output:
 * @returns {Promise<{items: Array<Object>, total: number, page: number, pageSize: number}>}
 * Object containing:
 * - items: Array of audit log records with user full names and log details.
 * - total: Total number of records matching the filters.
 * - page: Current page number.
 * - pageSize: Number of items per page.
 */
export async function listAuditLogs(filters) {
  // 1. Obtain the Knex database connection instance
  const database = requireDatabase();

  // 2. Prepare the concurrent database queries for the records and the total count
  const fetchItemsPromise = findAuditLogs(database, filters);
  const fetchCountPromise = countAuditLogs(database, filters);

  // 3. Execute both database queries concurrently to optimize response time
  const [items, totalCount] = await Promise.all([
    fetchItemsPromise,
    fetchCountPromise,
  ]);

  // 4. Extract pagination parameters for the outgoing response
  const currentPage = filters.page;
  const currentPageSize = filters.page_size;

  // 5. Structure the paginated response object according to the API contract
  const paginatedResult = {
    items: items,
    total: totalCount,
    page: currentPage,
    pageSize: currentPageSize,
  };

  return paginatedResult;
}
