import { HttpError } from '../../utils/http-error.js';
import {
  claimCreateSchema,
  claimListSchema,
  claimTransitionSchema,
} from './schema.js';
import {
  createClaim,
  getClaim,
  listClaims,
  transitionClaim,
} from './service.js';

/**
 * Validates an input object against a Zod schema, throwing an HTTP 422 error on failure.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against.
 * @param {*} value - Data to validate.
 * @param {string} errorMessage - Error description message if validation fails.
 * @returns {*} Validated and sanitized data.
 * @throws {HttpError} Throws 422 VALIDATION_FAILED if parsing fails.
 */
function parseSchema(schema, value, errorMessage) {
  const result = schema.safeParse(value);

  if (!result.success) {
    const errorIssues = result.error.issues;
    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      errorMessage,
      errorIssues
    );
  }

  return result.data;
}

/**
 * Extracts and validates a positive integer claim ID from the request URL parameters.
 *
 * @param {import('express').Request} req - Express request object.
 * @returns {string} Validated claim ID string.
 * @throws {HttpError} Throws 404 CLAIM_NOT_FOUND if the ID format is invalid.
 */
function extractClaimId(req) {
  const rawId = req.params.id;
  const isNumeric = /^\d+$/.test(rawId);

  if (!isNumeric) {
    throw new HttpError(404, 'CLAIM_NOT_FOUND', 'Claim not found.');
  }

  const numericId = BigInt(rawId);
  if (numericId < 1n) {
    throw new HttpError(404, 'CLAIM_NOT_FOUND', 'Claim not found.');
  }

  return rawId;
}

/**
 * Controller to list warranty claims with filtering and pagination.
 *
 * Purpose:
 * Validates query string parameters and delegates retrieval to the claims service.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} Express response with HTTP 200 and paginated claims.
 */
export async function listClaimsController(req, res) {
  // 1. Validate incoming query parameters
  const validatedFilters = parseSchema(
    claimListSchema,
    req.query,
    'Check the submitted filters.'
  );

  // 2. Fetch paginated claims from the service layer
  const claimsResult = await listClaims(validatedFilters);

  // 3. Return HTTP 200 OK with claims payload
  return res.status(200).json(claimsResult);
}

/**
 * Controller to retrieve single claim details and status history.
 *
 * Purpose:
 * Validates the claim ID parameter and fetches the claim record along with its status history.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} Express response with HTTP 200 and claim details.
 */
export async function getClaimController(req, res) {
  // 1. Validate and extract claim ID from route parameters
  const claimId = extractClaimId(req);

  // 2. Retrieve claim and history from service layer
  const claimDetail = await getClaim(claimId);

  // 3. Return HTTP 200 OK
  return res.status(200).json(claimDetail);
}

/**
 * Controller to create a new warranty claim.
 *
 * Purpose:
 * Validates request body and invokes the service layer to create a new claim.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} Express response with HTTP 201 and created claim JSON.
 */
export async function createClaimController(req, res) {
  // 1. Extract authenticated user and validate request body
  const currentUser = req.user;
  const validatedInput = parseSchema(
    claimCreateSchema,
    req.body,
    'Check the claim fields.'
  );

  // 2. Create claim via service layer
  const createdClaim = await createClaim(currentUser, validatedInput);

  // 3. Return HTTP 201 Created with the new claim
  return res.status(201).json(createdClaim);
}

/**
 * Controller to advance a claim's lifecycle status.
 *
 * Purpose:
 * Validates the target status and transition data, advancing the claim state.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} Express response with HTTP 200 and updated claim JSON.
 */
export async function transitionClaimController(req, res) {
  // 1. Extract authenticated user, validate claim ID, and validate transition payload
  const currentUser = req.user;
  const claimId = extractClaimId(req);
  const validatedInput = parseSchema(
    claimTransitionSchema,
    req.body,
    'Check the transition fields.'
  );

  // 2. Perform the transition in the service layer
  const updatedClaim = await transitionClaim(
    currentUser,
    claimId,
    validatedInput
  );

  // 3. Return HTTP 200 OK with the updated claim
  return res.status(200).json(updatedClaim);
}
