<script setup>
/**
 * User Authentication & Sign-In View (/login)
 *
 * PURPOSE:
 * Serves as the primary security gateway for MicroLedger retail store staff.
 * Validates credentials, handles account lockout states (5 failed attempts -> 15 min lock),
 * and presents the standard credential sign-in form.
 *
 * WIREFRAME SPECIFICATION:
 * Adheres strictly to UI_UX_WIREFRAMES.md §4.1 layout and typography.
 */
import { useLogin } from '../composables/auth/useLogin.js';

/**
 * Login view composable providing authentication sign-in routines,
 * reactive credential inputs, and account lockout status checks.
 */
const {
  auth,
  username,
  password,
  error,
  locked,
  submit,
} = useLogin();

</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <div class="auth-brand mb-2">
        <span class="auth-brand-mark">
          <v-icon icon="mdi-chart-box-outline" size="22" />
        </span>
        <h1 class="text-h5 font-weight-bold mb-0">MicroLedger</h1>
      </div>

      <p class="text-body-2 text-medium-emphasis mb-6">
        Point of Sale, Inventory Ledger &amp; Warranty System
      </p>

      <div
        v-if="auth.sessionError"
        class="auth-alert text-caption"
        role="status"
      >
        {{ auth.sessionError }} Check that the API is running and try again.
      </div>

      <div
        v-if="error"
        class="auth-alert text-caption"
        role="alert"
      >
        <template v-if="locked">
          This account is temporarily locked after too many unsuccessful attempts. Try again in 15 minutes.
        </template>
        <template v-else-if="error === 'AUTH_INVALID_CREDENTIALS'">
          Username or password is incorrect.
        </template>
        <template v-else>
          This sign-in could not be completed. Check your connection and try again.
        </template>
      </div>

      <form
        class="auth-form"
        @submit.prevent="submit"
      >
        <label for="username" class="text-caption font-weight-bold">Username</label>
        <v-text-field
          id="username"
          v-model="username"
          autocomplete="username"
          placeholder="Enter your username"
          variant="outlined"
          density="comfortable"
          hide-details
          required
        />

        <label for="password" class="text-caption font-weight-bold">Password</label>
        <v-text-field
          id="password"
          v-model="password"
          autocomplete="current-password"
          placeholder="Enter your password"
          type="password"
          variant="outlined"
          density="comfortable"
          hide-details
          required
        />

        <v-btn
          type="submit"
          color="primary"
          size="large"
          block
          rounded="lg"
          :loading="auth.busy"
          :disabled="!username || !password"
        >
          Sign In
          <v-icon
            end
            icon="mdi-arrow-right"
          />
        </v-btn>
      </form>

      <p class="auth-footer text-caption">
        Secure access for your retail team
      </p>
    </section>
  </main>
</template>
