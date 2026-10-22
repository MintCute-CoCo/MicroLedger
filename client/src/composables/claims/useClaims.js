import { computed, onMounted, ref } from 'vue';
import { apiRequest } from '../../api/client.js';
import { useAuthStore } from '../../stores/auth.js';
import {
  useClaimsTable,
  useClaimsFilters,
  useClaimForm,
  useClaimTransitions,
  useClaimDetail,
  useClaimsExport,
  CLAIM_STATUS_CHOICES,
  CLAIM_TABLE_HEADERS,
} from './index.js';

/**
 * Top-level Claims Composable aggregating specialized sub-composables:
 * - `useClaimsTable`: Paginated claim rows and data table controls.
 * - `useClaimsFilters`: Status, supplier, overdue, date, and customer phone filters.
 * - `useClaimForm`: Create claim dialog, warranty autocomplete, customer matching.
 * - `useClaimTransitions`: Status progression state machine and confirmations.
 * - `useClaimDetail`: Claim timeline history modal dialog.
 * - `useClaimsExport`: Excel claim report generation.
 *
 * Designed for university FYP evaluation following strict separation of concerns.
 *
 * @returns {Object} Unified warranty claims state and handler methods.
 */
export function useClaims() {
  const auth = useAuthStore();
  const isAdmin = computed(() => auth.user?.role === 'admin');
  const tableError = ref('');

  /**
   * Table sub-composable.
   */
  const table = useClaimsTable({
    onPageChange: () => {
      load();
    },
  });

  /**
   * Counts active cases on the currently displayed page.
   *
   * @returns {number} Number of rows that are not in a final status.
   */
  function countActiveCases() {
    const finalStatuses = ['Completed', 'Rejected', 'Cancelled'];
    const activeRows = table.rows.value.filter((claim) => {
      return !finalStatuses.includes(claim.status);
    });

    return activeRows.length;
  }

  const activeCount = computed(countActiveCases);

  /**
   * Filters sub-composable.
   */
  const filtersState = useClaimsFilters({
    onFilterChange: () => {
      table.page.value = 1;
      load();
    },
  });

  /**
   * Form sub-composable.
   */
  const claimForm = useClaimForm({
    isAdmin,
    onClaimCreated: async () => {
      table.page.value = 1;
      await load();
    },
  });

  /**
   * Status transitions sub-composable.
   */
  const transitions = useClaimTransitions({
    isAdmin,
    onTransitionSuccess: async (claim) => {
      await load();
      if (detail.detailOpen.value) {
        await detail.showDetail(claim);
      }
    },
  });

  /**
   * Detail history sub-composable.
   */
  const detail = useClaimDetail();

  /**
   * Exporter sub-composable.
   */
  const exporter = useClaimsExport({
    filters: filtersState.filters,
  });

  /**
   * Fetches paginated claim records from API matching current filters.
   */
  async function load() {
    table.busy.value = true;
    tableError.value = '';

    try {
      const query = new URLSearchParams({
        page: String(table.page.value),
        page_size: String(table.pageSize.value),
      });

      if (filtersState.filters.status !== 'all') {
        query.set('status', filtersState.filters.status);
      }
      if (filtersState.filters.supplierId) {
        query.set('supplier_id', filtersState.filters.supplierId);
      }
      if (filtersState.filters.overdue) {
        query.set('overdue', 'true');
      }
      if (filtersState.filters.from) {
        query.set('from', filtersState.filters.from);
      }
      if (filtersState.filters.to) {
        query.set('to', filtersState.filters.to);
      }

      const trimmedPhone = (filtersState.filters.phone || '').trim();
      if (trimmedPhone) {
        query.set('phone', trimmedPhone);
      }

      const result = await apiRequest(`/claims?${query}`);
      table.rows.value = result.items || [];
      table.total.value = result.total || 0;
    } catch (requestError) {
      tableError.value = requestError.message;
    } finally {
      table.busy.value = false;
    }
  }

  /**
   * Combined error message from table, form, transitions, detail, or export.
   */
  const error = computed(() => {
    return (
      tableError.value ||
      claimForm.formError.value ||
      transitions.transitionError.value ||
      detail.detailError.value ||
      exporter.exportError.value ||
      ''
    );
  });

  /**
   * Combined field-level errors.
   */
  const fieldErrors = computed(() => {
    return {
      ...claimForm.fieldErrors.value,
      ...transitions.fieldErrors.value,
    };
  });

  onMounted(async () => {
    load();
    try {
      const suppliersPromise = apiRequest('/suppliers').then((result) => {
        filtersState.suppliers.value = result.items || [];
      });

      await Promise.all([
        claimForm.loadWarrantyOptions(),
        claimForm.loadCustomerOptions(),
        suppliersPromise,
      ]);
    } catch (requestError) {
      // Retain defaults if offline
    }
  });

  return {
    auth,
    isAdmin,

    // Table state & methods
    rows: table.rows,
    activeCount,
    total: table.total,
    page: table.page,
    pageSize: table.pageSize,
    busy: table.busy,
    headers: table.headers,
    onTableOptions: table.onTableOptions,
    load,

    // Filters state
    filters: filtersState.filters,
    suppliers: filtersState.suppliers,
    statuses: CLAIM_STATUS_CHOICES,

    // Form state & methods
    createOpen: claimForm.createOpen,
    form: claimForm.form,
    warrantySearch: claimForm.warrantySearch,
    customerSearch: claimForm.customerSearch,
    warranties: claimForm.warranties,
    customers: claimForm.customers,
    selectedWarranty: claimForm.selectedWarranty,
    warrantyOptions: claimForm.warrantyOptions,
    customerOptions: claimForm.customerOptions,
    selectedWarrantyItem: claimForm.selectedWarrantyItem,
    selectedCustomerItem: claimForm.selectedCustomerItem,
    openCreateClaim: claimForm.openCreateClaim,
    create: claimForm.create,
    loadWarrantyOptions: claimForm.loadWarrantyOptions,
    loadCustomerOptions: claimForm.loadCustomerOptions,

    // Transitions state & methods
    transitionOpen: transitions.transitionOpen,
    finalConfirmOpen: transitions.finalConfirmOpen,
    change: transitions.change,
    availableTransitions: transitions.availableTransitions,
    startTransition: transitions.startTransition,
    transition: transitions.transition,
    requestTransition: transitions.requestTransition,

    // Detail state & methods
    detailOpen: detail.detailOpen,
    detail: detail.detail,
    selected: detail.selected,
    detailBusy: detail.detailBusy,
    showDetail: detail.showDetail,

    // Export methods
    exportFilteredClaims: exporter.exportFilteredClaims,

    // Unified errors
    error,
    fieldErrors,
  };
}

