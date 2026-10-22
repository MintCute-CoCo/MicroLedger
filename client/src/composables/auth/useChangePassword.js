import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';

/**
 * Composable managing user password update form validation,
 * password matching, and post-update redirect navigation.
 *
 * @returns {Object} Reactive state, validation errors, and submission handler.
 */
export function useChangePassword() {
  const auth = useAuthStore();
  const router = useRouter();

  /**
   * Form input state for password change.
   */
  const currentPassword = ref('');
  const newPassword = ref('');
  const confirmPassword = ref('');
  const error = ref('');
  const fieldErrors = ref({});
  const busy = ref(false);

  /**
   * Validates that the new password and its confirmation match exactly.
   */
  const passwordsMatch = computed(() => newPassword.value === confirmPassword.value);

  /**
   * Handles the password change submission.
   * Enforces minimum length, avoids reusing username, and checks password equality.
   */
  async function submit() {
    error.value = '';
    fieldErrors.value = {};

    if (newPassword.value.length < 8 || newPassword.value.length > 128) {
      fieldErrors.value.newPassword = ['Use 8 to 128 characters.'];
      return;
    }

    const usernameLower = auth.user?.username?.toLowerCase();
    if (newPassword.value.toLowerCase() === usernameLower) {
      fieldErrors.value.newPassword = ['Choose a password different from your username.'];
      return;
    }

    if (!passwordsMatch.value) {
      fieldErrors.value.confirmPassword = ['The new passwords do not match.'];
      return;
    }

    busy.value = true;
    try {
      await auth.changePassword({
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      });
      await router.replace('/');
    } catch (requestError) {
      const mapped = fieldErrorsFrom(requestError);
      fieldErrors.value = mapped.fields;
      error.value = requestError.code === 'AUTH_INVALID_CREDENTIALS'
        ? ''
        : mapped.globalMessage;
    } finally {
      busy.value = false;
    }
  }

  return {
    currentPassword,
    newPassword,
    confirmPassword,
    error,
    fieldErrors,
    busy,
    passwordsMatch,
    submit,
  };
}

