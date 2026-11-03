<script setup>
/**
 * Store Configuration & Currency Settings View (Admin Role Only)
 *
 * PURPOSE:
 * Manages store-wide localization parameters including ISO currency code,
 * decimal precision formatting, and single domestic currency policy guardrails.
 *
 * ARCHITECTURAL INVARIANT (BSR §4.6 & SRS §4.6):
 * MicroLedger operates in a single domestic currency. Currency settings define
 * display symbol and formatting rules across POS, reports, and receipts. They
 * do not perform live foreign-exchange conversions on existing database prices.
 */
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
  revertSettings,
  handleSaveClick,
  executeSave,
} = useSettings();
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6 settings-page">
    <div class="page-heading mb-6">
      <div>
        <div class="text-overline text-medium-emphasis">ADMINISTRATION</div>
        <h1 class="text-h5 font-weight-bold">Store settings</h1>
        <p class="text-body-2 text-medium-emphasis">
          Configure store currency and decimal display rules across POS, sales reports, and receipts.
        </p>
      </div>
    </div>

    <v-row>
      <v-col cols="12" md="8" lg="7">
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

        <!-- Main Configuration Card -->
        <v-card
          rounded="xl"
          variant="outlined"
          class="settings-card mb-6"
        >
          <v-card-item class="border-b pa-4">
            <v-card-title class="text-h6 font-weight-bold">Currency & locale</v-card-title>
            <v-card-subtitle class="text-caption text-medium-emphasis">
              Select standard deployment presets or specify custom ISO 4217 rules
            </v-card-subtitle>
          </v-card-item>

          <v-card-text class="pa-6">
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

            <!-- Quick Preset Chips -->
            <div class="mb-5">
              <div class="text-caption font-weight-medium text-medium-emphasis mb-2">
                QUICK REGIONAL PRESETS
              </div>
              <div class="d-flex flex-wrap gap-2">
                <v-chip
                  v-for="preset in presets"
                  :key="preset.code"
                  variant="outlined"
                  class="mr-2 mb-2"
                  :color="form.currency_code === preset.code ? 'primary' : undefined"
                  @click="applyPreset(preset.code, preset.decimals)"
                >
                  <v-icon
                    start
                    :icon="form.currency_code === preset.code ? 'mdi-check-circle' : 'mdi-currency-usd'"
                  />
                  {{ preset.label }}
                </v-chip>
              </div>
            </div>

            <!-- Form Inputs -->
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.currency_code"
                  label="Currency code (ISO 4217)"
                  placeholder="e.g. VND, USD, EUR"
                  maxlength="3"
                  :error-messages="fieldErrors.currency_code"
                  variant="outlined"
                  density="compact"
                  hint="3 uppercase letters (e.g., VND, USD)"
                  persistent-hint
                  @update:model-value="fieldErrors.currency_code = undefined"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-select
                  v-model.number="form.currency_decimals"
                  :items="[0, 1, 2]"
                  label="Currency decimal places"
                  :error-messages="fieldErrors.currency_decimals"
                  variant="outlined"
                  density="compact"
                  hint="0 for VND/JPY, 2 for USD/EUR"
                  persistent-hint
                  @update:model-value="fieldErrors.currency_decimals = undefined"
                />
              </v-col>
            </v-row>

            <!-- Currency Modification Warning Banner -->
            <v-alert
              v-if="isCurrencyChanged"
              type="warning"
              variant="tonal"
              rounded="lg"
              class="mt-4 mb-4"
              icon="mdi-alert-outline"
            >
              <div class="text-subtitle-2 font-weight-bold">
                Currency change detected ({{ initialCurrencyCode }} &rarr; {{ form.currency_code }})
              </div>
              <div class="text-caption">
                Catalog product prices will retain their existing numerical values. For example, a product
                priced at 3,190,000 will be formatted as {{ form.currency_code }} 3,190,000 without exchange
                rate division. You will be asked to confirm before saving.
              </div>
            </v-alert>

            <!-- Live Formatting Preview Box -->
            <v-card
              variant="flat"
              rounded="lg"
              class="bg-grey-lighten-4 pa-4 mt-4 mb-6 border"
            >
              <div class="text-overline text-medium-emphasis mb-2">LIVE FORMATTING PREVIEW</div>
              <v-row dense>
                <v-col cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">Hardware Component (3,190,000):</div>
                  <div class="text-h6 font-weight-bold text-primary">
                    {{ previewAmount(319000000) }}
                  </div>
                </v-col>
                <v-col cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">Peripheral Item (150,000):</div>
                  <div class="text-h6 font-weight-bold text-primary">
                    {{ previewAmount(15000000) }}
                  </div>
                </v-col>
              </v-row>
            </v-card>

            <!-- Action Buttons -->
            <div class="d-flex flex-wrap gap-2">
              <v-btn
                color="primary"
                rounded="lg"
                class="w-100 w-sm-auto mr-sm-2"
                :loading="busy"
                :disabled="busy"
                @click="handleSaveClick"
              >
                Save settings
              </v-btn>

              <v-btn
                v-if="isCurrencyChanged"
                variant="text"
                rounded="lg"
                class="w-100 w-sm-auto"
                :disabled="busy"
                @click="revertSettings"
              >
                Revert changes
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Confirmation Guardrail Dialog for Currency Changes -->
    <v-dialog
      v-model="confirmDialogOpen"
      max-width="500"
      persistent
    >
      <v-card rounded="xl" class="pa-2">
        <v-card-item class="pa-4">
          <div class="d-flex align-center">
            <v-icon
              icon="mdi-alert"
              color="warning"
              size="28"
              class="mr-3"
            />
            <v-card-title class="text-h6 font-weight-bold pa-0">
              Confirm Store Currency Change
            </v-card-title>
          </div>
        </v-card-item>

        <v-card-text class="pa-4 pt-0">
          <p class="text-body-2 mb-3">
            You are changing the store base currency from
            <strong>{{ initialCurrencyCode }}</strong> to
            <strong>{{ form.currency_code }}</strong> (with {{ form.currency_decimals }} decimal places).
          </p>

          <v-alert
            type="warning"
            variant="tonal"
            rounded="lg"
            density="compact"
            class="text-caption mb-3"
          >
            <strong>Nominal Value Preservation:</strong> MicroLedger does not perform automatic
            exchange-rate conversions. Existing catalog prices (e.g. 3,190,000) will keep their numerical
            numbers and display as {{ form.currency_code }} 3,190,000.
          </v-alert>

          <p class="text-caption text-medium-emphasis mb-0">
            Past sales transactions, receipts, and audit logs remain strictly immutable according to financial
            accounting standards. To update product prices after changing currency, please use the Products
            view or Catalog Excel Import.
          </p>
        </v-card-text>

        <v-card-actions class="pa-4 border-t d-flex justify-end gap-2">
          <v-btn
            variant="outlined"
            rounded="lg"
            :disabled="busy"
            @click="confirmDialogOpen = false"
          >
            Cancel
          </v-btn>

          <v-btn
            color="primary"
            rounded="lg"
            :loading="busy"
            @click="executeSave"
          >
            Confirm & Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>
