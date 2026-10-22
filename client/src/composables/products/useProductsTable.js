import { computed, ref } from 'vue';
import { apiRequest } from '../../api/client.js';

/**
 * Visual badge and card accent color palette for products.
 */
export const PRODUCT_TONE_COLORS = ['sun', 'rose', 'blue', 'mint', 'lilac', 'sand'];

/**
 * Mapping of lowercase category keywords to Material Design Icons.
 */
export const PRODUCT_CATEGORY_ICON_MAP = {
  lighting: 'mdi-lamp-outline',
  electrical: 'mdi-lightning-bolt-outline',
  hardware: 'mdi-hammer-wrench',
  'home & living': 'mdi-home-outline',
  electronics: 'mdi-cellphone',
  accessories: 'mdi-watch',
  tools: 'mdi-tools',
  furniture: 'mdi-sofa-outline',
  appliances: 'mdi-fridge-outline',
  clothing: 'mdi-tshirt-crew-outline',
  food: 'mdi-food-apple-outline',
  sports: 'mdi-basketball',
};

/**
 * Resolves contextual Material Design icon for a product category name.
 *
 * @param {string} categoryName - Category title.
 * @returns {string} MDI icon identifier.
 */
export function categoryIcon(categoryName) {
  if (!categoryName) {
    return 'mdi-package-variant-closed';
  }

  const normalizedKey = categoryName.toLowerCase();
  return PRODUCT_CATEGORY_ICON_MAP[normalizedKey] || 'mdi-package-variant-closed';
}

/**
 * Converts a numeric or decimal string value to integer cents.
 *
 * @param {string|number} value - Decimal monetary amount (e.g., "12.50").
 * @returns {number} Value in cents.
 */
export function toCents(value) {
  const stringValue = String(value ?? '0');
  const tokens = stringValue.split('.');
  const wholePart = tokens[0] || '0';
  const fractionPart = tokens[1] || '';

  const wholeCents = Number(wholePart) * 100;
  const paddedFraction = fractionPart.padEnd(2, '0').slice(0, 2);
  const fractionCents = Number(paddedFraction || 0);

  return wholeCents + fractionCents;
}

/**
 * Data table column definitions for products.
 */
export const PRODUCT_TABLE_HEADERS = [
  { title: 'PRODUCT', key: 'name', sortable: true },
  { title: 'SKU', key: 'sku', sortable: true },
  { title: 'CATEGORY', key: 'category', sortable: false },
  { title: 'SELLING PRICE', key: 'price', align: 'end', sortable: false },
  { title: 'IN STOCK', key: 'stock', align: 'end', sortable: true },
  { title: 'STATUS', key: 'status', sortable: false },
  { title: '', key: 'actions', sortable: false, align: 'end' },
];

/**
 * Composable managing product rows, server-side pagination, sorting,
 * and filter-aware totals.
 *
 * @param {Object} options - Configuration options.
 * @param {Object} options.filters - Product filters object.
 * @param {import('vue').Ref<Array>} options.apiCategories - Categories reference list.
 * @returns {Object} Product table reactive state and querying methods.
 */
export function useProductsTable({
  filters,
  apiCategories,
}) {
  /**
   * Paginated list of products returned from API.
   */
  const apiProducts = ref([]);

  /**
   * Total number of matching product records across all pages.
   */
  const apiTotal = ref(0);

  /**
   * Current pagination page number (1-based).
   */
  const apiPage = ref(1);

  /**
   * Number of items displayed per table page.
   */
  const pageSize = ref(8);

  /**
   * Active column key for sorting ('name', 'sku', 'stock').
   */
  const apiSort = ref('name');

  /**
   * Sort direction ('asc' or 'desc').
   */
  const apiDirection = ref('asc');

  /**
   * Data loading indicator.
   */
  const loading = ref(false);

  /**
   * User-facing table error message.
   */
  const error = ref('');

  /**
   * Active rows to display in the data table.
   */
  const productRows = computed(() => apiProducts.value);

  /**
   * Total count of matching products for table pagination.
   */
  const productTotal = computed(() => apiTotal.value);

  /**
   * Number of items currently below their reorder threshold.
   */
  const lowStockCount = computed(() => {
    const items = apiProducts.value || [];
    const lowStockItems = items.filter((item) => {
      return item.stock <= item.reorder;
    });

    return lowStockItems.length;
  });

  /**
   * Fetches paginated products and categories from backend API.
   */
  async function loadRemoteProducts() {
    loading.value = true;
    error.value = '';

    try {
      const queryParams = new URLSearchParams({
        page: String(apiPage.value),
        page_size: String(pageSize.value),
        status: filters.statusFilter.value,
        sort: apiSort.value,
        direction: apiDirection.value,
      });

      const cleanQuery = (filters.search.value || '').trim();
      if (cleanQuery) {
        queryParams.set('q', cleanQuery);
      }

      if (filters.category.value !== 'all' && filters.category.value !== 'All categories') {
        queryParams.set('category_id', filters.category.value);
      }

      if (filters.lowStockOnly.value) {
        queryParams.set('low_stock', 'true');
      }

      if (filters.minStock.value !== '') {
        queryParams.set('min_stock', filters.minStock.value);
      }

      if (filters.maxStock.value !== '') {
        queryParams.set('max_stock', filters.maxStock.value);
      }

      if (filters.minPrice.value !== '') {
        queryParams.set('min_price', filters.minPrice.value);
      }

      if (filters.maxPrice.value !== '') {
        queryParams.set('max_price', filters.maxPrice.value);
      }

      const categoriesPromise = apiCategories.value.length
        ? Promise.resolve({ items: apiCategories.value })
        : apiRequest('/categories?status=all');

      const productsPromise = apiRequest(`/products?${queryParams}`);

      const [categoryResult, productResult] = await Promise.all([
        categoriesPromise,
        productsPromise,
      ]);

      apiCategories.value = categoryResult.items || [];

      const rawItems = productResult.items || [];
      apiProducts.value = rawItems.map((item) => {
        const idNumber = Number(item.id) || 0;
        const toneIndex = Math.abs(idNumber) % PRODUCT_TONE_COLORS.length;
        const assignedTone = PRODUCT_TONE_COLORS[toneIndex];

        const formattedProduct = {
          id: item.id,
          sku: item.sku,
          name: item.name,
          category: item.categoryName,
          categoryId: item.categoryId,
          unit: item.unit,
          price: toCents(item.sellingPrice),
          stock: item.stockQty,
          reorder: item.reorderLevel,
          status: item.status,
          tone: assignedTone,
          warrantyMonths: item.warrantyMonths,
          tracksSerial: item.tracksSerial,
        };

        if (item.costPrice !== undefined) {
          formattedProduct.cost = toCents(item.costPrice);
        }

        return formattedProduct;
      });

      apiTotal.value = productResult.total || 0;

      if (filters.category.value === 'All categories') {
        filters.category.value = 'all';
      }
    } catch (requestError) {
      error.value = requestError.message;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Handles server-side table pagination and column sorting events.
   *
   * @param {Object} options - Vuetify data table options event.
   */
  function onTableOptions(options) {
    const nextPage = options.page || 1;
    const nextPageSize = options.itemsPerPage || pageSize.value;
    const sortOption = options.sortBy?.[0];

    let nextSort = apiSort.value;
    if (['name', 'sku'].includes(sortOption?.key)) {
      nextSort = sortOption.key;
    } else if (sortOption?.key === 'stock') {
      nextSort = 'stock';
    }

    const nextDirection = sortOption?.order === 'desc' ? 'desc' : 'asc';

    const hasNoChange =
      nextPage === apiPage.value &&
      nextPageSize === pageSize.value &&
      nextSort === apiSort.value &&
      nextDirection === apiDirection.value;

    if (hasNoChange) {
      return;
    }

    apiPage.value = nextPage;
    pageSize.value = nextPageSize;
    apiSort.value = nextSort;
    apiDirection.value = nextDirection;

    loadRemoteProducts();
  }

  return {
    apiProducts,
    apiTotal,
    apiPage,
    pageSize,
    apiSort,
    apiDirection,
    loading,
    error,
    productRows,
    productTotal,
    lowStockCount,
    headers: PRODUCT_TABLE_HEADERS,
    categoryIcon,
    loadRemoteProducts,
    onTableOptions,
  };
}

