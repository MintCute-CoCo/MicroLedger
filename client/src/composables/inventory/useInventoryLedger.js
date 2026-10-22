import { computed, ref } from 'vue';

/**
 * Standard table column headers for the inventory movements ledger.
 */
export const INVENTORY_LEDGER_HEADERS = [
  { title: 'TIME', key: 'time', sortable: false },
  { title: 'PRODUCT', key: 'product', sortable: false },
  { title: 'TYPE', key: 'type', sortable: false },
  { title: 'CHANGE', key: 'change', align: 'end', sortable: false },
  { title: 'BALANCE AFTER', key: 'balance', align: 'end', sortable: false },
  { title: 'USER', key: 'user', sortable: false },
  { title: 'REASON / NOTE', key: 'reason', sortable: false },
];

/**
 * Formats a raw database movement type to user-friendly label.
 *
 * @param {string} type - Raw movement type string.
 * @returns {string} Human-readable type string.
 */
export function displayType(type) {
  const typeMap = {
    stock_in: 'Stock in',
    opening: 'Opening stock',
    adjustment: 'Adjustment',
    sale: 'Sale',
    void_reversal: 'Void reversal',
  };
  return typeMap[type] || type;
}

/**
 * Composable managing the immutable stock movement audit ledger,
 * movement type filtering, date boundaries, and pagination.
 *
 * @param {Object} options - Configuration options. * @param {import('vue').Ref<string>} options.search - Keyword search ref from stock composable. * @returns {Object} Movements ledger reactive state and methods.
 */
export function useInventoryLedger({ search } = {}) {
  /**
   * Movement type filter ('all', 'stock_in', 'adjustment', 'sale', 'void_reversal').
   */
  const movementType = ref('all');

  /**
   * Date range start boundary (YYYY-MM-DD).
   */
  const movementFrom = ref('');

  /**
   * Date range end boundary (YYYY-MM-DD).
   */
  const movementTo = ref('');

  /**
   * List of movement ledger records from the API.
   */
  const apiMovements = ref([]);

  /**
   * Total number of movement ledger rows.
   */
  const movementTotal = ref(0);

  /**
   * Current pagination page number for movements ledger (1-based).
   */
  const movementPage = ref(1);

  /**
   * Number of items per ledger page.
   */
  const movementPageSize = ref(5);

  /**
   * Visible stock movements ledger rows.
   * Visible stock movements ledger rows from API.
   */
  const visibleMovements = computed(() => {
    return apiMovements.value;
  });

  return {
    movementType,
    movementFrom,
    movementTo,
    apiMovements,
    movementTotal,
    movementPage,
    movementPageSize,
    visibleMovements,
    headers: INVENTORY_LEDGER_HEADERS,
    displayType,
  };
}

