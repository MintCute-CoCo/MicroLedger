import { ref } from 'vue';
import { apiDownload } from '../../api/client.js';

/**
 * Composable providing Excel file generation and export for filtered claims.
 *
 * @param {Object} options - Configuration options.
 * @param {Object} options.filters - Reactive claims filters.
 * @returns {Object} Export state and trigger function.
 */
export function useClaimsExport({ filters }) {
  /**
   * Export error message ref.
   */
  const exportError = ref('');

  /**
   * Downloads an Excel file of currently filtered claims.
   */
  async function exportFilteredClaims() {
    const query = new URLSearchParams({ format: 'xlsx' });

    if (filters.status !== 'all') {
      query.set('status', filters.status);
    }
    if (filters.supplierId) {
      query.set('supplier_id', filters.supplierId);
    }
    if (filters.overdue) {
      query.set('overdue', 'true');
    }
    if (filters.from) {
      query.set('from_date', filters.from);
    }
    if (filters.to) {
      query.set('to_date', filters.to);
    }

    const trimmedPhone = (filters.phone || '').trim();
    if (trimmedPhone) {
      query.set('phone', trimmedPhone);
    }

    exportError.value = '';

    try {
      await apiDownload(`/exports/claims?${query}`, 'claims.xlsx');
    } catch (requestError) {
      exportError.value = requestError.message;
    }
  }

  return {
    exportError,
    exportFilteredClaims,
  };
}

