<script setup>
/**
 * User Authentication & Sign-In View (/login)
 *
 * PURPOSE:
 * Serves as the primary security gateway for MicroLedger retail store staff.
 * Validates credentials, handles account lockout states (5 failed attempts -> 15 min lock),
 * and provides one-click account loading for local evaluation/demo modes.
 *
 * WIREFRAME SPECIFICATION:
 * Adheres strictly to UI_UX_WIREFRAMES.md §4.1 layout and typography.
 */
import { computed } from 'vue';
import { useLogin } from '../composables/auth/useLogin.js';

const isDemoMode = computed(() => import.meta.env.VITE_DEMO_MODE === 'true');

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

function fillDemoAccount(user, pass) {
  username.value = user;
  password.value = pass;
}
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
        v-if="isDemoMode"
        class="auth-alert mb-4 text-caption"
        style="background: #eff2fc; color: #253d90; border-color: #d4dce8; display: block;"
        role="status"
      >
        <div class="mb-2 d-flex align-center ga-1">
          <v-icon icon="mdi-flash" size="16" />
          <strong>Standalone Demo Mode Active</strong>
        </div>
        <div class="d-flex ga-2">
          <v-btn
            size="x-small"
            color="primary"
            variant="tonal"
            @click="fillDemoAccount('admin', 'adminpassword123')"
          >
            Admin (Full Access)
          </v-btn>
          <v-btn
            size="x-small"
            color="secondary"
            variant="tonal"
            @click="fillDemoAccount('minhanh', 'staffpassword123')"
          >
            Staff (Minh Anh)
          </v-btn>
        </div>
      </div>

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
