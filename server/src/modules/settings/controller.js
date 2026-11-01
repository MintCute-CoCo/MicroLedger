import { HttpError } from '../../utils/http-error.js';
import { settingsSchema } from './schema.js';
import {
  getSettings,
  updateSettings,
  validateTimeZone,
} from './service.js';

/**
 * Handles HTTP GET /api/v1/settings requests.
 * Retrieves current store configurations (Admin only).
 *
 * @param {import('express').Request} _req - Express request.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with store settings.
 */
export async function getSettingsController(_req, res) {
  const currentSettings = await getSettings();
  return res.json(currentSettings);
}

/**
 * Handles HTTP PATCH /api/v1/settings requests.
 * Validates and updates store configuration settings (Admin only).
 *
 * @param {import('express').Request} req - Express request with updated settings in body.
 * @param {import('express').Response} res - Express response.
 * @returns {Promise<import('express').Response>} JSON response with updated settings.
 */
export async function updateSettingsController(req, res) {
  const parsed = settingsSchema.safeParse(req.body);

  if (!parsed.success) {
    const errorIssues = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    throw new HttpError(
      422,
      'VALIDATION_FAILED',
      'Check the submitted settings.',
      errorIssues
    );
  }

  // Validate IANA time zone identifier if provided
  if (parsed.data.time_zone) {
    await validateTimeZone(parsed.data.time_zone);
  }

  const actorId = req.user.id;
  const updatePayload = parsed.data;

  const updatedSettings = await updateSettings(actorId, updatePayload);
  return res.json(updatedSettings);
}
