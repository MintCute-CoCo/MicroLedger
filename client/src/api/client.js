const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const DEFAULT_REQUEST_TIMEOUT_MS = 35_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;
let tokenProvider = () => null;
let refreshHandler = () => {};
let expiredHandler = () => {};
let refreshPromise = null;

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

function requestTimeoutError() {
  const error = new Error('The request timed out. Check your connection and try again.');
  error.code = 'REQUEST_TIMEOUT';
  return error;
}

export function configureApiSession({ getAccessToken, onRefresh, onExpired }) {
  tokenProvider = getAccessToken;
  refreshHandler = onRefresh;
  expiredHandler = onExpired;
}

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

function responseError(response, payload) {
  const error = new Error(payload?.message || 'The request could not be completed.');
  error.code = payload?.code || 'REQUEST_FAILED';
  error.status = response.status;
  error.details = payload?.details ?? null;
  return error;
}

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

