<script setup>
/**
 * ReceiptSlip.vue
 *
 * Authentic 80mm printable thermal receipt slip component.
 * Assembles modular header branding, transaction metadata, itemized lines,
 * financial totals, and policy footer into a cohesive paper slip.
 *
 * PRINTING BEHAVIOR:
 * Formatted for standard 80mm thermal receipt printers and browser print to PDF.
 * Implements @media print CSS rules adhering to AI_CONTEXT.md §11 print exception.
 */
import ReceiptHeader from './ReceiptHeader.vue';
import ReceiptMeta from './ReceiptMeta.vue';
import ReceiptItems from './ReceiptItems.vue';
import ReceiptTotals from './ReceiptTotals.vue';

const props = defineProps({
  receiptData: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <div id="microledger-printable-receipt" class="receipt-slip">
    <!-- Store Profile & Branding Header -->
    <ReceiptHeader />

    <div class="receipt-divider-dashed" />

    <!-- Transaction Metadata (Sale No, Date, Staff, Customer) -->
    <ReceiptMeta :receipt-data="props.receiptData" />

    <div class="receipt-divider-dashed" />

    <!-- Itemized Lines (SKU, Qty, Price, Serials, Warranty) -->
    <ReceiptItems :items="props.receiptData.items" />

    <div class="receipt-divider-dashed" />

    <!-- Financial Summary (Subtotal, Discount, Grand Total, Tender) -->
    <ReceiptTotals :receipt-data="props.receiptData" />

    <div class="receipt-divider-dashed" />

    <!-- Policy Footer & Sequential Barcode Simulation -->
    <div class="receipt-footer text-center my-3">
      <div class="text-body-2 font-weight-bold mb-1">
        THANK YOU FOR YOUR BUSINESS!
      </div>
      <div class="text-caption text-medium-emphasis">
        Please retain this physical receipt for customer service and warranty claims.
      </div>
      <div class="text-body-2 font-weight-bold mt-2 letter-spacing-2">
        *{{ props.receiptData.saleNo }}*
      </div>
    </div>
  </div>
</template>

<style scoped>
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
}
</style>
