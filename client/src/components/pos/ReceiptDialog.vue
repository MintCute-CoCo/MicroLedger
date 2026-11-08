<script setup>
/**
 * ReceiptDialog.vue
 *
 * Professional Point of Sale (POS) printable receipt modal dialog.
 * Wraps the modular 80mm ReceiptSlip inside a persistent Vuetify dialog
 * with on-screen header actions and print execution controls.
 */
import { toRef } from 'vue';
import { useReceipt } from '../../composables/pos/useReceipt.js';
import ReceiptSlip from '../receipt/ReceiptSlip.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  sale: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'close']);

const saleRef = toRef(props, 'sale');
const { receiptData, handlePrint } = useReceipt(saleRef);

/**
 * Handles closing the receipt dialog.
 */
function handleClose() {
  emit('update:modelValue', false);
  emit('close');
}
</script>

<template>
  <v-dialog
    :model-value="props.modelValue"
    max-width="480"
    persistent
    class="receipt-dialog-container"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card v-if="receiptData" rounded="xl" variant="outlined" class="pa-0 overflow-hidden">
      <!-- On-Screen Dialog Header Actions (hidden during print) -->
      <div class="pa-4 bg-surface d-flex align-center justify-space-between border-b no-print">
        <div class="d-flex align-center ga-2">
          <v-icon color="success" icon="mdi-check-circle" size="24" />
          <span class="text-h6 font-weight-bold">Transaction receipt</span>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" aria-label="Close receipt" @click="handleClose" />
      </div>

      <!-- Printable Thermal Receipt Slip Container -->
      <div class="receipt-slip-wrapper d-flex justify-center pa-5">
        <ReceiptSlip :receipt-data="receiptData" />
      </div>

      <!-- Action Buttons Footer (hidden during print) -->
      <div class="pa-4 bg-surface border-t d-flex align-center justify-end ga-2 no-print">
        <v-btn
          variant="outlined"
          color="secondary"
          rounded="lg"
          @click="handleClose"
        >
          New Sale / Close
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-printer"
          rounded="lg"
          elevation="0"
          @click="handlePrint"
        >
          Print receipt
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.receipt-slip-wrapper {
  background-color: #f1f5f9;
  max-height: 70vh;
  overflow-y: auto;
}

@media print {
  .no-print,
  :global(.v-overlay__scrim),
  :global(.no-print) {
    display: none !important;
  }
}
</style>
