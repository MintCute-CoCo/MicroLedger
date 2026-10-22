import { ref } from 'vue';
import { apiRequest } from '../../api/client.js';
import { formatPaymentMethod } from './useSalesFilters.js';

/**
 * Composable managing transaction detail modal display, receipt line items,
 * and administrative transaction voiding operations.
 *
 * @param {Object} options - Configuration options.
 * @param {import('vue').Ref<boolean>} options.apiMode - Indicates if running live API mode.
 * @param {Function} options.onVoidSuccess - Callback invoked after a sale is voided to refresh records.
 * @returns {Object} Selected sale reactive state and action handlers.
 */
export function useSaleDetail({ apiMode, onVoidSuccess }) {
  /**
   * Currently inspected sale object including line items.
   */
  const selectedSale = ref(null);

  /**
   * Transaction detail modal visibility flag.
   */
  const detailOpen = ref(false);

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

    if (!apiMode.value) {
      return;
    }

    try {
      const sale = await apiRequest(`/sales/${item.id}`);

      const rawLineItems = sale.items || [];
      const formattedItems = rawLineItems.map((line) => {
        const lineTotalCents = Number(line.lineTotal || 0) * 100;
        const unitPriceCents = Number(line.unitPrice || 0) * 100;

        return {
          ...line,
          lineTotal: lineTotalCents,
          unitPrice: unitPriceCents,
        };
      });

      const isVoided = sale.status === 'voided';
      const saleTotalCents = Number(sale.total || 0) * 100;

      selectedSale.value = {
        ...item,
        customer: sale.customerName,
        staff: sale.staffName,
        payment: formatPaymentMethod(sale.paymentMethod),
        total: saleTotalCents,
        status: isVoided ? 'Voided' : 'Completed',
        createdAt: sale.soldAt,
        items: formattedItems,
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
    voidReason,
    detailError,
    showSale,
    voidSelectedSale,
  };
}

