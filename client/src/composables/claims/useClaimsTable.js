import { ref } from 'vue';

/**
 * Standard table column configuration for claims data view.
 */
export const CLAIM_TABLE_HEADERS = [
  { title: 'CLAIM', key: 'claim_no', sortable: false },
  { title: 'CUSTOMER', key: 'customer_name', sortable: false },
  { title: 'PRODUCT', key: 'product_name', sortable: false },
  { title: 'CLAIM DATE', key: 'claim_date', sortable: false },
  { title: 'SUPPLIER', key: 'supplier_name', sortable: false },
  { title: 'STATUS', key: 'status', sortable: false },
  { title: 'DUE', key: 'due', sortable: false },
  { title: '', key: 'actions', sortable: false },
];

/**
 * Composable managing claims pagination state and table options.
 *
 * @param {Object} options - Configuration options.
 * @param {Function} options.onPageChange - Callback invoked when page or itemsPerPage changes.
 * @returns {Object} Table reactive state and options handler.
 */
export function useClaimsTable({ onPageChange }) {
  /**
   * Paginated claim records.
   */
  const rows = ref([]);

  /**
   * Total number of claims matching active filters.
   */
  const total = ref(0);

  /**
   * Current active pagination page index (1-based).
   */
  const page = ref(1);

  /**
   * Number of items per table page.
   */
  const pageSize = ref(10);

  /**
   * Data loading network indicator.
   */
  const busy = ref(false);

  /**
   * Handles table pagination and items-per-page changes.
   *
   * @param {Object} options - Vuetify data table options.
   */
  function onTableOptions(options) {
    const nextPage = options.page || 1;
    const nextPageSize = options.itemsPerPage || pageSize.value;

    const isUnchanged =
      nextPage === page.value &&
      nextPageSize === pageSize.value;

    if (isUnchanged) {
      return;
    }

    page.value = nextPage;
    pageSize.value = nextPageSize;

    if (typeof onPageChange === 'function') {
      onPageChange();
    }
  }

  return {
    rows,
    total,
    page,
    pageSize,
    busy,
    headers: CLAIM_TABLE_HEADERS,
    onTableOptions,
  };
}

