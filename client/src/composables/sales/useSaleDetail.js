import { ref } from 'vue';
import { apiRequest } from '../../api/client.js';
import { formatPaymentMethod } from './useSalesFilters.js';

/**
 * Composable managing transaction detail modal display, receipt line items,
 * and administrative transaction voiding operations.
 *
 * @param {Object} options - Configuration options.
 * @param {Function} options.onVoidSuccess - Callback invoked after a sale is voided to refresh records.
 * @returns {Object} Selected sale reactive state and action handlers.
 */
export function useSaleDetail({ onVoidSuccess }) {
  /**
   * Currently inspected sale object including line items.
   */
  const selectedSale = ref(null);

  /**
   * Transaction detail modal visibility flag.
   */
  const detailOpen = ref(false);

  /**
   * Printable receipt dialog visibility flag.
   */
  const receiptDialogOpen = ref(false);

  function openReceipt() {
    receiptDialogOpen.value = true;
  }

  function closeReceipt() {
    receiptDialogOpen.value = false;
  }

  /**
   * Admin-provided justification note required when voiding a sale.
   */
  const voidReason = ref('');

  /**
   * Error message encountered during detail loading or voiding.
   */
  const detailError = ref('');

  /**
   * Opens modal dialog displaying full invoice details for a sale.
   *
   * @param {Object} item - Summary row of target sale.
   */
  async function showSale(item) {
    selectedSale.value = item;
    detailOpen.value = true;
    voidReason.value = '';
    detailError.value = '';

    try {
      const sale = await apiRequest(`/sales/${item.id}`);

      const rawLineItems = sale.items || [];
      const formattedItems = rawLineItems.map((line) => {
        const rawLineTotal = line.lineTotal ?? line.totalPrice ?? 0;
        const rawUnitPrice = line.unitPrice ?? line.price ?? 0;
        const lineTotalCents = Math.round(Number(rawLineTotal) * 100);
        const unitPriceCents = Math.round(Number(rawUnitPrice) * 100);

        return {
          ...line,
          name: line.name || line.productName || 'Hardware SKU',
          lineTotal: lineTotalCents,
          unitPrice: unitPriceCents,
          _isCents: true,
        };
      });

      const isVoided = sale.status === 'voided';
      const rawSubtotal = sale.subtotal ?? sale.total ?? 0;
      const rawDiscount = sale.discountAmount ?? 0;
      const rawTotal = sale.total ?? 0;

      const subtotalCents = Math.round(Number(rawSubtotal) * 100);
      const discountCents = Math.round(Number(rawDiscount) * 100);
      const saleTotalCents = Math.round(Number(rawTotal) * 100);

      selectedSale.value = {
        ...item,
        id: sale.id || item.id,
        saleNo: sale.saleNo || item.number,
        number: sale.saleNo || item.number,
        customer: sale.customerName || item.customer,
        customerName: sale.customerName || item.customer,
        customerPhone: sale.customerPhone || item.customerPhone || '',
        staff: sale.staffName || item.staff,
        staffName: sale.staffName || item.staff,
        payment: formatPaymentMethod(sale.paymentMethod),
        paymentMethod: sale.paymentMethod,
        subtotal: subtotalCents,
        discountAmount: discountCents,
        total: saleTotalCents,
        status: isVoided ? 'Voided' : 'Completed',
        createdAt: sale.soldAt || item.createdAt,
        soldAt: sale.soldAt || item.createdAt,
        items: formattedItems,
        _isCents: true,
      };
    } catch (error) {
      detailError.value = error.message;
    }
  }

  /**
   * Voids the selected sale transaction and restores associated product inventory stock.
   * Prompts the administrator for confirmation before initiating the immutable reversal.
   */
  async function voidSelectedSale() {
    if (!selectedSale.value) {
      return;
    }

    const trimmedReason = voidReason.value.trim();
    if (!trimmedReason) {
      return;
    }

    const saleNumber = selectedSale.value.number;
    const confirmationText = `Void sale ${saleNumber} and restore its stock? This cannot be undone.`;
    const userConfirmed = window.confirm(confirmationText);

    if (!userConfirmed) {
      return;
    }

    try {
      await apiRequest(`/sales/${selectedSale.value.id}/void`, {
        method: 'POST',
        body: {
          reason: trimmedReason,
        },
      });

      if (typeof onVoidSuccess === 'function') {
        await onVoidSuccess();
      }

      await showSale(selectedSale.value);
    } catch (error) {
      detailError.value = error.message;
    }
  }

  return {
    selectedSale,
    detailOpen,
    receiptDialogOpen,
    openReceipt,
    closeReceipt,
    voidReason,
    detailError,
    showSale,
    voidSelectedSale,
  };
}

