<script setup>
const props = defineProps({
  open: Boolean,
  busy: Boolean,
  isAdmin: Boolean,
  error: {
    type: String,
    default: '',
  },
  fieldErrors: {
    type: Object,
    required: true,
  },
  form: {
    type: Object,
    required: true,
  },
  selectedWarranty: {
    type: Object,
    default: null,
  },
  warrantyOptions: {
    type: Array,
    default: () => [],
  },
  warrantySearch: {
    type: String,
    default: '',
  },
  customerOptions: {
    type: Array,
    default: () => [],
  },
  customerSearch: {
    type: String,
    default: '',
  },
});

const emit = defineEmits([
  'update:open',
  'update:warrantySearch',
  'update:customerSearch',
  'create',
]);

/**
 * Builds a searchable warranty option label for the claim form.
 *
 * @param {Object} warranty - Warranty record shown in the autocomplete.
 * @returns {string} Product, serial, and validity details.
 */
function formatWarrantyLabel(warranty) {
  if (!warranty) {
    return '';
  }

  const parts = [warranty.product_name, warranty.sku];

  if (warranty.serial_no) {
    parts.push(`Serial: ${warranty.serial_no}`);
  }

  parts.push(warranty.validity);

  return parts.join(' · ');
}
</script>

<template>
  <v-dialog
    :model-value="props.open"
    max-width="560"
    @update:model-value="emit('update:open', $event)"
  >
    <v-card rounded="xl" class="pa-5">
      <div class="d-flex align-center justify-space-between ga-2 mb-3">
        <h2 class="text-h6 font-weight-bold">New warranty claim</h2>
        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Close claim form"
          @click="emit('update:open', false)"
        />
      </div>

      <v-alert v-if="props.error" type="error" variant="tonal" class="mb-3">
        {{ props.error }}
      </v-alert>

      <v-autocomplete
        v-model="props.form.warrantyId"
        :search="props.warrantySearch"
        :items="props.warrantyOptions"
        :item-title="formatWarrantyLabel"
        item-value="id"
        label="Search warranty by sale, phone, product, SKU or serial"
        :error-messages="props.fieldErrors.warrantyId"
        no-data-text="No usable warranty matches that search."
        no-filter
        variant="outlined"
        @update:search="emit('update:warrantySearch', $event)"
        @update:model-value="props.fieldErrors.warrantyId = undefined"
      />

      <v-text-field
        v-if="props.selectedWarranty?.customer_id"
        :model-value="`${props.selectedWarranty.customer_name || 'Attached customer'}${props.selectedWarranty.customer_phone ? ` · ${props.selectedWarranty.customer_phone}` : ''}`"
        label="Warranty customer"
        variant="outlined"
        readonly
      />

      <v-alert
        v-if="props.selectedWarranty?.customer_id && !props.selectedWarranty.customer_phone"
        type="warning"
        variant="tonal"
        density="compact"
      >
        Add a phone number to the warranty customer before creating a claim.
      </v-alert>

      <v-autocomplete
        v-else-if="props.selectedWarranty"
        v-model="props.form.customerId"
        :search="props.customerSearch"
        :items="props.customerOptions"
        :item-title="(customer) => `${customer.name} · ${customer.phone}`"
        item-value="id"
        label="Customer with phone"
        :error-messages="props.fieldErrors.customerId"
        no-data-text="No customers with a phone match that search."
        no-filter
        variant="outlined"
        @update:search="emit('update:customerSearch', $event)"
        @update:model-value="props.fieldErrors.customerId = undefined"
      />

      <v-textarea
        v-model="props.form.problem"
        label="Problem description"
        maxlength="1000"
        :error-messages="props.fieldErrors.problem"
        variant="outlined"
        @update:model-value="props.fieldErrors.problem = undefined"
      />

      <v-textarea
        v-if="props.isAdmin && props.selectedWarranty?.validity === 'Expired'"
        v-model="props.form.outOfWarrantyNote"
        label="Admin note for expired warranty *"
        :error-messages="props.fieldErrors.outOfWarrantyNote"
        variant="outlined"
        @update:model-value="props.fieldErrors.outOfWarrantyNote = undefined"
      />

      <div class="d-flex flex-wrap justify-end ga-2 mt-3">
        <v-btn
          variant="outlined"
          rounded="lg"
          class="w-100 w-sm-auto"
          @click="emit('update:open', false)"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          rounded="lg"
          class="w-100 w-sm-auto"
          :disabled="!props.form.warrantyId || !props.selectedWarranty || (props.selectedWarranty.customer_id ? !props.selectedWarranty.customer_phone : !props.form.customerId) || !props.form.problem.trim() || (props.isAdmin && props.selectedWarranty?.validity === 'Expired' && !props.form.outOfWarrantyNote.trim())"
          :loading="props.busy"
          @click="emit('create')"
        >
          Create claim
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
