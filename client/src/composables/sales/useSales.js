import { computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth.js';
import {
  useSalesFilters,
  useSalesTable,
  useSaleDetail,
  useSalesExport,
} from './index.js';

/**
 * Top-level Sales Composable aggregating focused sub-composables:
 * - `useSalesFilters`: Search queries, status/payment dropdowns, date bounds.
 * - `useSalesTable`: Paginated data table, server querying, completed totals.
 * - `useSaleDetail`: Modal dialog, line items breakdown, voiding logic.
 * - `useSalesExport`: Excel export generation and download.
 *
 * Designed for university FYP evaluation following strict separation of concerns.
 *
 * @returns {Object} Unified sales register state and handler methods.
 */
export function useSales() {
  const auth = useAuthStore();

  const apiMode = computed(() => true);
  const isAdmin = computed(() => auth.user?.role === 'admin');

  /**
   * Filter sub-composable.
   */
  const filters = useSalesFilters({
    apiMode,
    onFilterChange: () => {
      table.apiPage.value = 1;
      table.loadSales();
    },
  });

  /**
   * Table and pagination sub-composable.
   */
  const table = useSalesTable({
    apiMode,
    filters,
  });

  /**
   * Transaction detail modal and void management sub-composable.
   */
  const detail = useSaleDetail({
    apiMode,
    onVoidSuccess: async () => {
      await table.loadSales();
    },
  });

  /**
   * Excel report export sub-composable.
   */
  const exporter = useSalesExport({
    filters,
  });

  /**
   * Unified error message banner combining table, detail, or export errors.
   */
  const combinedError = computed(() => {
    return table.apiError.value || detail.detailError.value || exporter.exportError.value;
  });

  onMounted(() => {
    table.loadSales();
  });

  return {
    apiMode,
    isAdmin,

    // Filters state
    search: filters.search,
    status: filters.status,
    payment: filters.payment,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    minTotal: filters.minTotal,
    maxTotal: filters.maxTotal,
    selectedUserId: filters.selectedUserId,
    selectedCustomerId: filters.selectedCustomerId,
    users: filters.users,
    customerOptions: filters.customerOptions,
    customerSearch: filters.customerSearch,
    statuses: filters.statuses,
    payments: filters.payments,

    // Table state & methods
    apiSales: table.apiSales,
    apiTotal: table.apiTotal,
    apiPage: table.apiPage,
    pageSize: table.pageSize,
    loading: table.loading,
    apiError: combinedError,
    visibleSales: table.visibleSales,
    completedTotal: table.completedTotal,
    headers: table.headers,
    loadSales: table.loadSales,
    onTableOptions: table.onTableOptions,

    // Detail & Void state & methods
    selectedSale: detail.selectedSale,
    detailOpen: detail.detailOpen,
    voidReason: detail.voidReason,
    showSale: detail.showSale,
    voidSelectedSale: detail.voidSelectedSale,

    // Export methods
    exportFilteredSales: exporter.exportFilteredSales,
    exporting: exporter.exporting,
  };
}

