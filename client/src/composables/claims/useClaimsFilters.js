import { onBeforeUnmount, reactive, ref, watch } from 'vue';

/**
 * Standard list of claim lifecycle statuses.
 */
export const CLAIM_STATUS_CHOICES = [
  'Submitted',
  'With Supplier',
  'Returned',
  'Ready for Customer',
  'Completed',
  'Rejected',
  'Cancelled',
];

/**
 * Composable managing warranty claims search filters (status, supplier, overdue, date range, customer phone).
 *
 * @param {Object} options - Configuration options.
 * @param {Function} options.onFilterChange - Callback invoked when filter criteria change.
 * @returns {Object} Reactive filters and supplier reference list.
 */
export function useClaimsFilters({ onFilterChange }) {
  /**
   * Filter criteria state.
   */
  const filters = reactive({
    status: 'all',
    supplierId: null,
    overdue: false,
    from: '',
    to: '',
    phone: '',
  });

  /**
   * Supplier reference collection for supplier filter dropdown.
   */
  const suppliers = ref([]);

  /**
   * Debounce timer for query updates.
   */
  let filterTimer = null;

  watch(filters, () => {
    if (filterTimer) {
      clearTimeout(filterTimer);
    }

    filterTimer = setTimeout(() => {
      if (typeof onFilterChange === 'function') {
        onFilterChange();
      }
    }, 250);
  });

  onBeforeUnmount(() => {
    if (filterTimer) {
      clearTimeout(filterTimer);
    }
  });

  return {
    filters,
    suppliers,
    statuses: CLAIM_STATUS_CHOICES,
  };
}

