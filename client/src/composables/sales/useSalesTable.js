import { computed, ref } from 'vue';
import { apiRequest } from '../../api/client.js';
import { formatPaymentMethod, toPaymentMethodParam } from './useSalesFilters.js';

/**
 * Standard table column headers for the sales register history.
 */
export const SALES_TABLE_HEADERS = [
  { title: 'SALE', key: 'number', sortable: false },
  { title: 'CUSTOMER', key: 'customer', sortable: false },
  { title: 'DATE & TIME', key: 'createdAt', sortable: false },
  { title: 'STAFF', key: 'staff', sortable: false },
  { title: 'PAYMENT', key: 'payment', sortable: false },
  { title: 'TOTAL', key: 'total', align: 'end', sortable: false },
  { title: 'STATUS', key: 'status', sortable: false },
  { title: '', key: 'actions', sortable: false, align: 'end' },
];

/**
 * Composable managing paginated sales records, server-side data fetching, and revenue total calculations.
 *
 * @param {Object} options - Configuration parameters.
 * @param {import('vue').Ref<boolean>} options.apiMode - Boolean ref indicating API mode.
 * @param {Object} options.filters - Reactive filter object from useSalesFilters. * @returns {Object} Table reactive state, pagination controls, and loader function.
 */
export function useSalesTable({ apiMode, filters }) {
  /**
   * Paginated list of sales returned from live server.
   */
  const apiSales = ref([]);

  /**
   * Total number of matching sales records for pagination.
   */
  const apiTotal = ref(0);

  /**
   * Current active pagination page index (1-based).
   */
  const apiPage = ref(1);

  /**
   * Number of items displayed per page.
   */
  const pageSize = ref(8);

  /**
   * Network activity indicator for sales loading.
   */
  const loading = ref(false);

  /**
   * User-facing error message banner text.
   */
  const apiError = ref('');

  /**
   * Filtered rows displayed in the data table.
   * Binds server responses in API mode.
   */
  const visibleSales = computed(() => {
    return apiSales.value;
  });

  /**
   * Aggregated turnover value of completed sales in the currently active dataset.
   */
  const completedTotal = computed(() => {
    return apiSales.value
      .filter((sale) => sale.status === 'Completed')
      .reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  });

  /**
   * Loads paginated sales records matching current filters from the REST API.
   */
  async function loadSales() {
    

    const hasStart = Boolean(filters.fromDate.value);
    const hasEnd = Boolean(filters.toDate.value);
    const isChronologicallyInvalid = hasStart && hasEnd && filters.fromDate.value > filters.toDate.value;

    if (isChronologicallyInvalid) {
      apiError.value = 'The end date must not be before the start date.';
      apiSales.value = [];
      apiTotal.value = 0;
      loading.value = false;
      return;
    }

    const params = new URLSearchParams({
      page: String(apiPage.value),
      page_size: String(pageSize.value),
    });

    const searchKeyword = (filters.search.value || '').trim();
    if (searchKeyword) {
      params.set('q', searchKeyword);
    }

    if (filters.status.value !== 'All statuses') {
      params.set('status', filters.status.value.toLowerCase());
    }

    if (filters.payment.value !== 'All payments') {
      const mappedPayment = toPaymentMethodParam(filters.payment.value);
      if (mappedPayment) {
        params.set('payment_method', mappedPayment);
      }
    }

    if (filters.selectedUserId.value) {
      params.set('user_id', filters.selectedUserId.value);
    }

    if (filters.selectedCustomerId.value) {
      params.set('customer_id', filters.selectedCustomerId.value);
    }

    if (filters.fromDate.value) {
      params.set('from_date', filters.fromDate.value);
    }

    if (filters.toDate.value) {
      params.set('to_date', filters.toDate.value);
    }

    if (filters.minTotal.value !== '') {
      params.set('min_total', filters.minTotal.value);
    }

    if (filters.maxTotal.value !== '') {
      params.set('max_total', filters.maxTotal.value);
    }

    loading.value = true;
    try {
      const result = await apiRequest(`/sales?${params}`);
      apiTotal.value = result.total || 0;

      const rawItems = result.items || [];
      apiSales.value = rawItems.map((sale) => {
        const isVoided = sale.status === 'voided';
        const saleTotalCents = Number(sale.total || 0) * 100;

        return {
          id: sale.id,
          number: sale.saleNo,
          customer: sale.customerName,
          staff: sale.staffName,
          payment: formatPaymentMethod(sale.paymentMethod),
          total: saleTotalCents,
          status: isVoided ? 'Voided' : 'Completed',
          createdAt: sale.soldAt,
        };
      });

      apiError.value = '';
    } catch (error) {
      apiError.value = error.message;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Responds to data table pagination changes.
   *
   * @param {Object} options - Vuetify data table options.
   */
  function onTableOptions(options) {
    if (!apiMode.value) {
      return;
    }

    const nextPage = options.page || 1;
    const nextPageSize = options.itemsPerPage || pageSize.value;

    const isUnchanged =
      nextPage === apiPage.value &&
      nextPageSize === pageSize.value;

    if (isUnchanged) {
      return;
    }

    apiPage.value = nextPage;
    pageSize.value = nextPageSize;
    loadSales();
  }

  return {
    apiSales,
    apiTotal,
    apiPage,
    pageSize,
    loading,
    apiError,
    visibleSales,
    completedTotal,
    headers: SALES_TABLE_HEADERS,
    loadSales,
    onTableOptions,
  };
}

