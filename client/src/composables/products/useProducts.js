import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '../../stores/auth.js';
import {
  useProductsFilters,
  useProductsTable,
  useProductForm,
  useProductExport,
  categoryIcon,
  toCents,
  parsePriceInput,
} from './index.js';

/**
 * Top-level Products Composable aggregating specialized sub-composables:
 * - `useProductsFilters`: Multi-criteria search, categories, and price/stock filters.
 * - `useProductsTable`: Paginated catalogue records, sorting, and low-stock count.
 * - `useProductForm`: Create/edit modal dialog, validation, and status toggles.
 * - `useProductExport`: Excel report generation.
 *
 * Designed for university FYP evaluation following strict separation of concerns.
 *
 * @returns {Object} Unified product management state and handler methods.
 */
export function useProducts() {
  const auth = useAuthStore();
  const user = computed(() => auth.user);
  const apiCategories = ref([]);

  /**
   * Filters sub-composable.
   */
  const filters = useProductsFilters({
    apiCategories,
    onFilterChange: () => {
      table.apiPage.value = 1;
      table.loadRemoteProducts();
    },
  });

  /**
   * Table sub-composable.
   */
  const table = useProductsTable({
    filters,
    apiCategories,
  });

  /**
   * Form and mutations sub-composable.
   */
  const productForm = useProductForm({
    user,
    apiCategories,
    onSuccess: async () => {
      await table.loadRemoteProducts();
    },
  });

  /**
   * Exporter sub-composable.
   */
  const exporter = useProductExport({
    filters,
  });

  /**
   * Combined error message from table, form, or exporter.
   */
  const error = computed(() => {
    return (
      table.error.value ||
      productForm.formError.value ||
      exporter.exportError.value ||
      ''
    );
  });

  onMounted(() => {
    table.loadRemoteProducts();
  });

  return {
    canEdit: productForm.canEdit,

    // Filters
    search: filters.search,
    category: filters.category,
    statusFilter: filters.statusFilter,
    lowStockOnly: filters.lowStockOnly,
    minStock: filters.minStock,
    maxStock: filters.maxStock,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    advancedOpen: filters.advancedOpen,
    categories: filters.categories,
    statuses: filters.statuses,

    // Table
    apiCategories,
    apiProducts: table.apiProducts,
    apiTotal: table.apiTotal,
    apiPage: table.apiPage,
    pageSize: table.pageSize,
    apiSort: table.apiSort,
    apiDirection: table.apiDirection,
    loading: table.loading,
    error,
    visibleProducts: table.visibleProducts,
    productRows: table.productRows,
    productTotal: table.productTotal,
    lowStockCount: table.lowStockCount,
    headers: table.headers,
    categoryIcon,
    loadRemoteProducts: table.loadRemoteProducts,
    onTableOptions: table.onTableOptions,

    // Form & Modal
    createDialog: productForm.createDialog,
    editingProduct: productForm.editingProduct,
    saving: productForm.saving,
    fieldErrors: productForm.fieldErrors,
    draft: productForm.draft,
    activeCategoryOptions: productForm.activeCategoryOptions,
    productCategoryOptions: productForm.productCategoryOptions,
    openCreate: productForm.openCreate,
    openEdit: productForm.openEdit,
    toggleProductStatus: productForm.toggleProductStatus,
    saveProduct: productForm.saveProduct,

    // Export
    exportFilteredProducts: exporter.exportFilteredProducts,

    // Utility
    toCents,
    parsePriceInput,
  };
}

