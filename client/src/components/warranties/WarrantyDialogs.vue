<script setup>
/**
 * WarrantyDialogs.vue
 *
 * Modal dialogs for manual warranty record provisioning (custom serial registration)
 * and retroactively attaching customer records to existing anonymous warranty tokens.
 */
const props = defineProps({
  manualOpen: Boolean,
  attachOpen: Boolean,
  busy: Boolean,
  error: { type: String, default: '' },
  products: { type: Array, default: () => [] },
  customers: { type: Array, default: () => [] },
  productSearch: { type: String, default: '' },
  customerSearch: { type: String, default: '' },
  attachCustomerId: { type: [Number, String], default: null },
  fieldErrors: { type: Object, required: true },
  form: { type: Object, required: true },
});

const emit = defineEmits([
  'update:manualOpen',
  'update:attachOpen',
  'update:productSearch',
  'update:customerSearch',
  'update:attachCustomerId',
  'update:form',
  'clear-error',
  'create',
  'attach',
]);

/**
 * Emits updated manual form state and clears field errors through composables.
 *
 * @param {string} field - Field property name.
 * @param {*} value - New field value.
 */
function updateField(field, value) {
  emit('update:form', { ...props.form, [field]: value });
  emit('clear-error', field);
}

/**
 * Updates the selected customer and clears its validation error through composable.
 *
 * @param {number|string|null} value - Selected customer identifier.
 */
function updateAttachCustomerId(value) {
  emit('clear-error', 'attachCustomerId');
  emit('update:attachCustomerId', value);
}
</script>

<template>
  <v-dialog
    :model-value="props.manualOpen"
    max-width="520"
    @update:model-value="emit('update:manualOpen', $event)"
  >
    <v-card rounded="xl" class="pa-5">
      <h2 class="text-h6 font-weight-bold mb-3">Manual warranty</h2>
      <v-alert v-if="props.error" type="error" variant="tonal" class="mb-3">
        {{ props.error }}
      </v-alert>

      <v-autocomplete
        :model-value="props.form.productId"
        :search="props.productSearch"
        :items="props.products"
        :item-title="(product) => `${product.name} · ${product.sku}`"
        item-value="id"
        label="Search product by name or SKU"
        :error-messages="props.fieldErrors.productId"
        no-filter
        variant="outlined"
        @update:search="emit('update:productSearch', $event)"
        @update:model-value="updateField('productId', $event)"
      />
      <v-autocomplete
        :model-value="props.form.customerId"
        :search="props.customerSearch"
        :items="props.customers"
        :item-title="(customer) => `${customer.name}${customer.phone ? ` · ${customer.phone}` : ''}`"
        item-value="id"
        label="Search customer by name or phone"
        :error-messages="props.fieldErrors.customerId"
        no-filter
        variant="outlined"
        @update:search="emit('update:customerSearch', $event)"
        @update:model-value="updateField('customerId', $event)"
      />
      <v-text-field
        :model-value="props.form.startDate"
        type="date"
        label="Purchase date (defaults to today)"
        :error-messages="props.fieldErrors.startDate"
        variant="outlined"
        @update:model-value="updateField('startDate', $event)"
      />
      <v-text-field
        :model-value="props.form.warrantyMonths"
        type="number"
        min="1"
        max="120"
        label="Warranty months (product default)"
        :error-messages="props.fieldErrors.warrantyMonths"
        variant="outlined"
        @update:model-value="updateField('warrantyMonths', $event)"
      />

      <div class="d-flex flex-wrap justify-end ga-2">
        <v-btn
          variant="outlined"
          rounded="lg"
          class="w-100 w-sm-auto"
          @click="emit('update:manualOpen', false)"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          rounded="lg"
          class="w-100 w-sm-auto"
          :disabled="!props.form.productId || !props.form.customerId"
          :loading="props.busy"
          @click="emit('create')"
        >
          Create warranty
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <v-dialog
    :model-value="props.attachOpen"
    max-width="440"
    @update:model-value="emit('update:attachOpen', $event)"
  >
    <v-card rounded="xl" class="pa-5">
      <h2 class="text-h6 font-weight-bold mb-3">Attach customer</h2>
      <v-alert v-if="props.error" type="error" variant="tonal" class="mb-3">
        {{ props.error }}
      </v-alert>
      <v-autocomplete
        :model-value="props.attachCustomerId"
        :search="props.customerSearch"
        :items="props.customers"
        :item-title="(customer) => `${customer.name}${customer.phone ? ` · ${customer.phone}` : ''}`"
        item-value="id"
        label="Search customer by name or phone"
        :error-messages="props.fieldErrors.attachCustomerId"
        no-filter
        variant="outlined"
        @update:search="emit('update:customerSearch', $event)"
        @update:model-value="updateAttachCustomerId"
      />
      <div class="d-flex flex-wrap justify-end ga-2">
        <v-btn
          variant="outlined"
          rounded="lg"
          class="w-100 w-sm-auto"
          @click="emit('update:attachOpen', false)"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          rounded="lg"
          class="w-100 w-sm-auto"
          :disabled="!props.attachCustomerId"
          :loading="props.busy"
          @click="emit('attach')"
        >
          Attach
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
