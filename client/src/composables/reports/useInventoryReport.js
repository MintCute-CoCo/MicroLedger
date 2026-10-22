import { computed } from 'vue';

/**
 * Table headers for stock movements ledger.
 */
export const STOCK_MOVEMENTS_HEADERS = [
  { title: 'DATE', key: 'created_at' },
  { title: 'SKU', key: 'sku' },
  { title: 'PRODUCT', key: 'name' },
  { title: 'TYPE', key: 'type' },
  { title: 'CHANGE', key: 'quantity_change', align: 'end' },
  { title: 'BALANCE', key: 'balance_after', align: 'end' },
  { title: 'STAFF', key: 'user' },
  { title: 'NOTE', key: 'reason' },
];

/**
 * Composable providing table headers and cost visibility logic for inventory reports.
 *
 * @param {Object} options - Configuration options.
 * @param {import('vue').Ref<Object|null>} options.user - Active user ref.
 * @returns {Object} Inventory report column headers.
 */
export function useInventoryReport({ user }) {
  /**
   * Dynamic headers for inventory snapshot table (includes cost for admin).
   */
  const inventoryHeaders = computed(() => {
    const baseHeaders = [
      { title: 'SKU', key: 'sku' },
      { title: 'PRODUCT', key: 'name' },
      { title: 'CATEGORY', key: 'category' },
      { title: 'ON HAND', key: 'stock_qty', align: 'end' },
      { title: 'REORDER AT', key: 'reorder_level', align: 'end' },
    ];

    if (user.value?.role === 'admin') {
      baseHeaders.push({ title: 'COST', key: 'cost_price', align: 'end' });
    }

    return baseHeaders;
  });

  return {
    inventoryHeaders,
    stockMovementsHeaders: STOCK_MOVEMENTS_HEADERS,
  };
}

