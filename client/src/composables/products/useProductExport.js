import { ref } from 'vue';
import { apiDownload } from '../../api/client.js';

/**
 * Composable providing Excel file generation and export for filtered products.
 *
 * @param {Object} options - Configuration options.
 * @param {Object} options.filters - Reactive product filters.
 * @returns {Object} Export state and trigger function.
 */
export function useProductExport({ filters }) {
  /**
   * Export error message ref.
   */
  const exportError = ref('');

  /**
   * Triggers an Excel (.xlsx) file export of the currently filtered products.
   */
  async function exportFilteredProducts() {
    const queryParams = new URLSearchParams({
      format: 'xlsx',
      status: filters.statusFilter.value,
    });

    const searchKeyword = (filters.search.value || '').trim();
    if (searchKeyword) {
      queryParams.set('q', searchKeyword);
    }

    if (filters.category.value !== 'all') {
      queryParams.set('category_id', filters.category.value);
    }

    if (filters.lowStockOnly.value) {
      queryParams.set('low_stock', 'true');
    }

    if (filters.minStock.value !== '') {
      queryParams.set('min_stock', filters.minStock.value);
    }

    if (filters.maxStock.value !== '') {
      queryParams.set('max_stock', filters.maxStock.value);
    }

    if (filters.minPrice.value !== '') {
      queryParams.set('min_price', filters.minPrice.value);
    }

    if (filters.maxPrice.value !== '') {
      queryParams.set('max_price', filters.maxPrice.value);
    }

    exportError.value = '';

    try {
      await apiDownload(`/exports/products?${queryParams}`, 'products.xlsx');
    } catch (requestError) {
      exportError.value = requestError.message;
    }
  }

  return {
    exportError,
    exportFilteredProducts,
  };
}

