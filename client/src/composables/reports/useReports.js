import { computed, onMounted, ref } from 'vue';
import { apiRequest } from '../../api/client.js';
import { useAuthStore } from '../../stores/auth.js';
import {
  useReportsFilters,
  useSalesReport,
  useInventoryReport,
  useWarrantyReport,
  useReportsExport,
  REPORT_TYPE_OPTIONS,
  SALES_GROUPING_OPTIONS,
  EXPORT_DATA_OPTIONS,
  EXPORT_FORMAT_OPTIONS,
  VOIDED_SALES_HEADERS,
  STOCK_MOVEMENTS_HEADERS,
  WARRANTY_STATUS_HEADERS,
  OVERDUE_CLAIMS_HEADERS,
  CLAIMS_BY_SUPPLIER_HEADERS,
  toCents,
} from './index.js';

/**
 * Top-level Reports Composable aggregating specialized sub-composables:
 * - `useReportsFilters`: Report type, date bounds, and sales grouping dimensions.
 * - `useSalesReport`: Dynamic sales table headers, totals accumulation, voided list.
 * - `useInventoryReport`: Snapshot headers with admin cost visibility and movements.
 * - `useWarrantyReport`: Claims matrices, overdue list, and supplier breakdowns.
 * - `useReportsExport`: Bulk dataset downloads in Excel (.xlsx) and CSV formats.
 *
 * Implements strict separation of concerns for university FYP evaluation.
 *
 * @returns {Object} Unified analytics and reporting state and handler methods.
 */
export function useReports() {
  const auth = useAuthStore();
  const user = computed(() => auth.user);

  /**
   * Report dataset returned from server.
   */
  const reportData = ref(null);
  const loading = ref(false);
  const reportFetchError = ref('');

  /**
   * Filters sub-composable.
   */
  const filters = useReportsFilters();

  /**
   * Sales report sub-composable.
   */
  const sales = useSalesReport({
    group: filters.group,
    reportData,
  });

  /**
   * Inventory report sub-composable.
   */
  const inventory = useInventoryReport({
    user,
  });

  /**
   * Warranty report sub-composable.
   */
  const warranty = useWarrantyReport();

  /**
   * Export sub-composable.
   */
  const exporter = useReportsExport({
    dateQuery: filters.dateQuery,
    from: filters.from,
    to: filters.to,
    group: filters.group,
  });

  /**
   * Fetches the selected report dataset from the backend API.
   */
  async function loadReport() {
    loading.value = true;
    reportFetchError.value = '';
    reportData.value = null;

    try {
      let query;
      if (filters.reportType.value === 'warranty') {
        query = new URLSearchParams();
      } else {
        query = filters.dateQuery();
      }

      if (filters.reportType.value === 'sales') {
        query.set('group', filters.group.value);
      }

      const queryString = query.size ? `?${query}` : '';
      reportData.value = await apiRequest(`/reports/${filters.reportType.value}${queryString}`);
    } catch (requestError) {
      reportFetchError.value = requestError.message;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Combined error message from fetching or exporting.
   */
  const error = computed(() => {
    return reportFetchError.value || exporter.error.value || '';
  });

  /**
   * Combined busy status indicator.
   */
  const busy = computed(() => {
    return loading.value || exporter.busy.value;
  });

  onMounted(() => {
    // Staff role defaults directly to warranty overview
    if (auth.user?.role === 'staff') {
      filters.reportType.value = 'warranty';
      loadReport();
    }
  });

  return {
    auth,
    reportData,
    error,
    busy,
    loadReport,

    // Filters state
    reportType: filters.reportType,
    group: filters.group,
    from: filters.from,
    to: filters.to,
    reportTypeOptions: REPORT_TYPE_OPTIONS,
    salesGroupingOptions: SALES_GROUPING_OPTIONS,

    // Sales report state
    salesHeaders: sales.salesHeaders,
    salesTotals: sales.salesTotals,
    voidedSalesHeaders: VOIDED_SALES_HEADERS,
    toCents,

    // Inventory report state
    inventoryHeaders: inventory.inventoryHeaders,
    stockMovementsHeaders: STOCK_MOVEMENTS_HEADERS,

    // Warranty report state
    warrantyStatusHeaders: WARRANTY_STATUS_HEADERS,
    overdueClaimsHeaders: OVERDUE_CLAIMS_HEADERS,
    claimsBySupplierHeaders: CLAIMS_BY_SUPPLIER_HEADERS,

    // Export state & methods
    type: exporter.type,
    format: exporter.format,
    exportDataOptions: EXPORT_DATA_OPTIONS,
    exportFormatOptions: EXPORT_FORMAT_OPTIONS,
    download: exporter.download,
  };
}

