/**
 * ============================================================================
 * MicroLedger Authentication & Active Session Store (Pinia)
 * ============================================================================
 *
 * PURPOSE:
 * Manages the client-side authentication lifecycle, including user credentials,
 * in-memory JWT access token, RBAC role claims (Admin vs Staff), silent refresh
 * bootstrapping, and forced password change interception (`mustChangePassword`).
 *
 * SECURITY & SCOPE CONSTRAINTS:
 * - JWT access tokens are held strictly in memory (ref) to prevent XSS exfiltration.
 * - Refresh tokens are handled exclusively via httpOnly cookies managed by the browser.
 * - Single retail store LAN scope: supports store staff sessions and automatic logout.
 */

import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { apiRequest, configureApiSession } from '../api/client.js';

export const useAuthStore = defineStore('auth', () => {
  /** In-memory short-lived JWT access token string (15-min TTL) */
  const accessToken = ref(null);
  /** Authenticated user profile ({ id, username, fullName, role, status, mustChangePassword }) */
  const user = ref(null);
  /** Whether the initial session restoration attempt has completed */
  const initialized = ref(false);
  /** In-flight asynchronous authentication state indicator */
  const busy = ref(false);
  /** Active session or login error message */
  const sessionError = ref('');
  /** Derived boolean indicating active authenticated status */
  const isAuthenticated = computed(() => Boolean(user.value && accessToken.value));

  /**
   * Applies an authenticated session payload to the store state.
   *
   * @param {Object} session - Authenticated session payload.
   * @param {string} session.accessToken - Fresh JWT access token.
   * @param {Object} session.user - Authenticated user details.
   */
  function applySession(session) {
    accessToken.value = session.accessToken;
    user.value = session.user;
    sessionError.value = '';
  }

  /**
   * Clears the active session and revokes client-side tokens.
   */
  function clearSession() {
    accessToken.value = null;
    user.value = null;
  }

  // Bind the API client to this authentication store
  configureApiSession({
    getAccessToken: () => accessToken.value,
    onRefresh: applySession,
    onExpired: () => {
      clearSession();
      window.dispatchEvent(new CustomEvent('microledger:auth-expired'));
    },
  });

  /**
   * Attempts to restore an existing session upon application reload using the httpOnly cookie.
   *
   * @returns {Promise<boolean>} True if session was restored, false otherwise.
   */
  async function restoreSession() {
    if (initialized.value) return isAuthenticated.value;
    initialized.value = true;
    try {
      applySession(await apiRequest('/auth/refresh', { method: 'POST' }));
      return true;
    } catch (error) {
      clearSession();
      if (error.status !== 401) sessionError.value = error.message;
      return false;
    }
  }

  /**
   * Authenticates the user with username and password credentials.
   *
   * @param {Object} credentials - Login credentials ({ username, password }).
   * @returns {Promise<boolean>} True on success.
   * @throws {Error} If credentials are invalid or account is locked.
   */
  async function signIn(credentials) {
    busy.value = true;
    sessionError.value = '';
    try {
      applySession(await apiRequest('/auth/login', { method: 'POST', body: credentials }));
      initialized.value = true;
      return true;
    } catch (error) {
      sessionError.value = error.message;
      throw error;
    } finally {
      busy.value = false;
    }
  }

  /**
   * Terminates the current session on the backend and purges local state.
   *
   * @returns {Promise<void>}
   */
  async function signOut() {
    try { await apiRequest('/auth/logout', { method: 'POST' }); } catch { /* Local sign-out still clears the UI session. */ }
    clearSession();
    initialized.value = true;
  }

  /**
   * Updates the authenticated user's password, clearing the mandatory password change flag.
   *
   * @param {Object} values - Password change payload ({ currentPassword, newPassword }).
   * @returns {Promise<void>}
   */
  async function changePassword(values) {
    await apiRequest('/auth/change-password', {
      method: 'POST',
      body: values,
      headers: { Authorization: `Bearer ${accessToken.value}` },
    });
    if (user.value) user.value.mustChangePassword = false;
  }

  return {
    accessToken, user, initialized, busy, sessionError, isAuthenticated,
    restoreSession, signIn, signOut, changePassword, clearSession,
  };
});
