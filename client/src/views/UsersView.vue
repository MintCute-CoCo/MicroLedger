<script setup>
import UserManagementSection from '../components/users/UserManagementSection.vue';
import UserAccessDialogs from '../components/users/UserAccessDialogs.vue';
import { useUsers } from '../composables/users/useUsers.js';

/**
 * User Access Management View.
 *
 * Provides administrative controls for employee accounts, role assignments,
 * security deactivation, and temporary password resets.
 */
const {
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
  headers,
  activeCount,
  getUserInitials,
  readableError,
  createUser,
  updateUser,
  toggleUserStatus,
  resetPassword,
  openReset,
  loadUsers,
} = useUsers();
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6 users-page">
    <div class="page-heading">
      <div>
        <div class="text-overline text-medium-emphasis">ACCESS CONTROL</div>
        <h1 class="text-h5 font-weight-bold">Users</h1>
        <p class="text-body-2 text-medium-emphasis">Manage store access, roles and temporary passwords.</p>
      </div>

      <div class="d-flex flex-wrap ga-2">
        <v-btn
          color="primary"
          rounded="lg"
          class="w-100 w-sm-auto"
          prepend-icon="mdi-account-plus-outline"
          @click="createDialog = true"
        >
          New user
        </v-btn>
      </div>
    </div>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="comfortable"
      class="users-alert"
    >
      {{ readableError(error) }}
    </v-alert>

    <UserManagementSection
      :users="users"
      :active-count="activeCount"
      :headers="headers"
      :loading="loading"
      :get-user-initials="getUserInitials"
      @reload="loadUsers"
      @make-admin="updateUser($event, { role: 'admin' })"
      @make-staff="updateUser($event, { role: 'staff' })"
      @toggle-status="toggleUserStatus"
      @reset-password="openReset"
    />
    <UserAccessDialogs
      v-model:create-open="createDialog"
      v-model:reset-open="resetDialog"
      v-model:reset-password="resetPasswordInput"
      :active-user="activeUser"
      :draft="draft"
      :field-errors="fieldErrors"
      :error-message="error ? readableError(error) : ''"
      :saving="saving"
      @create="createUser"
      @reset="resetPassword"
    />
    <v-snackbar
      v-model="createdSnackbar"
      :timeout="12000"
      color="success"
      rounded="lg"
    >
      User created. Share the temporary password securely and ask them to change it at sign-in.
    </v-snackbar>
  </v-container>
</template>

