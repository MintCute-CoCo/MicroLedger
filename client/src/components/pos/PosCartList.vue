<script setup>
/**
 * PosCartList.vue
 *
 * Renders the active cart line items for POS checkout:
 * unit price, item quantity increment/decrement, remove item,
 * serial number textarea for serial-tracked items, and empty cart state.
 */
import { formatMoney } from '../../utils/format.js';

const props = defineProps({
  cart: {
    type: Array,
    default: () => [],
  },
  parseSerialNumbers: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits([
  'remove-item',
  'quantity-change',
  'serial-change',
]);
</script>

<template>
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
</template>
