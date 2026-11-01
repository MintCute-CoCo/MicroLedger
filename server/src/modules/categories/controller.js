import { HttpError } from '../../utils/http-error.js';
import { categoryListQuerySchema } from './schema.js';
import { createCategory, listCategories, updateCategory } from './service.js';

/**
 * Controller to retrieve a list of categories.
 *
 * Purpose:
 * Validates optional status filter query parameters and retrieves matching
 * category records, returning them as a JSON list.
 *
 * @param {import('express').Request} req - Express request object containing query parameters.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} Express response with HTTP 200 and `{ items: [...] }`.
 * @throws {HttpError} Throws 422 VALIDATION_FAILED if query parameters fail schema validation.
 */
export async function listCategoriesController(req, res) {
  // 1. Validate query parameters against the category list query schema
  const parseResult = categoryListQuerySchema.safeParse(req.query);

  // 2. Reject request if query validation fails
  if (!parseResult.success) {
    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'Check the category filter.'
    );
  }

  // 3. Extract the validated status filter (e.g. 'active', 'inactive', 'all')
  const statusFilter = parseResult.data.status;

  // 4. Retrieve matching categories from the service layer
  const categoryItems = await listCategories(statusFilter);

  // 5. Return HTTP 200 OK with the items array
  const responsePayload = {
    items: categoryItems,
  };
  return res.status(200).json(responsePayload);
}

/**
 * Controller to create a new product category.
 *
 * Purpose:
 * Receives validated category payload, invokes the service layer to create the record,
 * and responds with the created category.
 *
 * @param {import('express').Request} req - Express request object containing authenticated user and body.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} Express response with HTTP 201 and created category JSON.
 */
export async function createCategoryController(req, res) {
  // 1. Extract the current authenticated user and the validated request body
  const currentUser = req.user;
  const categoryPayload = req.body;

  // 2. Call service layer to create the category
  const createdCategory = await createCategory(currentUser, categoryPayload);

  // 3. Return HTTP 201 Created with the new category record
  return res.status(201).json(createdCategory);
}

/**
 * Controller to update an existing product category.
 *
 * Purpose:
 * Receives category ID and change payload, calls the update service,
 * and responds with the updated category record.
 *
 * @param {import('express').Request} req - Express request object containing params and body.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} Express response with HTTP 200 and updated category JSON.
 */
export async function updateCategoryController(req, res) {
  // 1. Extract authenticated user, target category ID, and update fields
  const currentUser = req.user;
  const categoryId = req.params.id;
  const updatePayload = req.body;

  // 2. Invoke the category service to apply the updates
  const updatedCategory = await updateCategory(
    currentUser,
    categoryId,
    updatePayload
  );

  // 3. Return HTTP 200 OK with the updated category
  return res.status(200).json(updatedCategory);
}
