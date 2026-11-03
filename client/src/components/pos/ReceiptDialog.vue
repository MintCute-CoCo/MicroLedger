<script setup>
/**
 * ReceiptDialog.vue
 *
 * Professional Point of Sale (POS) printable receipt dialog.
 * Renders an authentic retail receipt slip using server-stored sale snapshots,
 * immutable line records, sequential sale numbering, and store profile metadata.
 *
 * PRINTING BEHAVIOR:
 * Uses @media print CSS for 80mm thermal receipt slip formatting and standard PDF print.
 * Adheres to AI_CONTEXT.md §11 print exception for paper-width dimensioning.
 */
import { toRef } from 'vue';
import { formatDateTime, formatMoney, displaySettings } from '../../utils/format.js';
import { useReceipt } from '../../composables/pos/useReceipt.js';

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

      <!-- Printable Thermal Receipt Slip -->
      <div class="receipt-slip-wrapper pa-5">
        <div id="microledger-printable-receipt" class="receipt-slip">
          <!-- Store Header -->
          <div class="receipt-header text-center mb-3">
            <h2 class="text-h6 font-weight-bold letter-spacing-1">
              {{ (displaySettings.store_name || 'MICROLEDGER').toUpperCase() }}
            </h2>
            <div v-if="displaySettings.store_tagline" class="text-caption font-weight-bold text-medium-emphasis">
              {{ displaySettings.store_tagline.toUpperCase() }}
            </div>
            <div v-if="displaySettings.store_address" class="text-caption text-medium-emphasis">
              {{ displaySettings.store_address }}
            </div>
            <div v-if="displaySettings.store_phone" class="text-caption text-medium-emphasis">
              Tel: {{ displaySettings.store_phone }}
            </div>
          </div>

          <div class="receipt-divider-dashed" />

          <!-- Transaction Metadata -->
          <div class="receipt-meta-grid my-2">
            <div class="d-flex justify-space-between text-caption">
              <span class="text-medium-emphasis">Receipt No:</span>
              <span class="font-weight-bold">{{ receiptData.saleNo }}</span>
            </div>
            <div class="d-flex justify-space-between text-caption">
              <span class="text-medium-emphasis">Date &amp; Time:</span>
              <span>{{ formatDateTime(receiptData.date) }}</span>
            </div>
            <div class="d-flex justify-space-between text-caption">
              <span class="text-medium-emphasis">Cashier:</span>
              <span>{{ receiptData.cashier }}</span>
            </div>
            <div class="d-flex justify-space-between text-caption">
              <span class="text-medium-emphasis">Customer:</span>
              <span>{{ receiptData.customer }}</span>
            </div>
            <div v-if="receiptData.phone" class="d-flex justify-space-between text-caption">
              <span class="text-medium-emphasis">Phone:</span>
              <span>{{ receiptData.phone }}</span>
            </div>
          </div>

          <div class="receipt-divider-dashed" />

          <!-- Line Items Table -->
          <div class="receipt-items-container my-2">
            <div class="d-flex justify-space-between text-overline font-weight-bold border-b pb-1 mb-2">
              <span class="flex-grow-1">ITEM / SKU</span>
              <span class="receipt-col-qty text-center">QTY</span>
              <span class="receipt-col-total text-right">TOTAL</span>
            </div>

            <div v-for="item in receiptData.items" :key="item.id" class="receipt-item-row mb-3">
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

          <div class="receipt-divider-dashed" />

          <!-- Financial Calculation Totals -->
          <div class="receipt-totals-section my-2">
            <div class="d-flex justify-space-between text-body-2 mb-1">
              <span>Subtotal:</span>
              <span>{{ formatMoney(receiptData.subtotalCents) }}</span>
            </div>
            <div v-if="receiptData.discountCents > 0" class="d-flex justify-space-between text-body-2 text-error mb-1">
              <span>Order discount:</span>
              <span>-{{ formatMoney(receiptData.discountCents) }}</span>
            </div>
            <div class="d-flex justify-space-between text-h6 font-weight-bold border-t pt-2 mt-2">
              <span>TOTAL ({{ displaySettings.currency_code }}):</span>
              <span>{{ formatMoney(receiptData.totalCents) }}</span>
            </div>
            <div class="d-flex justify-space-between text-caption text-medium-emphasis mt-1">
              <span>Payment tender:</span>
              <span class="font-weight-medium text-uppercase">{{ receiptData.payment }}</span>
            </div>
          </div>

          <div class="receipt-divider-dashed" />

          <!-- Footer Policy Notes -->
          <div class="receipt-footer text-center my-3">
            <div class="text-body-2 font-weight-bold mb-1">THANK YOU FOR YOUR BUSINESS!</div>
            <div class="text-caption text-medium-emphasis">
              Please retain this physical receipt for customer service and warranty claims.
            </div>
            <div class="text-body-2 font-weight-bold mt-2 letter-spacing-2">
              *{{ receiptData.saleNo }}*
            </div>
          </div>
        </div>
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
  display: flex;
  justify-content: center;
}

.receipt-slip {
  width: 100%;
  max-width: 380px;
  background: #ffffff;
  padding: 24px 20px;
  border-radius: 6px;
  border: 1px solid #d4dce8;
  color: #1e293b;
}

.receipt-divider-dashed {
  border-top: 1px dashed #cbd5e1;
  margin: 12px 0;
}

.receipt-meta-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.receipt-col-qty {
  width: 50px;
}

.receipt-col-total {
  width: 100px;
}

.letter-spacing-1 {
  letter-spacing: 1px;
}

.letter-spacing-2 {
  letter-spacing: 2px;
}

/* Print Mode Optimization (@media print per AI_CONTEXT.md §11 print exception) */
@media print {
  @page {
    size: auto;
    margin: 4mm;
  }

  :global(body *) {
    visibility: hidden !important;
  }

  :global(#microledger-printable-receipt),
  :global(#microledger-printable-receipt *) {
    visibility: visible !important;
  }

  :global(#microledger-printable-receipt) {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    width: 80mm !important;
    max-width: 80mm !important;
    margin: 0 !important;
    padding: 6mm 4mm !important;
    background: #ffffff !important;
    color: #000000 !important;
    border: none !important;
    font-size: 10pt !important;
  }

  .no-print,
  :global(.v-overlay__scrim),
  :global(.no-print) {
    display: none !important;
  }
}
</style>
