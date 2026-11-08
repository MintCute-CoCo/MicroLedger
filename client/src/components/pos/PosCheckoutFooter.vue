<script setup>
/**
 * PosCheckoutFooter.vue
 *
 * Renders the checkout controls of the POS sidebar:
 * customer lookup/select, monetary discount field, payment method selection,
 * totals summary breakdown, and "Complete sale" transaction button.
 */
import { formatMoney } from '../../utils/format.js';

const props = defineProps({
  cartLength: {
    type: Number,
    default: 0,
  },
  busy: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: '',
  },
  selectedCustomerId: {
    type: [String, Number],
    default: null,
  },
  selectedCustomer: {
    type: Object,
    default: null,
  },
  customerSearch: {
    type: String,
    default: '',
  },
  customers: {
    type: Array,
    default: () => [],
  },
  matchingCustomers: {
    type: Array,
    default: () => [],
  },
  discountCents: {
    type: Number,
    default: 0,
  },
  currencyCode: {
    type: String,
    default: '',
  },
  currencyDecimals: {
    type: Number,
    default: 2,
  },
  paymentMethod: {
    type: String,
    default: 'Card',
  },
  paymentMethods: {
    type: Array,
    default: () => [],
  },
  subtotal: {
    type: Number,
    default: 0,
  },
  cartSubtotal: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits([
  'update:selectedCustomerId',
  'update:customerSearch',
  'update:discount',
  'update:paymentMethod',
  'checkout',
]);

/**
 * Selects the payment icon shown next to a payment option.
 *
 * @param {string} method - Payment method label.
 * @returns {string} Material Design icon name.
 */
function getPaymentIcon(method) {
  if (method === 'Cash') {
    return 'mdi-cash';
  }

  if (method === 'Card') {
    return 'mdi-credit-card-outline';
  }

  if (method === 'Bank transfer') {
    return 'mdi-bank-outline';
  }

  return 'mdi-credit-card-outline';
}
</script>

<template>
  <div class="pos-checkout-footer">
    <v-divider class="my-1" />
    <v-row dense>
      <v-col cols="12" sm="6">
        <div class="text-overline mb-1">Customer</div>
        <v-select
          v-if="props.selectedCustomer"
          :model-value="props.selectedCustomer.id"
          :items="props.customers"
          item-title="name"
          item-value="id"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="emit('update:selectedCustomerId', $event)"
        />
        <v-autocomplete
          v-else
          :model-value="props.selectedCustomerId"
          :search="props.customerSearch"
          :items="props.matchingCustomers"
          item-title="name"
          item-value="id"
          placeholder="Walk-in customer"
          prepend-inner-icon="mdi-account-outline"
          variant="outlined"
          density="compact"
          hide-details
          no-filter
          clearable
          @update:model-value="emit('update:selectedCustomerId', $event)"
          @update:search="emit('update:customerSearch', $event)"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <div class="text-overline mb-1">Discount</div>
        <v-text-field
          :model-value="props.discountCents
          ? (props.discountCents / 100).toFixed(props.currencyDecimals)
          : ''"
          :prefix="props.currencyCode"
          placeholder="0.00"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="emit('update:discount', $event)"
        />
      </v-col>
    </v-row>

    <div class="text-overline mt-1 mb-1">Payment method</div>
    <v-btn-toggle
      :model-value="props.paymentMethod"
      color="primary"
      divided
      mandatory
      class="d-flex flex-wrap"
      density="compact"
      @update:model-value="emit('update:paymentMethod', $event)"
    >
      <v-btn
        v-for="method in props.paymentMethods"
        :key="method"
        :value="method"
        size="small"
        class="flex-grow-1"
      >
        <v-icon :icon="getPaymentIcon(method)" class="mr-1" />
        {{ method }}
      </v-btn>
    </v-btn-toggle>

    <v-row dense class="mt-1">
      <v-col cols="6" class="text-body-2">Subtotal</v-col>
      <v-col cols="6" class="text-right text-body-2">{{ formatMoney(props.subtotal) }}</v-col>
      <v-col cols="6" class="text-body-2">Discount</v-col>
      <v-col cols="6" class="text-right text-body-2 text-error">
        − {{ formatMoney(Math.min(props.discountCents, props.cartSubtotal)) }}
      </v-col>
      <v-col cols="6" class="text-h6 font-weight-bold">Total due</v-col>
      <v-col cols="6" class="text-right text-h6 font-weight-bold">
        {{ formatMoney(props.total) }}
      </v-col>
    </v-row>

    <v-alert
      v-if="props.errorMessage"
      type="error"
      variant="tonal"
      density="compact"
      class="my-2"
    >
      {{ props.errorMessage }}
    </v-alert>

    <v-btn
      color="primary"
      size="large"
      block
      rounded="lg"
      :disabled="!props.cartLength || props.busy"
      :loading="props.busy"
      append-icon="mdi-arrow-right"
      @click="emit('checkout')"
    >
      Complete sale
    </v-btn>
    <div class="text-caption text-medium-emphasis text-center mt-2">
      <v-icon icon="mdi-shield-check-outline" size="small" />
      Payment method recorded · no payment gateway connected
    </div>
  </div>
</template>
