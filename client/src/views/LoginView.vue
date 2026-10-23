<script setup>
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
      <div class="auth-brand">
        <span class="auth-brand-mark">
          <v-icon icon="mdi-chart-box-outline" />
        </span>
        <span>microledger</span>
      </div>

      <p class="auth-eyebrow">
        STORE WORKSPACE
      </p>
      <h1>Welcome back</h1>
      <p class="auth-intro">
        Sign in to continue to your store.
      </p>

      <div
        v-if="isDemoMode"
        class="auth-alert mb-4"
        style="background: #eef2ff; color: #3730a3; border-color: #c7d2fe; display: block;"
        role="status"
      >
        <div class="mb-2">
          <strong>⚡ Standalone Demo Mode Active</strong>
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
        class="auth-alert"
        role="status"
      >
        {{ auth.sessionError }} Check that the API is running and try again.
      </div>

      <div
        v-if="error"
        class="auth-alert"
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
        <label for="username">Username</label>
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

        <label for="password">Password</label>
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
          :loading="auth.busy"
          :disabled="!username || !password"
        >
          Sign in
          <v-icon
            end
            icon="mdi-arrow-right"
          />
        </v-btn>
      </form>

      <p class="auth-footer">
        Secure access for your retail team
      </p>
    </section>
  </main>
</template>
