import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { apiRequest, configureApiSession } from '../api/client.js';

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(null);
  const user = ref(null);
  const initialized = ref(false);
  const busy = ref(false);
  const sessionError = ref('');
  const isAuthenticated = computed(() => Boolean(user.value && accessToken.value));

  function applySession(session) {
    accessToken.value = session.accessToken;
    user.value = session.user;
    sessionError.value = '';
  }

  function clearSession() {
    accessToken.value = null;
    user.value = null;
  }

  configureApiSession({
    getAccessToken: () => accessToken.value,
    onRefresh: applySession,
    onExpired: () => {
      clearSession();
      window.dispatchEvent(new CustomEvent('microledger:auth-expired'));
    },
  });

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

  async function signOut() {
    try { await apiRequest('/auth/logout', { method: 'POST' }); } catch { /* Local sign-out still clears the UI session. */ }
    clearSession();
    initialized.value = true;
  }

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
