/**
 * ============================================================================
 * MicroLedger HTTP API Client & Session Transport Layer
 * ============================================================================
 *
 * PURPOSE:
 * Provides a resilient, centralized fetch wrapper for all client-to-server HTTP
 * interactions. Manages JSON request serialization, timeout cancellation via
 * AbortController, Bearer token injection, automatic token refresh rotation on
 * HTTP 401 Unauthorized.
 *
 * ACADEMIC / ARCHITECTURAL NOTES (FYP):
 * - Implements silent JWT renewal: when an access token expires (15 min TTL),
 *   this client queues in-flight requests, calls /auth/refresh with the httpOnly
 *   cookie, and replays the original request seamlessly.
 * - Respects the local on-premise single-store network topology (VITE_API_BASE_URL).
 */

const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const DEFAULT_REQUEST_TIMEOUT_MS = 35_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;
let tokenProvider = () => null;
let refreshHandler = () => {};
let expiredHandler = () => {};
let refreshPromise = null;

/**
 * Creates an AbortController linked with a timeout deadline and parent signal.
 *
 * @param {AbortSignal} [parentSignal] - Optional caller-provided abort signal.
 * @param {number} timeoutMs - Timeout duration in milliseconds.
 * @returns {{ signal: AbortSignal, didTimeout: () => boolean, dispose: () => void }}
 */
function createRequestTimeout(parentSignal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const abortFromParent = () => {
    controller.abort(parentSignal.reason);
  };

  if (parentSignal?.aborted) {
    abortFromParent();
  } else {
    parentSignal?.addEventListener('abort', abortFromParent, { once: true });
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    dispose: () => {
      clearTimeout(timeoutId);
      parentSignal?.removeEventListener('abort', abortFromParent);
    },
  };
}

/**
 * Constructs a standardized HTTP request timeout error.
 *
 * @returns {Error} Error instance with code REQUEST_TIMEOUT.
 */
function requestTimeoutError() {
  const error = new Error('The request timed out. Check your connection and try again.');
  error.code = 'REQUEST_TIMEOUT';
  return error;
}

/**
 * Registers session state callbacks from the Pinia authentication store.
 *
 * @param {Object} options - Session hook configuration.
 * @param {() => string|null} options.getAccessToken - Function returning current access token.
 * @param {(session: Object) => void} options.onRefresh - Callback invoked when token is refreshed.
 * @param {() => void} options.onExpired - Callback invoked when refresh token is rejected.
 */
export function configureApiSession({ getAccessToken, onRefresh, onExpired }) {
  tokenProvider = getAccessToken;
  refreshHandler = onRefresh;
  expiredHandler = onExpired;
}

/**
 * Low-level HTTP transport wrapper executing the native window.fetch request.
 *
 * @param {string} path - Target URL path relative to API base.
 * @param {Object} options - Fetch options (method, body, headers, signal).
 * @param {string|null} accessToken - Optional JWT access token string.
 * @returns {Promise<Response>} Native fetch Response object.
 */
async function send(path, options, accessToken) {
  const { method = 'GET', body, headers = {}, signal } = options;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  return fetch(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body === undefined || isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    signal,
  });
}

/**
 * Safely parses the JSON response payload or returns null for empty responses (e.g. 204 No Content).
 *
 * @param {Response} response - Fetch response.
 * @returns {Promise<any>} Parsed JSON payload or null.
 */
async function readPayload(response) {
  if (response.status === 204) {
    return null;
  }

  try {
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    return null;
  }
}

/**
 * Serializes an unsuccessful HTTP response into a structured Application Error.
 *
 * @param {Response} response - Fetch response.
 * @param {Object} [payload] - Decoded error response body.
 * @returns {Error} Formatted error with status, code, and details.
 */
function responseError(response, payload) {
  const error = new Error(payload?.message || 'The request could not be completed.');
  error.code = payload?.code || 'REQUEST_FAILED';
  error.status = response.status;
  error.details = payload?.details ?? null;
  return error;
}

/**
 * Primary API request dispatcher with timeout management, authentication handling,
 * automatic token rotation.
 *
 * @param {string} path - Endpoint path (e.g., '/products', '/sales').
 * @param {Object} [options={}] - Request configuration options.
 * @param {string} [options.method='GET'] - HTTP method.
 * @param {any} [options.body] - Request payload object or FormData.
 * @param {Record<string, string>} [options.headers={}] - Additional headers.
 * @param {AbortSignal} [options.signal] - External abort signal.
 * @param {number} [options.timeoutMs=35000] - Timeout threshold in ms.
 * @returns {Promise<any>} Decoded response data.
 * @throws {Error} If request fails, times out, or receives HTTP 4xx/5xx.
 */
export async function apiRequest(path, {
  method = 'GET',
  body,
  headers = {},
  signal,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
} = {}) {
  const timeout = createRequestTimeout(signal, timeoutMs);
  const options = { method, body, headers, signal: timeout.signal };

  try {
    let response = await send(path, options, tokenProvider());
    let payload = await readPayload(response);

    const isAuthEndpoint = path.replace(/^\//, '').startsWith('auth/');
    if (response.status === 401 && !isAuthEndpoint && tokenProvider()) {
      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const refreshResponse = await send('/auth/refresh', {
              method: 'POST',
              signal: timeout.signal,
            }, null);
            const refreshed = await readPayload(refreshResponse);
            if (!refreshResponse.ok) throw responseError(refreshResponse, refreshed);
            refreshHandler(refreshed);
            return refreshed;
          })().finally(() => { refreshPromise = null; });
        }
        const refreshed = await refreshPromise;
        response = await send(path, options, refreshed.accessToken);
        payload = await readPayload(response);
      } catch (error) {
        expiredHandler();
        throw error;
      }
    }

    if (!response.ok) throw responseError(response, payload);
    return payload;
  } catch (error) {
    if (timeout.didTimeout()) {
      throw requestTimeoutError();
    }

    throw error;
  } finally {
    timeout.dispose();
  }
}

/**
 * Dispatches a streaming binary file download (e.g., CSV sales reports, Excel import templates),
 * triggering a browser file download save prompt.
 *
 * @param {string} path - Target download endpoint path.
 * @param {string} filename - Target file name for the downloaded artifact.
 * @param {Object} [options={}] - Options (signal, timeoutMs).
 * @returns {Promise<void>} Resolves when download initiates.
 */
export async function apiDownload(path, filename, { signal, timeoutMs = DOWNLOAD_TIMEOUT_MS } = {}) {
  const timeout = createRequestTimeout(signal, timeoutMs);
  const options = { method: 'GET', signal: timeout.signal };

  try {
    let response = await send(path, options, tokenProvider());
    if (response.status === 401 && tokenProvider()) {
      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const refreshResponse = await send('/auth/refresh', {
              method: 'POST',
              signal: timeout.signal,
            }, null);
            const refreshed = await readPayload(refreshResponse);
            if (!refreshResponse.ok) throw responseError(refreshResponse, refreshed);
            refreshHandler(refreshed);
            return refreshed;
          })().finally(() => { refreshPromise = null; });
        }
        const refreshed = await refreshPromise;
        response = await send(path, options, refreshed.accessToken);
      } catch (error) {
        expiredHandler();
        throw error;
      }
    }

    if (!response.ok) throw responseError(response, await readPayload(response));
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    if (timeout.didTimeout()) {
      throw requestTimeoutError();
    }

    throw error;
  } finally {
    timeout.dispose();
  }
}

