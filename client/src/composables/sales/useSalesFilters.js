import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { apiRequest } from '../../api/client.js';

/**
 * Available transaction status filter choices.
 */
export const SALE_STATUS_OPTIONS = ['All statuses', 'Completed', 'Voided'];

/**
 * Available payment method filter choices.
 */
export const SALE_PAYMENT_OPTIONS = ['All payments', 'Cash', 'Card', 'Bank transfer'];

/**
 * Maps a database payment method key to a human-readable title.
 *
 * @param {string} method - Raw payment method key from database.
 * @returns {string} Human-friendly payment label.
 */
export function formatPaymentMethod(method) {
  const paymentMap = {
    cash: 'Cash',
    card: 'Card',
    bank_transfer: 'Bank transfer',
    other: 'Other',
  };
  return paymentMap[method] || method;
}

/**
 * Maps a human-readable payment filter label to the corresponding database query param.
 *
 * @param {string} label - UI payment label.
 * @returns {string|undefined} Database enum value.
 */
export function toPaymentMethodParam(label) {
  const reverseMap = {
    Cash: 'cash',
    Card: 'card',
    'Bank transfer': 'bank_transfer',
    Other: 'other',
  };
  return reverseMap[label];
}

/**
 * Composable managing search queries, date ranges, monetary bounds,
 * and reference options (staff members, customers) for sales filtering.
 *
 * @param {Object} options - Configuration options.
 * @param {import('vue').Ref<boolean>} options.apiMode - Indicates if running against live API.
 * @param {Function} options.onFilterChange - Callback invoked when filter inputs change.
 * @returns {Object} Reactive filter state and reference lists.
 */
export function useSalesFilters({ apiMode, onFilterChange }) {
  /**
   * Text search query matching receipt number, customer name, or staff member.
   */
  const search = ref('');

  /**
   * Transaction status selection ('All statuses', 'Completed', 'Voided').
   */
  const status = ref('All statuses');

  /**
   * Payment method selection ('All payments', 'Cash', 'Card', etc.).
   */
  const payment = ref('All payments');

  /**
   * Date range start boundary (YYYY-MM-DD).
   */
  const fromDate = ref('');

  /**
   * Date range end boundary (YYYY-MM-DD).
   */
  const toDate = ref('');

  /**
   * Minimum total transaction amount in dollars.
   */
  const minTotal = ref('');

  /**
   * Maximum total transaction amount in dollars.
   */
  const maxTotal = ref('');

  /**
   * Selected staff user identifier for filtering.
   */
  const selectedUserId = ref(null);

  /**
   * Selected customer identifier for filtering.
   */
  const selectedCustomerId = ref(null);

  /**
   * Staff user records available for filtering.
   */
  const users = ref([]);

  /**
   * Customer records available for filtering.
   */
  const customers = ref([]);

  /**
   * Autocomplete live query string for customer lookup.
   */
  const customerSearch = ref('');

  /**
   * Debounce timer for customer live lookup.
   */
  let customerTimer = null;

  /**
   * Debounce timer for multi-criteria filter updates.
   */
  let filterTimer = null;

  watch(
    [
      search,
      status,
      payment,
      fromDate,
      toDate,
      minTotal,
      maxTotal,
      selectedUserId,
      selectedCustomerId,
    ],
    () => {
      if (!apiMode.value) {
        return;
      }
      if (filterTimer) {
        clearTimeout(filterTimer);
      }
      filterTimer = setTimeout(() => {
        if (typeof onFilterChange === 'function') {
          onFilterChange();
        }
      }, 250);
    }
  );

  watch(customerSearch, (keyword) => {
    if (!apiMode.value) {
      return;
    }

    if (customerTimer) {
      clearTimeout(customerTimer);
    }

    customerTimer = setTimeout(async () => {
      try {
        const queryParams = new URLSearchParams({ page_size: '100' });
        const trimmed = keyword ? keyword.trim() : '';

        if (trimmed) {
          queryParams.set('q', trimmed);
        }

        const result = await apiRequest(`/customers?${queryParams}`);
        customers.value = result.items || [];
      } catch (error) {
        // Silently preserve previous results on lookup failure
      }
    }, 250);
  });

  /**
   * Fetches initial customer and staff reference options from backend API.
   */
  async function loadFilterReferences() {
    if (!apiMode.value) {
      return;
    }

    try {
      const [customerRes, userRes] = await Promise.all([
        apiRequest('/customers?page_size=100'),
        apiRequest('/sales/filter-users'),
      ]);

      customers.value = customerRes.items || [];
      users.value = userRes.items || [];
    } catch (error) {
      // Keep defaults if reference endpoints are unavailable
    }
  }

  onMounted(() => {
    loadFilterReferences();
  });

  onBeforeUnmount(() => {
    if (filterTimer) {
      clearTimeout(filterTimer);
    }
    if (customerTimer) {
      clearTimeout(customerTimer);
    }
  });

  return {
    search,
    status,
    payment,
    fromDate,
    toDate,
    minTotal,
    maxTotal,
    selectedUserId,
    selectedCustomerId,
    users,
    customers,
    customerOptions: customers,
    customerSearch,
    statuses: SALE_STATUS_OPTIONS,
    payments: SALE_PAYMENT_OPTIONS,
    formatPaymentMethod,
    toPaymentMethodParam,
    loadFilterReferences,
  };
}

