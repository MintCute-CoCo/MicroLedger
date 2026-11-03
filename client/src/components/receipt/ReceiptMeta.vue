<script setup>
/**
 * ReceiptMeta.vue
 *
 * Transaction metadata section for the 80mm thermal receipt slip.
 * Displays sequential sale number, timestamp, cashier name, and customer details.
 */
import { formatDateTime } from '../../utils/format.js';

const props = defineProps({
  receiptData: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <div class="receipt-meta-grid my-2">
    <div class="d-flex justify-space-between text-caption">
      <span class="text-medium-emphasis">Receipt No:</span>
      <span class="font-weight-bold">{{ props.receiptData.saleNo }}</span>
    </div>
    <div class="d-flex justify-space-between text-caption">
      <span class="text-medium-emphasis">Date &amp; Time:</span>
      <span>{{ formatDateTime(props.receiptData.date) }}</span>
    </div>
    <div class="d-flex justify-space-between text-caption">
      <span class="text-medium-emphasis">Cashier:</span>
      <span>{{ props.receiptData.cashier }}</span>
    </div>
    <div class="d-flex justify-space-between text-caption">
      <span class="text-medium-emphasis">Customer:</span>
      <span>{{ props.receiptData.customer }}</span>
    </div>
    <div v-if="props.receiptData.phone" class="d-flex justify-space-between text-caption">
      <span class="text-medium-emphasis">Phone:</span>
      <span>{{ props.receiptData.phone }}</span>
    </div>
  </div>
</template>

<style scoped>
.receipt-meta-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
