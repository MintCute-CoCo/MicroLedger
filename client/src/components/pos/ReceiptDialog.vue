<script setup>
/**
 * ReceiptDialog.vue
 *
 * Professional Point of Sale (POS) printable receipt dialog.
 * Renders an authentic, high-clarity retail receipt slip with store metadata,
 * sequential sale number, itemized line entries with captured serial numbers,
 * warranty duration, tax/discounts, and payment details.
 *
 * Includes dedicated @media print CSS optimized for 80mm thermal receipt printers
 * and standard document printing (PDF / A4).
 */
import { computed } from 'vue';
import { formatDateTime, formatMoney, displaySettings } from '../../utils/format.js';

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

/**
 * Standardizes sale details from either POS checkout or Sales history view.
 */
const receiptData = computed(() => {
  if (!props.sale) return null;

  const raw = props.sale;
  const saleNo = raw.saleNo || raw.number || 'S-000000';
  const dateVal = raw.soldAt || raw.createdAt || new Date().toISOString();
  const cashier = raw.staffName || raw.staff || 'Cashier';
  const customer = raw.customerName || raw.customer || 'Walk-in Customer';
  const phone = raw.customerPhone || '';
  const payment = raw.paymentMethod || raw.payment || 'Card';

  /**
   * Normalizes an amount into integer cents for formatMoney(cents).
   * Handles strings from REST API ("69.99", "14890000.00"), floats (69.99),
   * and integer cents passed from client store/composable state (6999).
   *
   * @param {string|number|null|undefined} val - Input monetary amount.
   * @param {boolean} [itemIsCents=false] - Item-level cents flag.
   * @returns {number} Normalized integer cents.
   */
  const parseToCents = (val, itemIsCents = false) => {
    if (val === undefined || val === null || val === '') {
      return 0;
    }

    // 1. Explicitly flagged as already in cents from client composable
    if (raw._isCents || itemIsCents) {
      return Math.round(Number(val) || 0);
    }

    // 2. Numeric inputs:
    if (typeof val === 'number') {
      // Float with decimal places (e.g. 69.99) -> convert to cents
      if (!Number.isInteger(val)) {
        return Math.round(val * 100);
      }
      // Integer number: in client sales state, values are stored as cents (e.g. 6999)
      return val;
    }

    // 3. String inputs from PostgreSQL NUMERIC(12,2) or demoEngine (e.g. "69.99", "14890000.00"):
    const num = Number(val);
    if (Number.isNaN(num)) {
      return 0;
    }
    return Math.round(num * 100);
  };

  const totalCents = parseToCents(raw.total);
  const subtotalCents = parseToCents(raw.subtotal ?? raw.total);
  const discountCents = parseToCents(raw.discountAmount);

  const items = (raw.items || []).map((item, idx) => {
    const rawLineTotal = item.lineTotal ?? item.totalPrice ?? 0;
    const rawUnitPrice = item.unitPrice ?? item.price ?? 0;

    const itemTotal = parseToCents(rawLineTotal, item._isCents);
    const itemPrice = parseToCents(rawUnitPrice, item._isCents);

    let serials = [];
    if (Array.isArray(item.serialNumbers)) {
      serials = item.serialNumbers;
    } else if (typeof item.serialNumbers === 'string' && item.serialNumbers.trim()) {
      serials = item.serialNumbers.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    }

    return {
      id: item.id || idx,
      name: item.name || item.productName || 'Hardware SKU',
      sku: item.sku || '',
      quantity: Number(item.quantity || 1),
      unitPrice: itemPrice,
      lineTotal: itemTotal,
      serials,
      warrantyMonths: item.warrantyMonths || 0,
    };
  });

  return {
    saleNo,
    date: dateVal,
    cashier,
    customer,
    phone,
    payment,
    totalCents,
    subtotalCents,
    discountCents,
    items,
  };
});

function handleClose() {
  emit('update:modelValue', false);
  emit('close');
}

function handlePrint() {
  window.print();
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
    <v-card v-if="receiptData" rounded="xl" class="pa-0 overflow-hidden">
      <!-- On-Screen Dialog Header Actions (hidden during print) -->
      <div class="pa-4 bg-surface d-flex align-center justify-space-between border-b no-print">
        <div class="d-flex align-center ga-2">
          <v-icon color="success" icon="mdi-check-circle" size="24" />
          <span class="text-subtitle-1 font-weight-bold">Transaction Receipt</span>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" aria-label="Close receipt" @click="handleClose" />
      </div>

      <!-- Printable Thermal Receipt Slip -->
      <div class="receipt-slip-wrapper pa-5">
        <div id="microledger-printable-receipt" class="receipt-slip">
          <!-- Store Header -->
          <div class="receipt-header text-center">
            <h2 class="receipt-brand-title">MICROLEDGER</h2>
            <div class="receipt-subline">PC HARDWARE &amp; TECH SOLUTIONS</div>
            <div class="receipt-muted-info">70000 Ho Chi Minh City, Vietnam</div>
            <div class="receipt-muted-info">Tel: +84 (028) 3822-9999</div>
          </div>

          <div class="receipt-divider-dashed" />

          <!-- Transaction Metadata -->
          <div class="receipt-meta-grid">
            <div class="receipt-meta-row">
              <span class="meta-label">Receipt No:</span>
              <span class="meta-value font-weight-bold">{{ receiptData.saleNo }}</span>
            </div>
            <div class="receipt-meta-row">
              <span class="meta-label">Date &amp; Time:</span>
              <span class="meta-value">{{ formatDateTime(receiptData.date) }}</span>
            </div>
            <div class="receipt-meta-row">
              <span class="meta-label">Cashier:</span>
              <span class="meta-value">{{ receiptData.cashier }}</span>
            </div>
            <div class="receipt-meta-row">
              <span class="meta-label">Customer:</span>
              <span class="meta-value">{{ receiptData.customer }}</span>
            </div>
            <div v-if="receiptData.phone" class="receipt-meta-row">
              <span class="meta-label">Phone:</span>
              <span class="meta-value">{{ receiptData.phone }}</span>
            </div>
          </div>

          <div class="receipt-divider-dashed" />

          <!-- Line Items Table -->
          <div class="receipt-items-container">
            <div class="receipt-items-header">
              <span class="col-item">ITEM / SKU</span>
              <span class="col-qty text-center">QTY</span>
              <span class="col-total text-right">TOTAL</span>
            </div>

            <div v-for="item in receiptData.items" :key="item.id" class="receipt-item-row">
              <div class="item-title font-weight-medium">
                {{ item.name }}
              </div>
              <div v-if="item.sku" class="item-sku">
                SKU: {{ item.sku }}
              </div>

              <div class="item-calc-line">
                <span class="calc-text">
                  {{ item.quantity }} × {{ formatMoney(item.unitPrice) }}
                </span>
                <span class="line-sum font-weight-bold">
                  {{ formatMoney(item.lineTotal) }}
                </span>
              </div>

              <!-- Serial Numbers Traceability -->
              <div v-if="item.serials.length" class="item-serials">
                <div v-for="sn in item.serials" :key="sn" class="sn-entry">
                  • S/N: {{ sn }}
                </div>
              </div>

              <!-- Warranty Coverage -->
              <div v-if="item.warrantyMonths > 0" class="item-warranty">
                ★ {{ item.warrantyMonths }} Months Hardware Warranty
              </div>
            </div>
          </div>

          <div class="receipt-divider-dashed" />

          <!-- Financial Calculation Totals -->
          <div class="receipt-totals-section">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>{{ formatMoney(receiptData.subtotalCents) }}</span>
            </div>
            <div v-if="receiptData.discountCents > 0" class="totals-row text-error">
              <span>Order Discount:</span>
              <span>-{{ formatMoney(receiptData.discountCents) }}</span>
            </div>
            <div class="totals-row total-grand">
              <span>TOTAL ({{ displaySettings.currency_code }}):</span>
              <span class="grand-amount">{{ formatMoney(receiptData.totalCents) }}</span>
            </div>
            <div class="totals-row payment-method">
              <span>Payment Tender:</span>
              <span class="font-weight-medium text-uppercase">{{ receiptData.payment }}</span>
            </div>
          </div>

          <div class="receipt-divider-dashed" />

          <!-- Footer Policy Notes -->
          <div class="receipt-footer text-center">
            <div class="footer-thanks">THANK YOU FOR YOUR BUSINESS!</div>
            <div class="footer-policy">
              Please retain this physical receipt and serial records for manufacturer warranty claims.
            </div>
            <div class="receipt-barcode-line">
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
          @click="handleClose"
        >
          New Sale / Close
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-printer"
          elevation="0"
          @click="handlePrint"
        >
          Print Receipt
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Screen View Styling */
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  font-family: 'Courier New', Courier, Consolas, Monaco, monospace;
  font-size: 13px;
  line-height: 1.4;
  color: #1e293b;
}

.receipt-brand-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #0f172a;
  margin-bottom: 2px;
}

.receipt-subline {
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  letter-spacing: 0.5px;
}

.receipt-muted-info {
  font-size: 11px;
  color: #64748b;
}

.receipt-divider-dashed {
  border-top: 1px dashed #cbd5e1;
  margin: 12px 0;
}

.receipt-meta-grid {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.receipt-meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.meta-label {
  color: #64748b;
}

.receipt-items-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  padding-bottom: 6px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 8px;
}

.col-item {
  flex: 1;
}

.col-qty {
  width: 50px;
}

.col-total {
  width: 100px;
}

.receipt-item-row {
  margin-bottom: 10px;
}

.item-title {
  font-size: 13px;
  color: #0f172a;
}

.item-sku {
  font-size: 11px;
  color: #64748b;
}

.item-calc-line {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
  font-size: 12px;
}

.calc-text {
  color: #475569;
}

.item-serials {
  font-size: 11px;
  color: #0284c7;
  margin-top: 2px;
  padding-left: 6px;
}

.item-warranty {
  font-size: 11px;
  color: #16a34a;
  margin-top: 2px;
  font-weight: 600;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 4px;
}

.total-grand {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #0f172a;
}

.grand-amount {
  font-size: 16px;
}

.payment-method {
  font-size: 12px;
  color: #475569;
}

.footer-thanks {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.5px;
  color: #0f172a;
  margin-bottom: 4px;
}

.footer-policy {
  font-size: 11px;
  color: #64748b;
  line-height: 1.3;
}

.receipt-barcode-line {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 3px;
  margin-top: 10px;
  color: #0f172a;
}

/* Print Mode Optimization (@media print) */
@media print {
  @page {
    size: auto;
    margin: 4mm;
  }

  /* Hide all outside elements in page when printing */
  :global(body *) {
    visibility: hidden !important;
  }

  /* Make receipt and its descendants visible */
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
    box-shadow: none !important;
    border: none !important;
    font-size: 11px !important;
  }

  .no-print,
  :global(.v-overlay__scrim),
  :global(.no-print) {
    display: none !important;
  }
}
</style>

