import { ref } from 'vue';
import { apiDownload } from '../../api/client.js';
import { toPaymentMethodParam } from './useSalesFilters.js';

/**
 * Composable providing Excel file generation and download for filtered sales records.
 *
 * @param {Object} options - Configuration parameters.
 * @param {Object} options.filters - Reactive sales filters.
 * @returns {Object} Export state and trigger function.
 */
export function useSalesExport({ filters }) {
  /**
   * Export error indicator message.
   */
  const exportError = ref('');

  /**
   * Export network in-flight indicator.
   */
  const exporting = ref(false);

  /**
   * Downloads an Excel spreadsheet of sales matching current filter criteria.
   * Requires a defined date range to protect server performance and bandwidth.
   */
  async function exportFilteredSales() {
    const hasStartDate = Boolean(filters.fromDate.value);
    const hasEndDate = Boolean(filters.toDate.value);

    if (!hasStartDate || !hasEndDate) {
      exportError.value = 'Choose a start and end date before exporting sales.';
      return;
    }

    const queryParams = new URLSearchParams({
      format: 'xlsx',
      from_date: filters.fromDate.value,
      to_date: filters.toDate.value,
    });

    const searchKeyword = (filters.search.value || '').trim();
    if (searchKeyword) {
      queryParams.set('q', searchKeyword);
    }

    if (filters.status.value !== 'All statuses') {
      queryParams.set('status', filters.status.value.toLowerCase());
    }

    if (filters.payment.value !== 'All payments') {
      const mappedPayment = toPaymentMethodParam(filters.payment.value);
      if (mappedPayment) {
        queryParams.set('payment_method', mappedPayment);
      }
    }

    if (filters.selectedUserId.value) {
      queryParams.set('user_id', filters.selectedUserId.value);
    }

    if (filters.selectedCustomerId.value) {
      queryParams.set('customer_id', filters.selectedCustomerId.value);
    }

    if (filters.minTotal.value !== '') {
      queryParams.set('min_total', filters.minTotal.value);
    }

    if (filters.maxTotal.value !== '') {
      queryParams.set('max_total', filters.maxTotal.value);
    }

    exporting.value = true;
    exportError.value = '';

    try {
      await apiDownload(`/exports/sales?${queryParams}`, 'sales.xlsx');
    } catch (requestError) {
      exportError.value = requestError.message;
    } finally {
      exporting.value = false;
    }
  }

  return {
    exportError,
    exporting,
    exportFilteredSales,
  };
}

