<script setup>
/**
 * StoreProfileCard.vue
 *
 * Store profile and receipt branding card for Settings View.
 * Provides inputs to customize store business name, tagline, physical address,
 * and contact telephone, alongside a live 80mm thermal receipt slip preview.
 */
import ReceiptHeader from '../receipt/ReceiptHeader.vue';

const props = defineProps({
  form: {
    type: Object,
    required: true,
  },
  fieldErrors: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['clear-error']);

/**
 * Emits error clearing event for a specific form field when updated.
 *
 * @param {string} fieldName - Field identifier to clear errors for.
 */
function handleFieldInput(fieldName) {
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
        Store profile &amp; receipt branding
      </v-card-title>
      <v-card-subtitle class="text-caption text-medium-emphasis">
        Customize business name, physical address, and telephone printed on receipts
      </v-card-subtitle>
    </v-card-item>

    <v-card-text class="pa-6">
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="props.form.store_name"
            label="Store name"
            placeholder="e.g. MicroLedger Store"
            maxlength="100"
            :error-messages="props.fieldErrors.store_name"
            variant="outlined"
            density="compact"
            hint="Appears prominently at the top of printed receipts"
            persistent-hint
            @update:model-value="handleFieldInput('store_name')"
          />
        </v-col>

        <v-col cols="12" sm="6">
          <v-text-field
            v-model="props.form.store_tagline"
            label="Business tagline / Subtitle"
            placeholder="e.g. Retail POS & Inventory Solutions"
            maxlength="150"
            :error-messages="props.fieldErrors.store_tagline"
            variant="outlined"
            density="compact"
            hint="Store category or business slogan"
            persistent-hint
            @update:model-value="handleFieldInput('store_tagline')"
          />
        </v-col>

        <v-col cols="12" sm="7">
          <v-text-field
            v-model="props.form.store_address"
            label="Store physical address"
            placeholder="e.g. 123 Hoan Kiem, Hanoi or 70000 Ho Chi Minh City"
            maxlength="255"
            :error-messages="props.fieldErrors.store_address"
            variant="outlined"
            density="compact"
            hint="Full retail shop address printed on transaction slips"
            persistent-hint
            @update:model-value="handleFieldInput('store_address')"
          />
        </v-col>

        <v-col cols="12" sm="5">
          <v-text-field
            v-model="props.form.store_phone"
            label="Store contact telephone"
            placeholder="e.g. +84 (024) 3822-1234"
            maxlength="50"
            :error-messages="props.fieldErrors.store_phone"
            variant="outlined"
            density="compact"
            hint="Official contact phone for customer queries"
            persistent-hint
            @update:model-value="handleFieldInput('store_phone')"
          />
        </v-col>

        <v-col cols="12">
          <v-text-field
            v-model="props.form.receipt_footer"
            label="Receipt footer policy / return message"
            placeholder="e.g. Thank you for your business! Please keep receipt for returns within 7 days."
            maxlength="255"
            :error-messages="props.fieldErrors.receipt_footer"
            variant="outlined"
            density="compact"
            hint="Printed at the bottom of customer receipts"
            persistent-hint
            @update:model-value="handleFieldInput('receipt_footer')"
          />
        </v-col>
      </v-row>

      <!-- Live Thermal Receipt Slip Header Preview -->
      <v-card
        variant="flat"
        rounded="lg"
        class="bg-grey-lighten-4 pa-4 mt-4 border text-center"
      >
        <div class="text-overline text-medium-emphasis mb-2 text-left">
          RECEIPT BRANDING &amp; FOOTER PREVIEW (80MM THERMAL SLIP)
        </div>
        <div class="pa-3 bg-white border rounded">
          <ReceiptHeader
            :store-name="props.form.store_name"
            :store-tagline="props.form.store_tagline"
            :store-address="props.form.store_address"
            :store-phone="props.form.store_phone"
          />
          <v-divider class="my-3 border-dashed" />
          <div class="text-caption text-medium-emphasis">
            {{ props.form.receipt_footer || 'Please retain this physical receipt for customer service and returns.' }}
          </div>
        </div>
      </v-card>
    </v-card-text>
  </v-card>
</template>

