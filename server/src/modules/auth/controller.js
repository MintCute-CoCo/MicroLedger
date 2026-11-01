import { config } from '../../config/env.js';
import { changeOwnPassword, login, logout, refreshSession } from './service.js';

// Cookie key name used to store the rotating refresh token
const REFRESH_COOKIE = 'refresh_token';

// Path restriction for the refresh token cookie
const REFRESH_COOKIE_PATH = '/api/v1/auth';

// Refresh cookie lifetime matching token TTL: 8 hours in milliseconds
const REFRESH_COOKIE_MAX_AGE = 8 * 60 * 60 * 1000;

/**
 * Returns baseline configuration options for the refresh token cookie.
 *
 * Purpose:
 * Centralizes security settings (httpOnly, secure in production, strict sameSite,
 * and restricted endpoint path) to prevent cross-site scripting (XSS) and CSRF attacks.
 *
 * @returns {import('express').CookieOptions} Cookie configuration settings.
 */
function cookieOptions() {
  const isProduction = config.NODE_ENV === 'production';

  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
  };

  return options;
}

/**
 * Sets the httpOnly refresh token cookie on the HTTP response.
 *
 * Purpose:
 * Stores the issued refresh token securely in the user's browser, enabling
 * seamless token rotation while restricting client JavaScript access.
 *
 * @param {import('express').Response} res - Express response object.
 * @param {string} token - The raw refresh token string to store.
 * @returns {void}
 */
function setRefreshCookie(res, token) {
  const baseOptions = cookieOptions();
  const optionsWithMaxAge = {
    ...baseOptions,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  };

  res.cookie(REFRESH_COOKIE, token, optionsWithMaxAge);
}

/**
 * Clears the refresh token cookie from the HTTP response.
 *
 * Purpose:
 * Removes the refresh token from the client browser upon logout or session invalidation.
 *
 * @param {import('express').Response} res - Express response object.
 * @returns {void}
 */
function clearRefreshCookie(res) {
  const options = cookieOptions();
  res.clearCookie(REFRESH_COOKIE, options);
}

/**
 * Formats the standard client response payload containing access token and user info.
 *
 * Purpose:
 * Ensures a consistent JSON structure across login and token refresh operations.
 *
 * @param {Object} data - Authentication output data.
 * @param {string} data.accessToken - Signed JWT access token.
 * @param {Object} data.user - Sanitized public user profile.
 * @param {number} data.expiresIn - Access token lifetime in seconds.
 * @returns {Object} Standardized authentication response body.
 */
function accessResponse({ accessToken, user, expiresIn }) {
  const response = {
    accessToken: accessToken,
    tokenType: 'Bearer',
    expiresIn: expiresIn,
    user: user,
  };

  return response;
}

/**
 * Handles user login requests (POST /api/v1/auth/login).
 *
 * Purpose:
 * Receives validated credentials, calls the login service, sets the httpOnly
 * refresh token cookie, and sends back the access token and user profile.
 *
 * @param {import('express').Request} req - Express request object containing body credentials.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} Express response with HTTP 200 and auth payload.
 */
export async function loginController(req, res) {
  // 1. Extract login credentials from the validated request body
  const credentials = req.body;

  // 2. Authenticate credentials and retrieve tokens via the service layer
  const result = await login(credentials);

  // 3. Set the rotating refresh token in a secure httpOnly cookie
  setRefreshCookie(res, result.refreshToken);

  // 4. Send HTTP 200 OK with the access token and user profile
  const responseData = accessResponse(result);
  return res.status(200).json(responseData);
}

/**
 * Handles session token refresh requests (POST /api/v1/auth/refresh).
 *
 * Purpose:
 * Reads the refresh token from httpOnly cookies, rotates the session,
 * updates the refresh token cookie, and returns a new access token.
 * Clears the cookie if token validation fails.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware callback.
 * @returns {Promise<import('express').Response|void>} Express response with HTTP 200 or forwards error.
 */
export async function refreshController(req, res, next) {
  try {
    // 1. Read existing refresh token from incoming cookies
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];

    // 2. Rotate refresh token and generate a new access token
    const result = await refreshSession(rawRefreshToken);

    // 3. Update the cookie with the new rotated refresh token
    setRefreshCookie(res, result.refreshToken);

    // 4. Return HTTP 200 OK with the new access token
    const responseData = accessResponse(result);
    return res.status(200).json(responseData);
  } catch (error) {
    // Clear stale or compromised refresh token cookie upon error
    clearRefreshCookie(res);
    return next(error);
  }
}

/**
 * Handles user logout requests (POST /api/v1/auth/logout).
 *
 * Purpose:
 * Revokes the active refresh token in the database, removes the refresh cookie,
 * and responds with a success status.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware callback.
 * @returns {Promise<import('express').Response|void>} Express response with HTTP 200 { status: 'ok' }.
 */
export async function logoutController(req, res, next) {
  try {
    // 1. Extract refresh token from cookies
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];

    // 2. Revoke the token record in the database
    await logout(rawRefreshToken);

    // 3. Remove the refresh token cookie from the browser
    clearRefreshCookie(res);

    // 4. Return HTTP 200 OK
    const responsePayload = { status: 'ok' };
    return res.status(200).json(responsePayload);
  } catch (error) {
    return next(error);
  }
}

/**
 * Handles password change requests for the currently logged-in user (POST /api/v1/auth/change-password).
 *
 * Purpose:
 * Verifies current credentials, updates to the new password, revokes any other active
 * sessions (preserving the current session), and confirms success.
 *
 * @param {import('express').Request} req - Express request object containing user and body.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} Express response with HTTP 200 { status: 'ok' }.
 */
export async function changePasswordController(req, res) {
  // 1. Extract authenticated user profile, password payload, and current session token
  const currentUser = req.user;
  const passwordData = req.body;
  const currentRefreshToken = req.cookies?.[REFRESH_COOKIE];

  // 2. Perform password update and session revocation via service layer
  await changeOwnPassword(currentUser, passwordData, currentRefreshToken);

  // 3. Return HTTP 200 OK
  const responsePayload = { status: 'ok' };
  return res.status(200).json(responsePayload);
}
