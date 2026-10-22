<script setup>
import { useSettings } from '../composables/settings/useSettings.js';

/**
 * Settings view composable providing configuration reactive state
 * and persistence handlers.
 */
const {
  form,
  busy,
  message,
  error,
  fieldErrors,
  save,
} = useSettings();
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6 settings-page">
    <div class="page-heading">
      <div>
        <div class="text-overline text-medium-emphasis">ADMINISTRATION</div>
        <h1 class="text-h5 font-weight-bold">Store settings</h1>
        <p class="text-body-2 text-medium-emphasis">Set the currency used across the store and in reports.</p>
      </div>
    </div>

    <v-card
      max-width="620"
      rounded="xl"
      class="settings-card"
    >
      <div class="table-toolbar">
        <div>
          <h2 class="text-h6 font-weight-bold mb-1">Currency & locale</h2>
          <p class="text-caption text-medium-emphasis">Configure store currency and decimal precision</p>
        </div>
      </div>

      <div class="pa-6">
        <v-alert
        v-if="message"
        type="success"
        variant="tonal"
        class="mb-4"
      >
        {{ message }}
      </v-alert>

      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="mb-4"
      >
        {{ error }}
      </v-alert>

      <v-text-field
        v-model="form.currency_code"
        label="Currency code (ISO 4217)"
        maxlength="3"
        :error-messages="fieldErrors.currency_code"
        variant="outlined"
        density="compact"
        @update:model-value="fieldErrors.currency_code = undefined"
      />

      <v-select
        v-model.number="form.currency_decimals"
        :items="[0, 1, 2]"
        label="Currency decimal places"
        :error-messages="fieldErrors.currency_decimals"
        variant="outlined"
        density="compact"
        @update:model-value="fieldErrors.currency_decimals = undefined"
      />

      <v-btn
        color="primary"
        rounded="lg"
        class="w-100 w-sm-auto"
        :loading="busy"
        :disabled="busy"
        @click="save"
      >
        Save settings
      </v-btn>
      </div>
    </v-card>
  </v-container>
</template>
