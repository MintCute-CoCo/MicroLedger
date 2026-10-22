<script setup>
import { useChangePassword } from '../composables/auth/useChangePassword.js';

/**
 * Change password composable providing form validation,
 * password matching, and update submission.
 */
const {
  currentPassword,
  newPassword,
  confirmPassword,
  error,
  fieldErrors,
  busy,
  submit,
} = useChangePassword();
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <div class="auth-brand">
        <span class="auth-brand-mark">
          <v-icon icon="mdi-chart-box-outline" />
        </span>
        <span>microledger</span>
      </div>

      <p class="auth-eyebrow">ACCOUNT SECURITY</p>
      <h1>Set a new password</h1>
      <p class="auth-intro">Choose a new password before continuing to your workspace.</p>

      <div
        v-if="error"
        class="auth-alert"
        role="alert"
      >
        {{ error }}
      </div>

      <form
        class="auth-form"
        @submit.prevent="submit"
      >
        <label for="current-password">Current password</label>
        <v-text-field
          id="current-password"
          v-model="currentPassword"
          autocomplete="current-password"
          type="password"
          variant="outlined"
          density="comfortable"
          :error-messages="fieldErrors.currentPassword"
          required
          @update:model-value="fieldErrors.currentPassword = undefined"
        />

        <label for="new-password">New password</label>
        <v-text-field
          id="new-password"
          v-model="newPassword"
          autocomplete="new-password"
          type="password"
          variant="outlined"
          density="comfortable"
          :error-messages="fieldErrors.newPassword"
          required
          @update:model-value="fieldErrors.newPassword = undefined"
        />

        <label for="confirm-password">Confirm new password</label>
        <v-text-field
          id="confirm-password"
          v-model="confirmPassword"
          autocomplete="new-password"
          type="password"
          variant="outlined"
          density="comfortable"
          :error-messages="fieldErrors.confirmPassword"
          required
          @update:model-value="fieldErrors.confirmPassword = undefined"
        />

        <v-btn
          type="submit"
          color="primary"
          size="large"
          block
          :loading="busy"
          :disabled="!currentPassword || !newPassword || !confirmPassword"
        >
          Update password
          <v-icon
            end
            icon="mdi-arrow-right"
          />
        </v-btn>
      </form>
    </section>
  </main>
</template>
