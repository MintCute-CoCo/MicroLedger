<script setup>
import { formatMoney } from '../../utils/format.js';

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
  apiMode: Boolean,
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
  <v-card rounded="xl" variant="outlined" class="pa-3 pos-checkout-panel">
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

    <div v-if="props.cart.length" class="pos-cart-items min-h-0 mb-2">
      <v-card
        v-for="line in props.cart"
        :key="line.productId"
        rounded="lg"
        variant="outlined"
        class="pa-2 mb-2"
      >
        <v-row dense align="center">
          <v-col cols="7" class="min-w-0">
            <div class="text-body-2 font-weight-bold text-break">
              {{ line.name }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ formatMoney(line.price) }} each
            </div>
          </v-col>
          <v-col cols="5" class="d-flex align-center justify-end ga-2">
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              class="pos-quantity-button"
              aria-label="Remove item"
              @click="emit('remove-item', line.productId)"
            />
            <div class="d-flex align-center ga-1">
              <v-btn
                icon="mdi-minus"
                variant="outlined"
                size="small"
                class="pos-quantity-button"
                aria-label="Decrease quantity"
                @click="emit('quantity-change', { productId: line.productId, delta: -1 })"
              />
              <strong class="text-body-2 px-2">{{ line.quantity }}</strong>
              <v-btn
                icon="mdi-plus"
                variant="outlined"
                size="small"
                class="pos-quantity-button"
                aria-label="Increase quantity"
                @click="emit('quantity-change', { productId: line.productId, delta: 1 })"
              />
            </div>
          </v-col>
          <v-col v-if="line.tracksSerial" cols="12">
            <v-textarea
              :model-value="line.serialNumbers"
              :label="`Serial numbers (${props.parseSerialNumbers(line.serialNumbers).length}/${line.quantity})`"
              :placeholder="`Enter ${line.quantity} serial ${line.quantity === 1 ? 'number' : 'numbers'} (comma or newline separated)`"
              :hint="`Expected ${line.quantity} unique serial ${line.quantity === 1 ? 'number' : 'numbers'}, found ${props.parseSerialNumbers(line.serialNumbers).length}`"
              :error="props.parseSerialNumbers(line.serialNumbers).length !== line.quantity && Boolean(line.serialNumbers)"
              rows="2"
              auto-grow
              variant="outlined"
              density="compact"
              persistent-hint
              hide-details="auto"
              @update:model-value="emit('serial-change', { productId: line.productId, value: $event })"
            />
          </v-col>
        </v-row>
      </v-card>
    </div>

    <div
      v-else
      class="d-flex flex-column align-center text-center py-1 pos-empty-cart"
    >
      <v-icon
        icon="mdi-cart-outline"
        size="32"
        color="medium-emphasis"
      />
      <div class="text-body-2 font-weight-medium">Your cart is waiting</div>
      <div class="text-caption text-medium-emphasis">
        Choose a product to start a sale.
      </div>
    </div>

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
        :disabled="!props.cart.length || props.busy"
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
  </v-card>
</template>
