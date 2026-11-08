<script setup>
/**
 * Store Configuration & Currency Settings View (Admin Role Only)
 *
 * PURPOSE:
 * Manages store-wide localization parameters including ISO currency code,
 * decimal precision formatting, single domestic currency policy guardrails,
 * and customizable store profile / receipt branding (name, address, telephone).
 *
 * ARCHITECTURAL INVARIANT (BSR §4.6 & SRS §4.6):
 * MicroLedger operates in a single domestic currency. Currency settings define
 * display symbol and formatting rules across POS, reports, and receipts. They
 * do not perform live foreign-exchange conversions on existing database prices.
 * Store identity details (name, address, telephone) are fully customizable for
 * any retail store location or commercial niche.
 */
import StoreProfileCard from '../components/settings/StoreProfileCard.vue';
import StoreCurrencyCard from '../components/settings/StoreCurrencyCard.vue';
import CurrencyConfirmDialog from '../components/settings/CurrencyConfirmDialog.vue';
import { useSettings } from '../composables/settings/useSettings.js';

/**
 * Settings view composable providing configuration reactive state,
 * presets, live format previews, and safety guardrail dialog controls.
 */
const {
  form,
  initialCurrencyCode,
  isCurrencyChanged,
  confirmDialogOpen,
  busy,
  message,
  error,
  fieldErrors,
  presets,
  previewAmount,
  applyPreset,
  clearFieldError,
  revertSettings,
  handleSaveClick,
  executeSave,
} = useSettings();

/**
 * Applies selected regional currency preset.
 *
 * @param {Object} preset - Preset containing code and decimals.
 */
function handleApplyPreset(preset) {
  applyPreset(preset.code, preset.decimals);
}
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6 settings-page">
    <div class="page-heading mb-6">
      <div>
        <div class="text-overline text-medium-emphasis">ADMINISTRATION</div>
        <h1 class="text-h5 font-weight-bold">Store settings</h1>
        <p class="text-body-2 text-medium-emphasis">
          Configure store identity, receipt header metadata, and currency display rules across the system.
        </p>
      </div>
    </div>

    <!-- Feedback Alerts -->
    <v-row v-if="message || error">
      <v-col cols="12" md="10" lg="8">
        <v-alert
          v-if="message"
          type="success"
          variant="tonal"
          rounded="lg"
          class="mb-4"
          icon="mdi-check-circle-outline"
        >
          {{ message }}
        </v-alert>

        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          rounded="lg"
          class="mb-4"
          icon="mdi-alert-circle-outline"
        >
          {{ error }}
        </v-alert>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="10" lg="8">
        <!-- Store Profile & Receipt Branding Component -->
        <StoreProfileCard
          :form="form"
          :field-errors="fieldErrors"
          @clear-error="clearFieldError"
        />

        <!-- Single Domestic Currency Policy Callout (BSR §4.6) -->
        <v-alert
          type="info"
          variant="outlined"
          rounded="lg"
          class="mb-6 bg-surface"
          icon="mdi-information-outline"
        >
          <div class="text-subtitle-2 font-weight-bold mb-1">
            Single Domestic Currency Policy (BSR §4.6)
          </div>
          <div class="text-body-2 text-medium-emphasis">
            MicroLedger is engineered for single-currency store environments. Changing the currency setting
            adjusts the formatting symbol and decimal precision across screens and receipts. It does
            <strong>not</strong> perform foreign-exchange conversions or revalue existing product records.
            Catalog prices retain their numeric values until updated in Products or via Excel import.
          </div>
        </v-alert>

        <!-- Currency & Locale Configuration Component -->
        <StoreCurrencyCard
          :form="form"
          :field-errors="fieldErrors"
          :initial-currency-code="initialCurrencyCode"
          :is-currency-changed="isCurrencyChanged"
          :presets="presets"
          :busy="busy"
          :preview-amount="previewAmount"
          @apply-preset="handleApplyPreset"
          @clear-error="clearFieldError"
          @save="handleSaveClick"
          @revert="revertSettings"
        />
      </v-col>
    </v-row>

    <!-- Confirmation Guardrail Dialog for Currency Changes -->
    <CurrencyConfirmDialog
      v-model="confirmDialogOpen"
      :initial-currency-code="initialCurrencyCode"
      :target-currency-code="form.currency_code"
      :target-decimals="form.currency_decimals"
      :busy="busy"
      @confirm="executeSave"
    />
  </v-container>
</template>
