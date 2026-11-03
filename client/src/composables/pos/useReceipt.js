import { computed } from 'vue';

/**
 * Normalizes an amount into integer cents for formatMoney(cents).
 * Handles strings from REST API ("69.99", "14890000.00"), numeric values (69.99),
 * and integer cents passed from client store/composable state (6999).
 *
 * @param {string|number|null|undefined} val - Input monetary amount.
 * @param {boolean} [isAlreadyCents=false] - Whether value is already in cents.
 * @returns {number} Normalized integer cents.
 */
function parseToCents(val, isAlreadyCents = false) {
  if (val === undefined || val === null || val === '') {
    return 0;
  }

  // 1. Explicitly flagged as cents
  if (isAlreadyCents) {
    return Math.round(Number(val) || 0);
  }

  // 2. Numeric input
  if (typeof val === 'number') {
    // Float with decimal places (e.g. 69.99) -> convert to cents
    if (!Number.isInteger(val)) {
      return Math.round(val * 100);
    }
    // Integer number in client state
    return val;
  }

  // 3. String inputs from PostgreSQL NUMERIC(12,2)
  const num = Number(val);
  if (Number.isNaN(num)) {
    return 0;
  }
  return Math.round(num * 100);
}

/**
 * Composable providing normalized receipt data and printing handlers for a sale.
 *
 * @param {import('vue').Ref<Object|null>|Object|null} saleRef - Sale record or ref.
 * @returns {Object} Normalized receipt data and print execution handler.
 */
export function useReceipt(saleRef) {
  const receiptData = computed(() => {
    const raw = typeof saleRef?.value !== 'undefined' ? saleRef.value : saleRef;
    if (!raw) {
      return null;
    }

    const saleNo = raw.saleNo || raw.number || 'S-000000';
    const dateVal = raw.soldAt || raw.createdAt || new Date().toISOString();
    const cashier = raw.staffName || raw.staff || 'Cashier';
    const customer = raw.customerName || raw.customer || 'Walk-in Customer';
    const phone = raw.customerPhone || '';
    const payment = raw.paymentMethod || raw.payment || 'Card';

    const isGlobalCents = Boolean(raw._isCents);
    const totalCents = parseToCents(raw.total, isGlobalCents);
    const subtotalCents = parseToCents(raw.subtotal ?? raw.total, isGlobalCents);
    const discountCents = parseToCents(raw.discountAmount, isGlobalCents);

    const items = (raw.items || []).map((item, idx) => {
      const isItemCents = isGlobalCents || Boolean(item._isCents);
      const rawLineTotal = item.lineTotal ?? item.totalPrice ?? 0;
      const rawUnitPrice = item.unitPrice ?? item.price ?? 0;

      const itemTotal = parseToCents(rawLineTotal, isItemCents);
      const itemPrice = parseToCents(rawUnitPrice, isItemCents);

      let serials = [];
      if (Array.isArray(item.serialNumbers)) {
        serials = item.serialNumbers;
      } else if (typeof item.serialNumbers === 'string' && item.serialNumbers.trim()) {
        serials = item.serialNumbers.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
      }

      return {
        id: item.id || idx,
        name: item.name || item.productName || 'Product SKU',
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

  /**
   * Invokes the browser print dialog.
   */
  function handlePrint() {
    window.print();
  }

  return {
    receiptData,
    handlePrint,
  };
}
