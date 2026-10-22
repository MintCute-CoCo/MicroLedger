import { computed, onMounted, ref } from 'vue';
import { apiRequest } from '../../api/client.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';

/**
 * Table column configuration for user management view.
 */
export const USER_TABLE_HEADERS = [
  { title: 'USER', key: 'fullName' },
  { title: 'USERNAME', key: 'username' },
  { title: 'ROLE', key: 'role' },
  { title: 'STATUS', key: 'status' },
  { title: 'LAST SIGN IN', key: 'lastLoginAt' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
];

/**
 * Derives uppercase initials from user's full name or username.
 *
 * @param {Object} user - User record object.
 * @returns {string} 1-2 character initials or '?'.
 */
export function getUserInitials(user) {
  const nameSource = user.fullName || user.username || '';
  const parts = nameSource.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  const initials = parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return initials || '?';
}

/**
 * Translates technical error codes to user-friendly messages.
 *
 * @param {string} message - Technical error message or code.
 * @returns {string} Human-readable error copy.
 */
export function readableError(message) {
  if (message.includes('LAST_ACTIVE_ADMIN')) {
    return 'The last active Admin cannot be deactivated or demoted.';
  }
  return message;
}

/**
 * Composable managing user account directory, role assignment,
 * deactivation protections, and admin password resets.
 *
 * Designed for university FYP evaluation following clean architecture.
 *
 * @returns {Object} User management state and handlers.
 */
export function useUsers() {
  /**
   * Complete list of staff and admin user accounts.
   */
  const users = ref([]);

  /**
   * Directory loading indicator.
   */
  const loading = ref(true);

  /**
   * Operation-level error message banner.
   */
  const error = ref('');

  /**
   * Form save network in-flight indicator.
   */
  const saving = ref(false);

  /**
   * User creation modal dialog visibility flag.
   */
  const createDialog = ref(false);

  /**
   * Password reset modal dialog visibility flag.
   */
  const resetDialog = ref(false);

  /**
   * Currently selected user for password reset.
   */
  const activeUser = ref(null);

  /**
   * New temporary password input string.
   */
  const resetPasswordInput = ref('');

  /**
   * Toast snackbar visibility flag upon successful user creation.
   */
  const createdSnackbar = ref(false);

  /**
   * Field-level validation errors.
   */
  const fieldErrors = ref({});

  /**
   * Draft state for new user creation form.
   */
  const draft = ref({
    username: '',
    fullName: '',
    role: 'staff',
    password: '',
  });

  /**
   * Count of active administrators to enforce last-admin security rules.
   */
  const activeCount = computed(() => {
    const activeAdmins = users.value.filter((user) => {
      const isAdmin = user.role === 'admin';
      const isActive = user.status === 'active';
      return isAdmin && isActive;
    });
    return activeAdmins.length;
  });

  /**
   * Fetches all registered users from the backend API.
   */
  async function loadUsers() {
    loading.value = true;
    error.value = '';

    try {
      const response = await apiRequest('/users');
      users.value = response.items || [];
    } catch (requestError) {
      error.value = requestError.message;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Submits the user creation form.
   */
  async function createUser() {
    error.value = '';
    fieldErrors.value = {};
    saving.value = true;

    try {
      await apiRequest('/users', {
        method: 'POST',
        body: draft.value,
      });

      createdSnackbar.value = true;
      draft.value = {
        username: '',
        fullName: '',
        role: 'staff',
        password: '',
      };
      createDialog.value = false;
      await loadUsers();
    } catch (requestError) {
      const mapped = fieldErrorsFrom(requestError);
      fieldErrors.value = mapped.fields;
      error.value = mapped.globalMessage;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Updates a user account's role or active status.
   *
   * @param {Object} user - User record to update.
   * @param {Object} changes - Key-value pair of modifications (e.g. { role: 'admin' }).
   */
  async function updateUser(user, changes) {
    if (changes.status === 'inactive') {
      const confirmed = window.confirm(
        `Deactivate ${user.fullName}? Their active sessions will be revoked.`
      );
      if (!confirmed) {
        return;
      }
    }

    error.value = '';

    try {
      const updated = await apiRequest(`/users/${user.id}`, {
        method: 'PATCH',
        body: changes,
      });

      users.value = users.value.map((item) => {
        if (item.id === updated.id) {
          return updated;
        }
        return item;
      });
    } catch (requestError) {
      error.value = requestError.message;
    }
  }

  /**
   * Toggles a user between active and inactive status.
   *
   * @param {Object} user - User record selected from the management table.
   * @returns {Promise<void>} Completes after the status update is handled.
   */
  async function toggleUserStatus(user) {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    await updateUser(user, { status: nextStatus });
  }

  /**
   * Resets a user's password with a temporary password provided by an Admin.
   */
  async function resetPassword() {
    if (!activeUser.value || !resetPasswordInput.value) {
      return;
    }

    error.value = '';
    fieldErrors.value = {};
    saving.value = true;

    try {
      await apiRequest(`/users/${activeUser.value.id}/reset-password`, {
        method: 'POST',
        body: {
          password: resetPasswordInput.value,
        },
      });

      resetPasswordInput.value = '';
      resetDialog.value = false;
      activeUser.value = null;
    } catch (requestError) {
      const mapped = fieldErrorsFrom(requestError, { password: 'temporaryPassword' });
      fieldErrors.value = mapped.fields;
      error.value = mapped.globalMessage;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Opens password reset dialog for a specific user.
   *
   * @param {Object} user - Target user.
   */
  function openReset(user) {
    activeUser.value = user;
    resetPasswordInput.value = '';
    resetDialog.value = true;
  }

  onMounted(loadUsers);

  return {
    users,
    loading,
    error,
    saving,
    createDialog,
    resetDialog,
    activeUser,
    resetPasswordInput,
    createdSnackbar,
    fieldErrors,
    draft,
    headers: USER_TABLE_HEADERS,
    activeCount,
    getUserInitials,
    readableError,
    loadUsers,
    createUser,
    updateUser,
    toggleUserStatus,
    resetPassword,
    openReset,
  };
}

