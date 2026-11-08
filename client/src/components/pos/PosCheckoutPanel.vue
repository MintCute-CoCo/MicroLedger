<script setup>
/**
 * PosCheckoutPanel.vue
 *
 * Coordinator component assembling the POS checkout sidebar:
 * - PosCartList: Active cart items and serial numbers entry.
 * - PosCheckoutFooter: Customer assignment, discount, payment method, and checkout submission.
 */
import { formatMoney } from '../../utils/format.js';
import PosCartList from './PosCartList.vue';
import PosCheckoutFooter from './PosCheckoutFooter.vue';

const props = defineProps({
  cart: {
    type: Array,
    default: () => [],
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
  paymentMethod: {
    type: String,
    default: 'Card',
  },
  paymentMethods: {
    type: Array,
    default: () => [],
  },
  discountCents: {
    type: Number,
    default: 0,
  },
  cartSubtotal: {
    type: Number,
    default: 0,
  },
  subtotal: {
    type: Number,
    default: 0,
  },
  total: {
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
  busy: Boolean,
  errorMessage: {
    type: String,
    default: '',
  },
  parseSerialNumbers: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits([
  'update:selectedCustomerId',
  'update:customerSearch',
  'update:paymentMethod',
  'update:discount',
  'quantity-change',
  'serial-change',
  'remove-item',
  'clear-cart',
  'checkout',
]);
</script>

<template>
  <v-card rounded="xl" variant="outlined" class="pa-3 pos-checkout-panel">
    <!-- Header Section -->
    <div class="d-flex align-center justify-space-between ga-2 mb-2">
      <div>
        <h2 class="text-h6 font-weight-bold">Current sale</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          {{ props.cart.length }} {{ props.cart.length === 1 ? 'item' : 'items' }}
          · {{ formatMoney(props.total) }} due
        </p>
      </div>
      <v-btn
        icon="mdi-delete-outline"
        variant="text"
        aria-label="Clear cart"
        :disabled="!props.cart.length"
        @click="emit('clear-cart')"
      />
    </div>

    <!-- Section 1: Cart Items List -->
    <PosCartList
      :cart="props.cart"
      :parse-serial-numbers="props.parseSerialNumbers"
      @remove-item="emit('remove-item', $event)"
      @quantity-change="emit('quantity-change', $event)"
      @serial-change="emit('serial-change', $event)"
    />

    <!-- Section 2: Checkout Footer & Payment Controls -->
    <PosCheckoutFooter
      :cart-length="props.cart.length"
      :busy="props.busy"
      :error-message="props.errorMessage"
      :selected-customer-id="props.selectedCustomerId"
      :selected-customer="props.selectedCustomer"
      :customer-search="props.customerSearch"
      :customers="props.customers"
      :matching-customers="props.matchingCustomers"
      :discount-cents="props.discountCents"
      :currency-code="props.currencyCode"
      :currency-decimals="props.currencyDecimals"
      :payment-method="props.paymentMethod"
      :payment-methods="props.paymentMethods"
      :subtotal="props.subtotal"
      :cart-subtotal="props.cartSubtotal"
      :total="props.total"
      @update:selected-customer-id="emit('update:selectedCustomerId', $event)"
      @update:customer-search="emit('update:customerSearch', $event)"
      @update:discount="emit('update:discount', $event)"
      @update:payment-method="emit('update:paymentMethod', $event)"
      @checkout="emit('checkout')"
    />
  </v-card>
</template>
