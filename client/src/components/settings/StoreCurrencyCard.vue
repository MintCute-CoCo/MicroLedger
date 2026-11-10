<script setup>
/**
 * StoreCurrencyCard.vue
 *
 * Currency and locale settings card for Settings View.
 * Provides quick regional presets, ISO 4217 code and decimal precision inputs,
 * nominal price preservation notice, live currency formatting preview, and save actions.
 */
const props = defineProps({
  form: {
    type: Object,
    required: true,
  },
  fieldErrors: {
    type: Object,
    default: () => ({}),
  },
  initialCurrencyCode: {
    type: String,
    required: true,
  },
  isCurrencyChanged: {
    type: Boolean,
    default: false,
  },
  presets: {
    type: Array,
    default: () => [],
  },
  busy: {
    type: Boolean,
    default: false,
  },
  previewAmount: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits([
  'apply-preset',
  'update:form',
  'clear-error',
  'save',
  'revert',
]);

/**
 * Handles preset chip selection.
 *
 * @param {string} code - ISO 4217 currency code.
 * @param {number} decimals - Decimal places.
 */
function handlePresetClick(code, decimals) {
  emit('apply-preset', { code, decimals });
}

/**
 * Updates form state and clears validation error for a specific field when edited.
 *
 * @param {string} fieldName - Form field key.
 * @param {*} value - New field value.
 */
function handleFieldInput(fieldName, value) {
  emit('update:form', { ...props.form, [fieldName]: value });
  emit('clear-error', fieldName);
}
</script>

<template>
  <v-card
    rounded="xl"
    variant="outlined"
    class="settings-card mb-6"
  >
    <v-card-item class="border-b pa-4">
      <v-card-title class="text-h6 font-weight-bold">
        Currency &amp; locale
      </v-card-title>
      <v-card-subtitle class="text-caption text-medium-emphasis">
        Select standard deployment presets or specify custom ISO 4217 rules
      </v-card-subtitle>
    </v-card-item>

    <v-card-text class="pa-6">
      <!-- Quick Preset Chips -->
      <div class="mb-5">
        <div class="text-caption font-weight-medium text-medium-emphasis mb-2">
          QUICK REGIONAL PRESETS
        </div>
        <div class="d-flex flex-wrap ga-2">
          <v-chip
            v-for="preset in props.presets"
            :key="preset.code"
            variant="outlined"
            class="mb-2"
            :color="props.form.currency_code === preset.code ? 'primary' : undefined"
            @click="handlePresetClick(preset.code, preset.decimals)"
          >
            <v-icon
              start
              :icon="props.form.currency_code === preset.code ? 'mdi-check-circle' : 'mdi-currency-usd'"
            />
            {{ preset.label }}
          </v-chip>
        </div>
      </div>

      <!-- Currency Inputs -->
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            :model-value="props.form.currency_code"
            label="Currency code (ISO 4217)"
            placeholder="e.g. VND, USD, EUR"
            maxlength="3"
            :error-messages="props.fieldErrors.currency_code"
            variant="outlined"
            density="compact"
            hint="3 uppercase letters (e.g., VND, USD)"
            persistent-hint
            @update:model-value="handleFieldInput('currency_code', $event)"
          />
        </v-col>

        <v-col cols="12" sm="6">
          <v-select
            :model-value="props.form.currency_decimals"
            :items="[0, 1, 2]"
            label="Currency decimal places"
            :error-messages="props.fieldErrors.currency_decimals"
            variant="outlined"
            density="compact"
            hint="0 for VND/JPY, 2 for USD/EUR"
            persistent-hint
            @update:model-value="handleFieldInput('currency_decimals', Number($event))"
          />
        </v-col>
      </v-row>

      <!-- Currency Modification Warning Banner -->
      <v-alert
        v-if="props.isCurrencyChanged"
        type="warning"
        variant="tonal"
        rounded="lg"
        class="mt-4 mb-4"
        icon="mdi-alert-outline"
      >
        <div class="text-subtitle-2 font-weight-bold">
          Currency change detected ({{ props.initialCurrencyCode }} &rarr; {{ props.form.currency_code }})
        </div>
        <div class="text-caption">
          Catalog product prices will retain their existing numerical values. For example, a product
          priced at 3,190,000 will be formatted as {{ props.form.currency_code }} 3,190,000 without exchange
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
            <div class="text-caption text-medium-emphasis">Catalog Product (3,190,000):</div>
            <div class="text-h6 font-weight-bold text-primary">
              {{ props.previewAmount(319000000) }}
            </div>
          </v-col>
          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">Standard Item (150,000):</div>
            <div class="text-h6 font-weight-bold text-primary">
              {{ props.previewAmount(15000000) }}
            </div>
          </v-col>
        </v-row>
      </v-card>

      <!-- Action Buttons -->
      <div class="d-flex flex-wrap ga-2">
        <v-btn
          color="primary"
          rounded="lg"
          class="w-100 w-sm-auto"
          :loading="props.busy"
          :disabled="props.busy"
          @click="emit('save')"
        >
          Save all settings
        </v-btn>

        <v-btn
          v-if="props.isCurrencyChanged"
          variant="text"
          rounded="lg"
          class="w-100 w-sm-auto"
          :disabled="props.busy"
          @click="emit('revert')"
        >
          Revert changes
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

