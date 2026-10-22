import { computed, onBeforeUnmount, ref, watch } from 'vue';

/**
 * Status filter choices for the product catalog toolbar.
 */
export const PRODUCT_STATUS_OPTIONS = [
  { title: 'All statuses', value: 'all' },
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' },
];

/**
 * Composable managing search, category filtering, status selection,
 * stock replenishment flags, and advanced numerical range filters.
 *
 * @param {Object} options - Configuration options.
 * @param {import('vue').Ref<Array>} options.apiCategories - Remote category list ref.
 * @param {Function} options.onFilterChange - Callback invoked when filter inputs change.
 * @returns {Object} Filter reactive state and dropdown options.
 */
export function useProductsFilters({ apiCategories, onFilterChange }) {
  /**
   * Text search query matching product name or SKU code.
   */
  const search = ref('');

  /**
   * Selected category filter ('All categories' or specific category ID).
   */
  const category = ref('All categories');

  /**
   * Selected lifecycle status filter ('all', 'active', 'inactive').
   */
  const statusFilter = ref('all');

  /**
   * Checkbox toggle for filtering low-stock products at or below reorder level.
   */
  const lowStockOnly = ref(false);

  /**
   * Minimum stock quantity range filter.
   */
  const minStock = ref('');

  /**
   * Maximum stock quantity range filter.
   */
  const maxStock = ref('');

  /**
   * Minimum selling price range filter in dollars.
   */
  const minPrice = ref('');

  /**
   * Maximum selling price range filter in dollars.
   */
  const maxPrice = ref('');

  /**
   * Advanced numerical filter drawer visibility flag.
   */
  const advancedOpen = ref(false);

  /**
   * Formatted category dropdown options for toolbar filter.
   */
  const categories = computed(() => {
    const remoteCategoryOptions = (apiCategories.value || []).map((cat) => {
      return {
        title: cat.name,
        value: cat.id,
      };
    });

    return [
      { title: 'All categories', value: 'all' },
      ...remoteCategoryOptions,
    ];
  });

  /**
   * Debounce timer for all filter changes.
   */
  let filterTimer = null;

  watch(
    [search, category, statusFilter, lowStockOnly, minStock, maxStock, minPrice, maxPrice],
    () => {
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

  onBeforeUnmount(() => {
    if (filterTimer) {
      clearTimeout(filterTimer);
    }
  });

  return {
    search,
    category,
    statusFilter,
    lowStockOnly,
    minStock,
    maxStock,
    minPrice,
    maxPrice,
    advancedOpen,
    categories,
    statuses: PRODUCT_STATUS_OPTIONS,
  };
}

