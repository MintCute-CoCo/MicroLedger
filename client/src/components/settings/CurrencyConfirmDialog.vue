<script setup>
/**
 * CurrencyConfirmDialog.vue
 *
 * Guardrail confirmation modal for store currency modifications.
 * Informs administrators about nominal value preservation under the single-currency
 * policy (BSR §4.6) and asks for explicit confirmation before applying changes.
 */
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  initialCurrencyCode: {
    type: String,
    required: true,
  },
  targetCurrencyCode: {
    type: String,
    required: true,
  },
  targetDecimals: {
    type: Number,
    default: 0,
  },
  busy: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'update:modelValue',
  'confirm',
]);

/**
 * Closes the confirmation dialog without saving.
 */
function handleCancel() {
  emit('update:modelValue', false);
}

/**
 * Confirms the currency modification and triggers save execution.
 */
function handleConfirm() {
  emit('confirm');
}
</script>

<template>
  <v-dialog
    :model-value="props.modelValue"
    max-width="500"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
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
          <strong>{{ props.initialCurrencyCode }}</strong> to
          <strong>{{ props.targetCurrencyCode }}</strong> (with {{ props.targetDecimals }} decimal places).
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
          values and display as {{ props.targetCurrencyCode }} 3,190,000.
        </v-alert>

        <p class="text-caption text-medium-emphasis mb-0">
          Past sales transactions, receipts, and audit logs remain strictly immutable according to financial
          accounting standards. To update product prices after changing currency, please use the Products
          view or Catalog Excel Import.
        </p>
      </v-card-text>

      <v-card-actions class="pa-4 border-t d-flex justify-end ga-2">
        <v-btn
          variant="outlined"
          rounded="lg"
          :disabled="props.busy"
          @click="handleCancel"
        >
          Cancel
        </v-btn>

        <v-btn
          color="primary"
          rounded="lg"
          :loading="props.busy"
          @click="handleConfirm"
        >
          Confirm & Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
