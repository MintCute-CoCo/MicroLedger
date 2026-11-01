import { HttpError } from '../../utils/http-error.js';
import { customerListQuerySchema } from './schema.js';
import { createCustomer, listCustomers, updateCustomer } from './service.js';

/**
 * Express middleware to validate customer ID URL parameters.
 *
 * Purpose:
 * Checks that `req.params.id` contains only digits and represents a positive integer.
 * Passes a 404 CUSTOMER_NOT_FOUND error to Express next callback if the ID is invalid.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} _res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware callback.
 * @returns {void}
 */
function parseCustomerId(req, _res, next) {
  const rawId = req.params.id;
  const isNumericString = /^\d+$/.test(rawId);

  if (!isNumericString) {
    const notFoundError = new HttpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');
    return next(notFoundError);
  }

  const numericValue = BigInt(rawId);
  if (numericValue < 1n) {
    const notFoundError = new HttpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');
    return next(notFoundError);
  }

  return next();
}

/**
 * Controller to retrieve a paginated and searchable list of customers.
 *
 * Purpose:
 * Validates search query parameters and fetches matching customer records.
 *
 * @param {import('express').Request} req - Express request object containing query parameters.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} Express response with HTTP 200 and paginated customers.
 * @throws {HttpError} Throws 422 VALIDATION_FAILED if query parameters fail schema validation.
 */
export async function listCustomersController(req, res) {
  // 1. Validate query parameters against schema
  const parseResult = customerListQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'Check the submitted filters.'
    );
  }

  // 2. Fetch paginated customers from service layer
  const validatedFilters = parseResult.data;
  const customersResult = await listCustomers(validatedFilters);

  // 3. Return HTTP 200 OK with customers payload
  return res.status(200).json(customersResult);
}

/**
 * Controller to create a new customer record.
 *
 * Purpose:
 * Receives validated customer attributes, calls the creation service,
 * and responds with the new customer profile and duplicate phone warning if applicable.
 *
 * @param {import('express').Request} req - Express request object containing user and body.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} Express response with HTTP 201 and created customer JSON.
 */
export async function createCustomerController(req, res) {
  // 1. Extract authenticated user profile and customer body payload
  const currentUser = req.user;
  const customerPayload = req.body;

  // 2. Create customer via service layer
  const createResult = await createCustomer(currentUser, customerPayload);

  // 3. Return HTTP 201 Created with customer data
  return res.status(201).json(createResult);
}

/**
 * Controller to update an existing customer profile.
 *
 * Purpose:
 * Receives customer ID and updated fields, invokes the update service,
 * and responds with the updated customer profile.
 *
 * @param {import('express').Request} req - Express request object containing params and body.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} Express response with HTTP 200 and updated customer JSON.
 */
export async function updateCustomerController(req, res) {
  // 1. Extract authenticated user, customer ID parameter, and update payload
  const currentUser = req.user;
  const customerId = req.params.id;
  const updatePayload = req.body;

  // 2. Update customer record via service layer
  const updatedCustomer = await updateCustomer(
    currentUser,
    customerId,
    updatePayload
  );

  // 3. Return HTTP 200 OK with updated customer profile
  return res.status(200).json(updatedCustomer);
}

export { parseCustomerId };
