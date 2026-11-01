import {
  changeUser,
  createUser,
  getUsers,
  resetUserPassword,
} from './service.js';

/**
 * Handles HTTP GET /api/v1/users requests.
 * Retrieves all registered user accounts (Admin only).
 *
 * @param {import('express').Request} _req - Express request.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response containing array of users.
 */
export async function listUsersController(_req, res) {
  const users = await getUsers();
  return res.json({ items: users });
}

/**
 * Handles HTTP POST /api/v1/users requests.
 * Provisions a new user account with temporary password and required password change (Admin only).
 *
 * @param {import('express').Request} req - Express request with user creation body.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} HTTP 201 response with created user.
 */
export async function createUserController(req, res) {
  const actor = req.user;
  const payload = req.body;

  const createdUser = await createUser(actor, payload);
  return res.status(201).json(createdUser);
}

/**
 * Handles HTTP PATCH /api/v1/users/:id requests.
 * Updates an existing user's full name, role, or active status (Admin only).
 *
 * @param {import('express').Request} req - Express request with user ID in params and changes in body.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with updated user.
 */
export async function updateUserController(req, res) {
  const actor = req.user;
  const userId = req.params.id;
  const changes = req.body;

  const updatedUser = await changeUser(actor, userId, changes);
  return res.json(updatedUser);
}

/**
 * Handles HTTP POST /api/v1/users/:id/reset-password requests.
 * Resets a user's password, forces change on next login, and revokes sessions (Admin only).
 *
 * @param {import('express').Request} req - Express request with user ID in params and password in body.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with status confirmation.
 */
export async function resetPasswordController(req, res) {
  const actor = req.user;
  const userId = req.params.id;
  const newPassword = req.body.password;

  const result = await resetUserPassword(actor, userId, newPassword);
  return res.json(result);
}
