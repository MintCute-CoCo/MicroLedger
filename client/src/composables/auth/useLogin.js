import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.js';

/**
 * Composable providing authentication sign-in routines,
 * reactive credential inputs, redirect routing, and credential error formatting.
 *
 * @returns {Object} Reactive state, error flags, and sign-in handlers.
 */
export function useLogin() {
  const auth = useAuthStore();
  const route = useRoute();
  const router = useRouter();

  /**
   * Form credentials and validation error state.
   * Initialized to empty strings to require explicit user input.
   */
  const username = ref('');
  const password = ref('');
  const error = ref('');

  /**
   * Flag indicating if account was locked due to excessive failed attempts.
   */
  const locked = computed(() => {
    return error.value === 'AUTH_LOCKED';
  });

  /**
   * Submits the sign-in form to obtain an authenticated access session.
   */
  async function submit() {
    error.value = '';

    try {
      const trimmedUsername = username.value.trim();
      const rawPassword = password.value;

      await auth.signIn({
        username: trimmedUsername,
        password: rawPassword,
      });

      const destination = typeof route.query.redirect === 'string'
        ? route.query.redirect
        : '/';

      const targetRoute = auth.user.mustChangePassword
        ? '/change-password'
        : destination;

      await router.replace(targetRoute);
    } catch (requestError) {
      error.value = requestError.code || 'LOGIN_FAILED';
    }
  }

  return {
    auth,
    username,
    password,
    error,
    locked,
    submit,
  };
}
