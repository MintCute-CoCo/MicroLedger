import { requireDatabase } from '../../db/knex.js';
import { HttpError } from '../../utils/http-error.js';
import {
  countClaims,
  findActiveSupplier,
  findClaimById,
  findClaimByIdForUpdate,
  findClaims,
  findClaimStatusHistory,
  findCustomerPhone,
  findStoreTimeZone,
  findWarrantyForClaim,
  getStoreTodayDate,
  insertClaim,
  insertClaimStatusHistory,
  updateClaim,
  writeClaimAudit,
} from './repository.js';

// Statuses representing terminal states in the claim lifecycle
const finalStatuses = ['Completed', 'Rejected', 'Cancelled'];

// Allowed forward transitions for each status in the claim lifecycle
const transitions = {
  Submitted: [
    'With Supplier',
    'Ready for Customer',
    'Rejected',
    'Cancelled',
  ],
  'With Supplier': [
    'Returned',
    'Cancelled',
  ],
  Returned: [
    'Ready for Customer',
  ],
  'Ready for Customer': [
    'Completed',
  ],
};

/**
 * Normalizes a Date object or date string to a YYYY-MM-DD string.
 *
 * @param {Date|string|null} val - Date value to normalize.
 * @returns {string} Date string in YYYY-MM-DD format, or empty string.
 */
function toDateString(val) {
  if (!val) {
    return '';
  }

  if (val instanceof Date) {
    const isoString = val.toISOString();
    const datePart = isoString.slice(0, 10);
    return datePart;
  }

  const stringValue = String(val);
  const datePart = stringValue.slice(0, 10);
  return datePart;
}

/**
 * Obtains current calendar date in the store's configured local time zone.
 *
 * @param {import('knex').Knex | import('knex').Knex.Transaction} trx - Knex database or transaction instance.
 * @returns {Promise<string>} Today's date string (YYYY-MM-DD).
 */
async function storeDate(trx) {
  const storeZone = await findStoreTimeZone(trx);
  const todayDate = await getStoreTodayDate(trx, storeZone);
  return todayDate;
}

/**
 * Compares two date values to determine if the left date is on or after the right date.
 *
 * @param {Date|string} left - Left date operand.
 * @param {Date|string} right - Right date operand.
 * @returns {boolean} True if left >= right, false otherwise.
 */
function dateCompare(left, right) {
  const leftString = toDateString(left);
  const rightString = toDateString(right);
  const isGreaterOrEqual = leftString >= rightString;
  return isGreaterOrEqual;
}

/**
 * Calculates the difference in days between two date values.
 *
 * @param {Date|string} later - The later date.
 * @param {Date|string} earlier - The earlier date.
 * @returns {number} Non-negative difference in days.
 */
function dateDifferenceInDays(later, earlier) {
  const laterIso = `${toDateString(later)}T00:00:00Z`;
  const earlierIso = `${toDateString(earlier)}T00:00:00Z`;

  const laterDate = new Date(laterIso);
  const earlierDate = new Date(earlierIso);

  const diffMilliseconds = laterDate - earlierDate;
  const millisecondsPerDay = 86400000;
  const daysDifference = Math.floor(diffMilliseconds / millisecondsPerDay);

  return daysDifference;
}

/**
 * Formats a raw database claim row into a public API claim object.
 *
 * Purpose:
 * Formats IDs as strings, evaluates overdue calculations, and computes
 * days away and days overdue metrics dynamically.
 *
 * @param {Object} row - Raw database claim record.
 * @param {string} today - Today's date string.
 * @returns {Object} Publicly formatted claim object.
 */
function publicClaim(row, today) {
  // Determine if item is currently with supplier and unreturned
  const isWithSupplier = row.status === 'With Supplier';
  const hasNotReturned = !row.actual_return_date;
  const hasSentDate = Boolean(row.sent_date);

  const isAway = isWithSupplier && hasNotReturned && hasSentDate;

  // Determine if return is past the expected date
  const expectedReturnStr = toDateString(row.expected_return_date);
  const isOverdue = isWithSupplier && hasNotReturned && expectedReturnStr < today;

  // Calculate days away
  let daysAway = 0;
  if (isAway) {
    const rawDaysAway = dateDifferenceInDays(today, row.sent_date);
    daysAway = Math.max(0, rawDaysAway);
  }

  // Calculate days overdue
  let daysOverdue = 0;
  if (isOverdue) {
    daysOverdue = dateDifferenceInDays(today, row.expected_return_date);
  }

  // Format supplier ID safely
  let formattedSupplierId = null;
  if (row.supplier_id !== null && row.supplier_id !== undefined) {
    formattedSupplierId = String(row.supplier_id);
  }

  const formattedClaim = {
    ...row,
    id: String(row.id),
    warranty_id: String(row.warranty_id),
    customer_id: String(row.customer_id),
    supplier_id: formattedSupplierId,
    claim_no: row.claim_no,
    overdue: isOverdue,
    daysAway: daysAway,
    daysOverdue: daysOverdue,
  };

  return formattedClaim;
}

/**
 * Retrieves a paginated list of warranty claims with dynamic metrics.
 *
 * Purpose:
 * Applies search filters (status, supplier, overdue, date range, phone),
 * executes paginated queries, and attaches calculated overdue/days away metrics.
 *
 * @param {Object} filters - Validated query parameters.
 * @returns {Promise<{items: Array<Object>, total: number, page: number, pageSize: number}>}
 */
export async function listClaims(filters) {
  const database = requireDatabase();

  // 1. Determine current store local date
  const today = await storeDate(database);

  // 2. Concurrently fetch paginated claim items and total matching count
  const itemsPromise = findClaims(database, filters, today);
  const countPromise = countClaims(database, filters, today);

  const [items, totalCount] = await Promise.all([
    itemsPromise,
    countPromise,
  ]);

  // 3. Format each claim row with dynamic status metrics
  const formattedItems = items.map((row) => publicClaim(row, today));

  // 4. Return paginated result object
  const result = {
    items: formattedItems,
    total: totalCount,
    page: filters.page,
    pageSize: filters.page_size,
  };

  return result;
}

/**
 * Retrieves a single claim by ID with full details and audit status history.
 *
 * Purpose:
 * Loads claim record along with supplier details and the complete chronological
 * audit timeline of status transitions.
 *
 * @param {number|string} id - Claim ID.
 * @returns {Promise<Object>} The detailed claim object with history.
 * @throws {HttpError} Throws 404 CLAIM_NOT_FOUND if claim does not exist.
 */
export async function getClaim(id) {
  const database = requireDatabase();

  // 1. Retrieve claim row from database
  const claimRow = await findClaimById(database, id);
  if (!claimRow) {
    throw new HttpError(404, 'CLAIM_NOT_FOUND', 'Claim not found.');
  }

  // 2. Retrieve chronological status transition history
  const historyRows = await findClaimStatusHistory(database, id);

  // 3. Format supplier ID
  let formattedSupplierId = null;
  if (claimRow.supplier_id !== null && claimRow.supplier_id !== undefined) {
    formattedSupplierId = String(claimRow.supplier_id);
  }

  const claimDetail = {
    ...claimRow,
    id: String(claimRow.id),
    warranty_id: String(claimRow.warranty_id),
    customer_id: String(claimRow.customer_id),
    supplier_id: formattedSupplierId,
    history: historyRows,
  };

  return claimDetail;
}

/**
 * Creates a new warranty claim and records its initial status.
 *
 * Purpose:
 * Validates that the warranty is valid, not attached to a voided sale,
 * linked to a customer with a phone number, and within warranty period
 * (or authorized by an Admin note). Inserts the claim, initial history, and audit log.
 *
 * @param {Object} actor - The user submitting the claim.
 * @param {Object} input - Validated claim input data.
 * @returns {Promise<Object>} The newly created claim record.
 * @throws {HttpError} Throws 404 if warranty not found, 409 if sale voided or expired without admin, 422 if customer invalid.
 */
export async function createClaim(actor, input) {
  const database = requireDatabase();

  return database.transaction(async (trx) => {
    // 1. Fetch warranty and related sale status with row lock
    const warranty = await findWarrantyForClaim(trx, input.warrantyId);
    if (!warranty) {
      throw new HttpError(404, 'WARRANTY_NOT_FOUND', 'Warranty not found.');
    }

    // 2. Reject claim if the underlying sale was voided
    if (warranty.sale_status === 'voided') {
      throw new HttpError(
        409,
        'WARRANTY_VOIDED_SALE',
        'A warranty from a voided sale cannot be claimed.'
      );
    }

    // 3. Resolve customer ID: use provided customerId or the one attached to the warranty
    const customerId = input.customerId ?? warranty.customer_id;
    if (!customerId) {
      throw new HttpError(
        422,
        'VALIDATION_FAILED',
        'Attach a customer to this warranty first.',
        { field: 'customerId' }
      );
    }

    // Validate that provided customer matches warranty's attached customer if present
    if (warranty.customer_id && String(warranty.customer_id) !== String(customerId)) {
      throw new HttpError(
        422,
        'WARRANTY_CUSTOMER_MISMATCH',
        'The selected customer does not match this warranty.',
        { field: 'customerId' }
      );
    }

    // 4. Verify customer exists and has a phone number
    const customer = await findCustomerPhone(trx, customerId);
    if (!customer || !customer.phone) {
      throw new HttpError(
        422,
        'CUSTOMER_PHONE_REQUIRED',
        'A customer with a phone number is required.',
        { field: 'customerId' }
      );
    }

    // 5. Determine claim date and evaluate warranty expiration
    const today = await storeDate(trx);
    const claimDate = input.claimDate ?? today;
    const expiryStr = toDateString(warranty.expiry_date);
    const isExpired = claimDate > expiryStr;

    // Non-admin users cannot submit claims for expired warranties
    if (isExpired && actor.role !== 'admin') {
      throw new HttpError(
        409,
        'OUT_OF_WARRANTY',
        'This warranty expired before the claim date.'
      );
    }

    // Admins submitting expired claims must provide an explanation note
    const outOfWarrantyNoteTrimmed = input.outOfWarrantyNote?.trim();
    if (isExpired && !outOfWarrantyNoteTrimmed) {
      throw new HttpError(
        422,
        'VALIDATION_FAILED',
        'Admin must provide a note to accept an expired warranty.',
        { field: 'outOfWarrantyNote' }
      );
    }

    // 6. Insert new warranty claim row
    const claimData = {
      warranty_id: warranty.id,
      customer_id: customer.id,
      claim_date: claimDate,
      problem: input.problem,
      status: 'Submitted',
      out_of_warranty_note: input.outOfWarrantyNote ?? null,
      notes: input.notes ?? null,
      created_by: actor.id,
    };
    const createdClaim = await insertClaim(trx, claimData);

    // 7. Insert initial status history entry
    const historyData = {
      claim_id: createdClaim.id,
      from_status: null,
      to_status: 'Submitted',
      user_id: actor.id,
    };
    await insertClaimStatusHistory(trx, historyData);

    // 8. Record audit trail entry
    const auditDetails = {
      claim_no: createdClaim.claim_no,
      warranty_id: String(warranty.id),
    };
    await writeClaimAudit(
      trx,
      actor.id,
      'claim.created',
      createdClaim.id,
      auditDetails
    );

    // 9. Format response
    const formattedCreatedClaim = {
      ...createdClaim,
      id: String(createdClaim.id),
      warranty_id: String(createdClaim.warranty_id),
      customer_id: String(createdClaim.customer_id),
    };

    return formattedCreatedClaim;
  });
}

/**
 * Advances a claim to a new status in its lifecycle.
 *
 * Purpose:
 * Enforces claim status transition rules:
 * - Prevents modification of terminal states (Completed, Rejected, Cancelled).
 * - Restricts transition graph paths according to the state machine.
 * - Restricts Reject and Cancel actions to Administrators only.
 * - Validates prerequisite fields for each transition (dates, suppliers, resolutions).
 * - Updates claim record, logs status change history, and records audit entry.
 *
 * @param {Object} actor - The user requesting the transition.
 * @param {number|string} id - Claim ID.
 * @param {Object} input - Transition input payload containing status and transition data.
 * @returns {Promise<Object>} The updated claim record with status history.
 */
export async function transitionClaim(actor, id, input) {
  const database = requireDatabase();

  return database.transaction(async (trx) => {
    // 1. Fetch current claim with row lock
    const claim = await findClaimByIdForUpdate(trx, id);
    if (!claim) {
      throw new HttpError(404, 'CLAIM_NOT_FOUND', 'Claim not found.');
    }

    // 2. Reject transitions on terminal claims
    const isFinalStatus = finalStatuses.includes(claim.status);
    if (isFinalStatus) {
      throw new HttpError(409, 'CLAIM_FINAL', 'Final claims cannot be changed.');
    }

    // 3. Verify target status is allowed from current status
    const allowedTransitions = transitions[claim.status] || [];
    const isTransitionAllowed = allowedTransitions.includes(input.status);

    // Admin role check: Only Admins can Reject or Cancel claims
    const isTerminalAction = input.status === 'Rejected' || input.status === 'Cancelled';
    const isStaffUnauthorized = isTerminalAction && actor.role !== 'admin';

    if (!isTransitionAllowed || isStaffUnauthorized) {
      throw new HttpError(
        409,
        'INVALID_TRANSITION',
        `Cannot move a ${claim.status} claim to ${input.status}.`
      );
    }

    // 4. Validate transition-specific inputs
    const today = await storeDate(trx);
    const change = input.data ?? {};

    // Reject transitions other than Rejected/Cancelled that attempt to submit a reason
    const standardStatuses = ['With Supplier', 'Returned', 'Ready for Customer', 'Completed'];
    if (standardStatuses.includes(input.status) && change.reason) {
      throw new HttpError(
        422,
        'VALIDATION_FAILED',
        'This transition does not accept a reason.',
        { field: 'data.reason' }
      );
    }

    // Validations for 'With Supplier'
    if (input.status === 'With Supplier') {
      if (!change.supplierId) {
        throw new HttpError(422, 'VALIDATION_FAILED', 'Choose a supplier.', { field: 'data.supplierId' });
      }
      if (!change.sentDate) {
        throw new HttpError(422, 'VALIDATION_FAILED', 'Enter the sent date.', { field: 'data.sentDate' });
      }
      if (!change.expectedReturnDate) {
        throw new HttpError(422, 'VALIDATION_FAILED', 'Enter the expected return date.', { field: 'data.expectedReturnDate' });
      }

      const supplier = await findActiveSupplier(trx, change.supplierId);
      if (!supplier) {
        throw new HttpError(422, 'VALIDATION_FAILED', 'Choose an active supplier.', { field: 'data.supplierId' });
      }

      if (change.sentDate > today) {
        throw new HttpError(422, 'INVALID_DATE', 'Sent date must not be in the future.', { field: 'data.sentDate' });
      }

      if (!dateCompare(change.expectedReturnDate, change.sentDate)) {
        throw new HttpError(422, 'INVALID_DATE', 'Expected return must be on or after sent date.', { field: 'data.expectedReturnDate' });
      }
    }

    // Validations for 'Returned'
    if (input.status === 'Returned') {
      if (!change.actualReturnDate) {
        throw new HttpError(422, 'VALIDATION_FAILED', 'Enter the actual return date.', { field: 'data.actualReturnDate' });
      }
      if (!change.resolution) {
        throw new HttpError(422, 'VALIDATION_FAILED', 'Choose the resolution.', { field: 'data.resolution' });
      }
      if (change.actualReturnDate > today) {
        throw new HttpError(422, 'INVALID_DATE', 'Actual return date cannot be in the future.', { field: 'data.actualReturnDate' });
      }
      if (claim.sent_date && !dateCompare(change.actualReturnDate, claim.sent_date)) {
        throw new HttpError(422, 'INVALID_DATE', 'Actual return date must be on or after the sent date.', { field: 'data.actualReturnDate' });
      }
    }

    // Validations for 'Ready for Customer'
    if (input.status === 'Ready for Customer' && claim.status === 'Submitted' && !change.resolution) {
      throw new HttpError(422, 'VALIDATION_FAILED', 'Choose the resolution.', { field: 'data.resolution' });
    }

    // Validations for 'Completed'
    if (input.status === 'Completed') {
      if (!change.collectedDate) {
        throw new HttpError(422, 'VALIDATION_FAILED', 'Enter the collection date.', { field: 'data.collectedDate' });
      }

      const earliestDate = claim.actual_return_date ?? claim.claim_date;
      if (change.collectedDate > today) {
        throw new HttpError(422, 'INVALID_DATE', 'Collection date cannot be in the future.', { field: 'data.collectedDate' });
      }
      if (!dateCompare(change.collectedDate, earliestDate)) {
        throw new HttpError(422, 'INVALID_DATE', 'Collection date must be on or after the return or claim date.', { field: 'data.collectedDate' });
      }
    }

    // Validations for 'Rejected' and 'Cancelled'
    if (isTerminalAction) {
      const trimmedReason = change.reason?.trim();
      if (!trimmedReason) {
        throw new HttpError(422, 'VALIDATION_FAILED', 'A reason is required.', { field: 'data.reason' });
      }
    }

    // 5. Construct update object
    const updatePayload = {
      status: input.status,
      updated_at: trx.fn.now(),
    };

    if (change.supplierId !== undefined) {
      updatePayload.supplier_id = change.supplierId;
    }
    if (change.sentDate !== undefined) {
      updatePayload.sent_date = change.sentDate;
    }
    if (change.expectedReturnDate !== undefined) {
      updatePayload.expected_return_date = change.expectedReturnDate;
    }
    if (change.actualReturnDate !== undefined) {
      updatePayload.actual_return_date = change.actualReturnDate;
    }
    if (change.collectedDate !== undefined) {
      updatePayload.collected_date = change.collectedDate;
    }
    if (change.resolution !== undefined) {
      updatePayload.resolution = change.resolution;
    }

    // Handle resolution when moving to Ready for Customer
    if (input.status === 'Ready for Customer' && change.resolution) {
      updatePayload.resolution = change.resolution;
    }

    // Record reason in notes when rejected or cancelled
    if (isTerminalAction) {
      updatePayload.notes = change.reason.trim();
    }

    // 6. Update claim in database
    await updateClaim(trx, id, updatePayload);

    // 7. Insert status transition history
    const historyPayload = {
      claim_id: id,
      from_status: claim.status,
      to_status: input.status,
      user_id: actor.id,
      note: change.reason ?? null,
    };
    await insertClaimStatusHistory(trx, historyPayload);

    // 8. Record audit log
    const auditDetails = {
      from: claim.status,
      to: input.status,
    };
    await writeClaimAudit(trx, actor.id, 'claim.status_changed', id, auditDetails);

    // 9. Return updated claim and history within the transaction
    return getClaimWithin(trx, id);
  });
}

/**
 * Helper to fetch a claim record with its transition history within an existing transaction.
 *
 * @param {import('knex').Knex.Transaction} trx - Active Knex transaction.
 * @param {number|string} id - Claim ID.
 * @returns {Promise<Object>} Claim with formatted IDs and history.
 */
async function getClaimWithin(trx, id) {
  const row = await trx('warranty_claims').where({ id }).first();
  const history = await trx('claim_status_history as h')
    .join('users as u', 'u.id', 'h.user_id')
    .where('h.claim_id', id)
    .select('h.*', 'u.full_name as user_name')
    .orderBy('h.created_at', 'asc');

  let formattedSupplierId = null;
  if (row.supplier_id !== null && row.supplier_id !== undefined) {
    formattedSupplierId = String(row.supplier_id);
  }

  const result = {
    ...row,
    id: String(row.id),
    warranty_id: String(row.warranty_id),
    customer_id: String(row.customer_id),
    supplier_id: formattedSupplierId,
    history: history,
  };

  return result;
}
