<script setup>
/**
 * ReceiptTotals.vue
 *
 * Financial calculation totals section for the 80mm thermal receipt slip.
 * Displays subtotal, order discounts, grand total with configured store currency,
 * and payment tender method.
 */
import { formatMoney, displaySettings } from '../../utils/format.js';

const props = defineProps({
  receiptData: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <div class="receipt-totals-section my-2">
    <div class="d-flex justify-space-between text-body-2 mb-1">
      <span>Subtotal:</span>
      <span>{{ formatMoney(props.receiptData.subtotalCents) }}</span>
    </div>

    <div
      v-if="props.receiptData.discountCents > 0"
      class="d-flex justify-space-between text-body-2 text-error mb-1"
    >
      <span>Order discount:</span>
      <span>-{{ formatMoney(props.receiptData.discountCents) }}</span>
    </div>

    <div class="d-flex justify-space-between text-h6 font-weight-bold border-t pt-2 mt-2">
      <span>TOTAL ({{ displaySettings.currency_code }}):</span>
      <span>{{ formatMoney(props.receiptData.totalCents) }}</span>
    </div>

    <div class="d-flex justify-space-between text-caption text-medium-emphasis mt-1">
      <span>Payment tender:</span>
      <span class="font-weight-medium text-uppercase">{{ props.receiptData.payment }}</span>
    </div>
  </div>
</template>
