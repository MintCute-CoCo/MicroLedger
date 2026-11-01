import { HttpError } from '../../utils/http-error.js';
import {
  fetchSuppliers,
  findOpenClaimsBySupplierId,
  findSupplierById,
  insertSupplier,
  runInTransaction,
  updateSupplierRecord,
  writeSupplierAudit,
} from './repository.js';

/**
 * Retrieves a list of suppliers ordered by supplier name.
 * Staff members can only see active suppliers; Admins can view active, inactive, or all.
 *
 * @param {Object} user - The authenticated user requesting suppliers.
 * @param {string} [status='active'] - Status filter ('active' or 'all').
 * @returns {Promise<Array<Object>>} List of suppliers.
 */
export async function listSuppliers(user, status = 'active') {
  const rows = await fetchSuppliers(user.role, status);

  const items = rows.map((row) => ({
    ...row,
    id: String(row.id),
  }));

  return items;
}

/**
 * Creates a new supplier catalog entry (Admin only).
 *
 * @param {Object} user - Authenticated administrator creating the supplier.
 * @param {Object} input - Validated supplier creation payload.
 * @returns {Promise<Object>} Created supplier record.
 * @throws {HttpError} 409 if a supplier with the same name already exists.
 */
export async function createSupplier(user, input) {
  try {
    return await runInTransaction(async (trx) => {
      // Insert supplier record with default active status
      const [createdSupplier] = await insertSupplier(input, trx);

      // Record system audit log entry
      await writeSupplierAudit(user.id, 'supplier.created', createdSupplier.id, {
        name: createdSupplier.name,
      }, trx);

      return {
        ...createdSupplier,
        id: String(createdSupplier.id),
      };
    });
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(
        409,
        'SUPPLIER_DUPLICATE',
        'A supplier with this name already exists.'
      );
    }
    throw error;
  }
}

/**
 * Updates an existing supplier record's contact information or active status (Admin only).
 * Prevents deactivating a supplier who currently has open warranty claims.
 *
 * @param {Object} user - Authenticated administrator performing the update.
 * @param {number|string} id - Supplier primary key.
 * @param {Object} input - Validated supplier update payload.
 * @returns {Promise<Object>} Updated supplier record.
 * @throws {HttpError} 404 if not found, 409 if duplicate name or open claims exist.
 */
export async function updateSupplier(user, id, input) {
  try {
    return await runInTransaction(async (trx) => {
      // Lock target supplier row for update
      const current = await findSupplierById(id, true, trx);
      if (!current) {
        throw new HttpError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found.');
      }

      // Guard: Deactivating a supplier with open warranty claims is prohibited
      const isDeactivating = input.status === 'inactive' && current.status === 'active';
      if (isDeactivating) {
        const openClaim = await findOpenClaimsBySupplierId(id, trx);
        if (openClaim) {
          throw new HttpError(
            409,
            'SUPPLIER_HAS_OPEN_CLAIMS',
            'This supplier has open warranty claims.'
          );
        }
      }

      // Exclude UI confirmation flag from database update columns
      const updateData = { ...input };
      delete updateData.confirmDeactivate;

      // Persist modifications
      await updateSupplierRecord(id, updateData, trx);

      // Record system audit log entry
      const beforeDetails = {
        name: current.name,
        status: current.status,
      };

      const afterDetails = {
        name: input.name ?? current.name,
        status: input.status ?? current.status,
      };

      await writeSupplierAudit(user.id, 'supplier.updated', id, {
        before: beforeDetails,
        after: afterDetails,
      }, trx);

      return {
        ...current,
        ...input,
        id: String(id),
      };
    });
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(
        409,
        'SUPPLIER_DUPLICATE',
        'A supplier with this name already exists.'
      );
    }
    throw error;
  }
}
