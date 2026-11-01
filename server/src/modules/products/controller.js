import { HttpError } from '../../utils/http-error.js';
import {
  createProduct,
  getProduct,
  listProducts,
  lookupProducts,
  updateProduct,
} from './service.js';
import { productListQuerySchema, productLookupQuerySchema } from './schema.js';

/**
 * Validates and transforms request query parameters against a Zod schema.
 * Formats any validation failures into standard MicroLedger 422 HTTP responses.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against.
 * @param {Object} query - Express request query object.
 * @returns {Object} Validated and coerced query values.
 * @throws {HttpError} 422 if validation constraints fail.
 */
function queryValue(schema, query) {
  const result = schema.safeParse(query);

  if (!result.success) {
    const errorIssues = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'Check the submitted filters.',
      errorIssues
    );
  }

  return result.data;
}

/**
 * Handles HTTP GET /api/v1/products requests.
 * Retrieves a paginated list of catalog products based on search, category, and price filters.
 *
 * @param {import('express').Request} req - Express request with query filters.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with products and pagination.
 */
export async function listProductsController(req, res) {
  const actor = req.user;
  const parsedFilters = queryValue(productListQuerySchema, req.query);

  const productData = await listProducts(actor, parsedFilters);
  return res.json(productData);
}

/**
 * Handles HTTP GET /api/v1/products/lookup requests.
 * Performs fast ranked search across active catalog products for Point of Sale (POS).
 *
 * @param {import('express').Request} req - Express request with query parameter q.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with matching product items.
 */
export async function lookupProductsController(req, res) {
  const actor = req.user;
  const parsedQuery = queryValue(productLookupQuerySchema, req.query);
  const searchTerm = parsedQuery.q;

  const matchedItems = await lookupProducts(actor, searchTerm);
  return res.json({ items: matchedItems });
}

/**
 * Handles HTTP GET /api/v1/products/:id requests.
 * Retrieves comprehensive details for a single product by primary key ID.
 *
 * @param {import('express').Request} req - Express request with product ID in params.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with product details.
 */
export async function getProductController(req, res) {
  const actor = req.user;
  const productId = req.params.id;

  const productDetails = await getProduct(actor, productId);
  return res.json(productDetails);
}

/**
 * Handles HTTP POST /api/v1/products requests.
 * Creates a new product catalog item with optional opening stock (Admin only).
 *
 * @param {import('express').Request} req - Express request with product creation payload.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} HTTP 201 response with created product details.
 */
export async function createProductController(req, res) {
  const actor = req.user;
  const productPayload = req.body;

  const createdProduct = await createProduct(actor, productPayload);
  return res.status(201).json(createdProduct);
}

/**
 * Handles HTTP PATCH /api/v1/products/:id requests.
 * Updates an existing product catalog item's metadata or status (Admin only).
 *
 * @param {import('express').Request} req - Express request with product ID in params and changes in body.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with updated product details.
 */
export async function updateProductController(req, res) {
  const actor = req.user;
  const productId = req.params.id;
  const updatePayload = req.body;

  const updatedProduct = await updateProduct(actor, productId, updatePayload);
  return res.json(updatedProduct);
}
