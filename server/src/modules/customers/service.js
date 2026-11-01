import { requireDatabase } from '../../db/knex.js';
import { HttpError } from '../../utils/http-error.js';
import {
  customerCountQuery,
  customerListQuery,
  findCustomer,
  findDuplicatePhone,
  insertCustomer,
  updateCustomerRow,
  writeCustomerAudit,
} from './repository.js';

/**
 * Transforms an internal database customer row into a public customer response object.
 *
 * Purpose:
 * Normalizes primary key IDs to strings and converts calculated sales metrics
 * (lifetime spend and visits count) into client-facing data types.
 *
 * @param {Object} row - Database customer row with optional joined sales metrics.
 * @returns {Object} Public customer representation.
 */
function publicCustomer(row) {
  const customerId = String(row.id);
  const rawVisits = row.visits ?? 0;
  const visitsCount = Number(rawVisits);
  const lifetimeSpendAmount = row.lifetime_spend ?? '0.00';

  const formattedCustomer = {
    id: customerId,
    name: row.name,
    phone: row.phone,
    visits: visitsCount,
    lifetimeSpend: lifetimeSpendAmount,
    createdAt: row.created_at,
  };

  return formattedCustomer;
}

/**
 * Retrieves a paginated list of customers matching search criteria.
 *
 * Purpose:
 * Concurrently queries the list of customer rows and the total count from
 * the repository, returning formatted customer objects with pagination metadata.
 *
 * @param {Object} filters - Search and pagination options.
 * @param {string} [filters.q] - Keyword to search within customer name or phone.
 * @param {number} filters.page - Current page number (1-indexed).
 * @param {number} filters.page_size - Maximum number of records per page.
 * @returns {Promise<{items: Array<Object>, total: number, page: number, pageSize: number}>}
 */
export async function listCustomers(filters) {
  const database = requireDatabase();

  // 1. Prepare concurrent queries for items and total count
  const listPromise = customerListQuery(database, filters);
  const countPromise = customerCountQuery(database, filters);

  // 2. Execute both queries in parallel
  const [rows, countResult] = await Promise.all([
    listPromise,
    countPromise,
  ]);

  // 3. Format items and extract count
  const customerItems = rows.map((row) => publicCustomer(row));
  const rawCount = countResult ? countResult.count : 0;
  const totalCount = Number(rawCount);

  // 4. Return paginated response
  const paginatedResponse = {
    items: customerItems,
    total: totalCount,
    page: filters.page,
    pageSize: filters.page_size,
  };

  return paginatedResponse;
}

/**
 * Creates a new customer record and checks for duplicate phone numbers.
 *
 * Purpose:
 * Implements customer registration rules (AC-019 & AC-024):
 * 1. Checks if another customer already has the same normalized phone digits.
 * 2. If a duplicate exists, does not reject the creation, but issues a duplicate warning.
 * 3. Inserts customer row and audit trail record within a database transaction.
 *
 * @param {Object} actor - The authenticated user performing the creation.
 * @param {Object} input - Validated customer input data.
 * @param {string} input.name - Customer full name.
 * @param {string|null} [input.phone] - Customer phone number.
 * @returns {Promise<{customer: Object, warning: Object|null}>} Created customer and duplicate warning if applicable.
 */
export async function createCustomer(actor, input) {
  const database = requireDatabase();

  return database.transaction(async (trx) => {
    // 1. Check for existing customer with the same phone digits
    let duplicateRecord = null;
    if (input.phone) {
      duplicateRecord = await findDuplicatePhone(trx, input.phone);
    }

    // 2. Insert new customer record
    const customerPayload = {
      name: input.name,
      phone: input.phone ?? null,
    };
    const insertResult = await insertCustomer(trx, customerPayload);
    const createdRow = insertResult[0];

    // 3. Record audit trail entry
    const auditDetails = {
      customer_id: String(createdRow.id),
    };
    await writeCustomerAudit(
      trx,
      actor.id,
      createdRow.id,
      'customer.created',
      auditDetails
    );

    // 4. Construct duplicate warning object if a duplicate phone was detected
    let duplicateWarning = null;
    if (duplicateRecord) {
      duplicateWarning = {
        code: 'CUSTOMER_PHONE_EXISTS',
        message: 'A customer already uses this phone number.',
        existingCustomer: {
          id: String(duplicateRecord.id),
          name: duplicateRecord.name,
          phone: duplicateRecord.phone,
        },
      };
    }

    // 5. Structure and return response
    const publicCreatedCustomer = publicCustomer(createdRow);
    const responseData = {
      customer: publicCreatedCustomer,
      warning: duplicateWarning,
    };

    return responseData;
  });
}

/**
 * Updates an existing customer profile and records an audit log entry.
 *
 * Purpose:
 * Modifies customer attributes (name, phone) and documents changes in `audit_logs`.
 *
 * @param {Object} actor - The authenticated user updating the record.
 * @param {number|string} id - Customer primary key ID.
 * @param {Object} changes - Validated update fields.
 * @returns {Promise<Object>} The updated customer representation.
 * @throws {HttpError} Throws 404 CUSTOMER_NOT_FOUND if customer does not exist.
 */
export async function updateCustomer(actor, id, changes) {
  const database = requireDatabase();

  return database.transaction(async (trx) => {
    // 1. Verify customer exists before attempting update
    const currentCustomer = await findCustomer(trx, id);
    if (!currentCustomer) {
      throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');
    }

    // 2. Apply modifications to database row
    const updateResult = await updateCustomerRow(trx, id, changes);
    const updatedRow = updateResult[0];

    // 3. Record audit trail documenting updated fields
    const updatedFieldKeys = Object.keys(changes);
    const auditDetails = {
      changed_fields: updatedFieldKeys,
    };
    await writeCustomerAudit(
      trx,
      actor.id,
      id,
      'customer.updated',
      auditDetails
    );

    // 4. Return formatted updated profile
    const publicUpdatedCustomer = publicCustomer(updatedRow);
    return publicUpdatedCustomer;
  });
}
