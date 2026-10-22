import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { apiRequest } from '../../api/client.js';

/**
 * Returns a contextual Material Design icon based on product category.
 *
 * @param {string} categoryName - Category title.
 * @returns {string} MDI icon identifier.
 */
export function getCategoryIcon(categoryName) {
  switch (categoryName) {
    case 'Lighting':
      return 'mdi-lamp-outline';
    case 'Electrical':
      return 'mdi-power-plug-outline';
    case 'Hardware':
      return 'mdi-tools';
    default:
      return 'mdi-flower-outline';
  }
}

/**
 * Adapts raw database product records to match the POS cart/catalog interface expectations.
 *
 * @param {Array<Object>} rawItems - Array of raw product records from the API.
 * @returns {Array<Object>} Formatted product models.
 */
export function adaptProducts(rawItems) {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems.map((item) => {
    const unitPriceNumber = Number(item.sellingPrice || 0);
    const priceInCents = Math.round(unitPriceNumber * 100);

    return {
      ...item,
      id: String(item.id),
      category: item.categoryName || 'General',
      price: priceInCents,
      stock: item.stockQty ?? 0,
      reorder: item.reorderLevel ?? 0,
      tone: 'blue',
    };
  });
}

/**
 * Composable managing POS product catalog display, category filtering,
 * and debounced live SKU/name searching.
 *
 * @returns {Object} Catalog reactive state, filters, and loader function.
 */
export function usePosCatalog() {
  /**
   * Remote server catalog dataset.
   */
  const remoteProducts = ref([]);

  /**
   * Remote server categories dataset.
   */
  const remoteCategories = ref([]);

  /**
   * Text search query string.
   */
  const search = ref('');

  /**
   * Active category tab selection.
   */
  const category = ref('All items');

  /**
   * Catalog network in-flight indicator.
   */
  const registerLoading = ref(false);

  /**
   * Error message banner for catalog failures.
   */
  const catalogError = ref('');

  /**
   * Resolves the active products collection from live server data.
   */
  const products = computed(() => {
    return remoteProducts.value;
  });

  /**
   * Dynamically aggregates unique category names from remote server data.
   */
  const categories = computed(() => {
    const categoryNames = remoteCategories.value.map((cat) => {
      return cat.name;
    });

    return ['All items', ...categoryNames];
  });

  /**
   * Filters the active product catalog according to selected category and search keyword.
   */
  const filteredProducts = computed(() => {
    const query = search.value.toLowerCase().trim();
    const currentCategory = category.value;

    return products.value.filter((product) => {
      const productName = (product.name || '').toLowerCase();
      const productSku = (product.sku || '').toLowerCase();
      const searchableText = `${productName} ${productSku}`;

      const matchesSearch = searchableText.includes(query);
      const matchesCategory =
        currentCategory === 'All items' || product.category === currentCategory;

      return matchesSearch && matchesCategory;
    });
  });

  /**
   * Loads initial active catalog and product categories from API.
   */
  async function loadCatalog() {
    if (catalogRequestController) {
      catalogRequestController.abort();
    }

    const requestController = new AbortController();
    catalogRequestController = requestController;
    catalogRequestVersion += 1;
    const requestVersion = catalogRequestVersion;
    registerLoading.value = true;
    catalogError.value = '';

    try {
      const [productsResult, categoriesResult] = await Promise.all([
        apiRequest('/products?status=active&page_size=100', {
          signal: requestController.signal,
        }),
        apiRequest('/categories', {
          signal: requestController.signal,
        }),
      ]);

      if (requestVersion !== catalogRequestVersion) {
        return;
      }

      remoteProducts.value = adaptProducts(productsResult.items || []);
      remoteCategories.value = categoriesResult.items ?? categoriesResult;
    } catch (error) {
      if (requestVersion === catalogRequestVersion && error.name !== 'AbortError') {
        catalogError.value = error.message;
      }
    } finally {
      if (requestVersion === catalogRequestVersion) {
        registerLoading.value = false;
        catalogRequestController = null;
      }
    }
  }

  /**
   * Debounced product catalog live search watcher.
   */
  let productSearchTimer = null;
  let catalogRequestController = null;
  let catalogRequestVersion = 0;

  watch(search, () => {
    if (productSearchTimer) {
      clearTimeout(productSearchTimer);
    }

    productSearchTimer = setTimeout(async () => {
      if (catalogRequestController) {
        catalogRequestController.abort();
      }

      const requestController = new AbortController();
      catalogRequestController = requestController;
      catalogRequestVersion += 1;
      const requestVersion = catalogRequestVersion;
      registerLoading.value = true;
      catalogError.value = '';
      const trimmedQuery = search.value.trim();

      try {
        let result;
        if (trimmedQuery) {
          result = await apiRequest(`/products/lookup?q=${encodeURIComponent(trimmedQuery)}`, {
            signal: requestController.signal,
          });
        } else {
          const defaultResult = await apiRequest('/products?status=active&page_size=100', {
            signal: requestController.signal,
          });
          result = defaultResult.items || [];
        }

        if (requestVersion !== catalogRequestVersion) {
          return;
        }

        const itemsList = Array.isArray(result) ? result : (result.items || []);
        remoteProducts.value = adaptProducts(itemsList);
      } catch (error) {
        if (requestVersion === catalogRequestVersion && error.name !== 'AbortError') {
          catalogError.value = error.message;
        }
      } finally {
        if (requestVersion === catalogRequestVersion) {
          registerLoading.value = false;
          catalogRequestController = null;
        }
      }
    }, 180);
  });

  onMounted(() => {
    loadCatalog();
  });

  onBeforeUnmount(() => {
    if (productSearchTimer) {
      clearTimeout(productSearchTimer);
    }

    if (catalogRequestController) {
      catalogRequestController.abort();
    }
  });

  return {
    remoteProducts,
    remoteCategories,
    search,
    category,
    registerLoading,
    catalogError,
    products,
    categories,
    filteredProducts,
    adaptProducts,
    loadCatalog,
    getCategoryIcon,
  };
}

