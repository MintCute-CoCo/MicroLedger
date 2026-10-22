import { computed, ref } from 'vue';

/**
 * Standard table column headers for the current stock balance catalog.
 */
export const INVENTORY_STOCK_HEADERS = [
  { title: 'PRODUCT', key: 'name', sortable: false },
  { title: 'SKU', key: 'sku', sortable: false },
  { title: 'CATEGORY', key: 'category', sortable: false },
  { title: 'IN STOCK', key: 'stock', align: 'end', sortable: false },
  { title: 'STATUS', key: 'status', sortable: false },
  { title: '', key: 'actions', sortable: false, align: 'end' },
];

/**
 * Composable managing inventory stock balances, search, low-stock filtering,
 * category filtering, and pagination.
 *
 * @param {Object} options - Configuration options. * @returns {Object} Stock catalog reactive state and methods.
 */
export function useInventoryStock() {
  /**
   * Search keyword for stock products.
   */
  const search = ref('');

  /**
   * Category filter selection ('all' or specific category ID/name).
   */
  const categoryFilter = ref('all');

  /**
   * Checkbox toggle to filter only products at or below their reorder threshold.
   */
  const lowStockOnly = ref(false);

  /**
   * List of products returned by the API for stock balance view.
   */
  const apiProducts = ref([]);

  /**
   * Total number of product records in the inventory table.
   */
  const inventoryTotal = ref(0);

  /**
   * Current pagination page number (1-based).
   */
  const inventoryPage = ref(1);

  /**
   * Number of items displayed per page.
   */
  const inventoryPageSize = ref(7);

  /**
   * Aggregate metrics returned by the API (total units, total items, low stock alerts).
   */
  const apiMetrics = ref({
    totalUnits: 0,
    total: 0,
    lowStockCount: 0,
  });

  /**
   * Total number of low-stock items requiring replenishment.
   */
  const lowStockCount = computed(() => {
    return apiMetrics.value.lowStockCount || 0;
  });

  /**
   * Filtered product stock levels displayed in the table.
   */
  const visibleProducts = computed(() => {
    return apiProducts.value;
  });

  return {
    search,
    categoryFilter,
    lowStockOnly,
    apiProducts,
    inventoryTotal,
    inventoryPage,
    inventoryPageSize,
    apiMetrics,
    lowStockCount,
    visibleProducts,
    headers: INVENTORY_STOCK_HEADERS,
  };
}

