<script setup>
/**
 * ReceiptItems.vue
 *
 * Itemized line entries section for the 80mm thermal receipt slip.
 * Displays item titles, SKU, quantity multiplier, line subtotal, captured
 * serial numbers, and warranty coverage badges.
 */
import { formatMoney } from '../../utils/format.js';

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
});
</script>

<template>
  <div class="receipt-items-container my-2">
    <div class="d-flex justify-space-between text-overline font-weight-bold border-b pb-1 mb-2">
      <span class="flex-grow-1">ITEM / SKU</span>
      <span class="receipt-col-qty text-center">QTY</span>
      <span class="receipt-col-total text-right">TOTAL</span>
    </div>

    <div
      v-for="item in props.items"
      :key="item.id"
      class="receipt-item-row mb-3"
    >
      <div class="text-body-2 font-weight-medium">
        {{ item.name }}
      </div>
      <div v-if="item.sku" class="text-caption text-medium-emphasis">
        SKU: {{ item.sku }}
      </div>

      <div class="d-flex justify-space-between text-caption mt-1">
        <span class="text-medium-emphasis">
          {{ item.quantity }} &times; {{ formatMoney(item.unitPrice) }}
        </span>
        <span class="font-weight-bold">
          {{ formatMoney(item.lineTotal) }}
        </span>
      </div>

      <!-- Serial Numbers Traceability -->
      <div v-if="item.serials.length" class="text-caption text-primary mt-1 pl-2">
        <div v-for="sn in item.serials" :key="sn">
          &bull; S/N: {{ sn }}
        </div>
      </div>

      <!-- Warranty Coverage -->
      <div v-if="item.warrantyMonths > 0" class="text-caption text-success font-weight-medium mt-1">
        <v-icon icon="mdi-shield-check-outline" size="14" class="mr-1" />
        {{ item.warrantyMonths }} Months Warranty Coverage
      </div>
    </div>
  </div>
</template>

<style scoped>
.receipt-col-qty {
  width: 50px;
}

.receipt-col-total {
  width: 100px;
}
</style>
