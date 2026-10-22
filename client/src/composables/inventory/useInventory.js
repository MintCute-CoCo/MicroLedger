import { computed, onMounted, ref, watch } from 'vue';
import { apiRequest } from '../../api/client.js';
import { useAuthStore } from '../../stores/auth.js';
import {
  useInventoryStock,
  useInventoryLedger,
  useInventoryDialogs,
} from './index.js';

/**
 * Top-level Inventory Composable aggregating specialized sub-composables:
 * - `useInventoryStock`: Current stock balances catalog, low stock alerts, search.
 * - `useInventoryLedger`: Immutable audit movements ledger, type filter, date bounds.
 * - `useInventoryDialogs`: Stock-in receiving and manual inventory adjustment forms.
 *
 * Implements clean feature separation suitable for university project defense.
 *
 * @returns {Object} Unified inventory state and actions.
 */
export function useInventory() {
  const auth = useAuthStore();

  
  const user = computed(() => auth.user);

  /**
   * Reference options for dialogs and categories.
   */
  const apiProductOptions = ref([]);
  const apiCategories = ref([]);
  const loading = ref(false);
  const error = ref('');

  /**
   * Stock balances sub-composable.
   */
  const stock = useInventoryStock();

  /**
   * Movements ledger sub-composable.
   */
  const ledger = useInventoryLedger({
    search: stock.search,
  });

  /**
   * Modal dialogs sub-composable.
   */
  const dialogs = useInventoryDialogs({
    user,
    productOptions: apiProductOptions,
    onSuccess: async () => {
      await loadApiData();
    },
  });

  /**
   * Fetches paginated stock balances, metrics, product options, and ledger movements from API.
   */
  async function loadApiData() {
    

    loading.value = true;
    error.value = '';

    try {
      const inventoryQuery = new URLSearchParams({
        page: String(stock.inventoryPage.value),
        page_size: String(stock.inventoryPageSize.value),
      });

      const trimmedSearch = stock.search.value.trim();
      if (trimmedSearch) {
        inventoryQuery.set('q', trimmedSearch);
      }

      if (stock.categoryFilter.value !== 'all') {
        inventoryQuery.set('category_id', stock.categoryFilter.value);
      }

      if (stock.lowStockOnly.value) {
        inventoryQuery.set('low_stock', 'true');
      }

      const movementQuery = new URLSearchParams({
        page: String(ledger.movementPage.value),
        page_size: String(ledger.movementPageSize.value),
      });

      if (ledger.movementType.value !== 'all') {
        movementQuery.set('type', ledger.movementType.value);
      }

      if (ledger.movementFrom.value) {
        movementQuery.set('from_date', ledger.movementFrom.value);
      }

      if (ledger.movementTo.value) {
        movementQuery.set('to_date', ledger.movementTo.value);
      }

      const categoriesPromise = apiCategories.value.length
        ? Promise.resolve({ items: apiCategories.value })
        : apiRequest('/categories');

      const results = await Promise.allSettled([
        apiRequest(`/inventory?${inventoryQuery}`),
        apiRequest('/inventory?page=1&page_size=1'),
        apiRequest('/products?status=active&page=1&page_size=100'),
        categoriesPromise,
        apiRequest(`/inventory/movements?${movementQuery}`),
      ]);

      const requestErrors = [];

      const inventoryResult = results[0];
      if (inventoryResult.status === 'fulfilled') {
        const inventory = inventoryResult.value;
        stock.apiProducts.value = (inventory.items || []).map((item) => {
          return {
            id: item.id,
            name: item.name,
            sku: item.sku,
            category: item.categoryName,
            stock: item.stockQty,
            reorder: item.reorderLevel,
            tone: 'blue',
          };
        });
        stock.inventoryTotal.value = inventory.total || 0;
      } else {
        requestErrors.push(`Stock overview: ${inventoryResult.reason.message}`);
      }

      const metricsResult = results[1];
      if (metricsResult.status === 'fulfilled') {
        const metrics = metricsResult.value;
        stock.apiMetrics.value = {
          totalUnits: metrics.totalUnits || 0,
          total: metrics.total || 0,
          lowStockCount: metrics.lowStockCount || 0,
        };
      } else {
        requestErrors.push(`Inventory totals: ${metricsResult.reason.message}`);
      }

      const productsResult = results[2];
      if (productsResult.status === 'fulfilled') {
        const products = productsResult.value;
        apiProductOptions.value = (products.items || []).map((item) => {
          return {
            id: item.id,
            name: item.name,
            stock: item.stockQty,
          };
        });
      } else {
        requestErrors.push(`Product choices: ${productsResult.reason.message}`);
      }

      const categoriesResult = results[3];
      if (categoriesResult.status === 'fulfilled') {
        apiCategories.value = categoriesResult.value.items || [];
      } else {
        requestErrors.push(`Category choices: ${categoriesResult.reason.message}`);
      }

      const movementsResult = results[4];
      if (movementsResult.status === 'fulfilled') {
        const movements = movementsResult.value;
        ledger.movementTotal.value = movements.total || 0;
        ledger.apiMovements.value = (movements.items || []).map((item) => {
          return {
            id: item.id,
            product: item.productName,
            sku: item.sku,
            type: ledger.displayType(item.type),
            change: item.quantityChange,
            balance: item.balanceAfter,
            user: item.userName,
            reason: item.reason || '',
            time: item.createdAt,
          };
        });
      } else {
        requestErrors.push(`Movement history: ${movementsResult.reason.message}`);
      }

      error.value = requestErrors.join(' ');
    } catch (requestError) {
      error.value = requestError.message;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Debounced watchers for stock and movement filter updates.
   */
  let searchTimer = null;
  watch(
    [stock.search, stock.categoryFilter, stock.lowStockOnly],
    () => {
      stock.inventoryPage.value = 1;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(loadApiData, 250);
    }
  );

  watch(
    [ledger.movementType, ledger.movementFrom, ledger.movementTo],
    () => {
      ledger.movementPage.value = 1;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(loadApiData, 250);
    }
  );

  /**
   * Handles table pagination for stock balances.
   *
   * @param {Object} options - Table page options.
   */
  function onInventoryOptions(options) {
    const nextPage = options.page || 1;
    const nextPageSize = options.itemsPerPage || stock.inventoryPageSize.value;

    const isUnchanged =
      nextPage === stock.inventoryPage.value &&
      nextPageSize === stock.inventoryPageSize.value;

    if (isUnchanged) {
      return;
    }

    stock.inventoryPage.value = nextPage;
    stock.inventoryPageSize.value = nextPageSize;
    loadApiData();
  }

  /**
   * Handles table pagination for stock movements ledger.
   *
   * @param {Object} options - Table page options.
   */
  function onMovementOptions(options) {
    const nextPage = options.page || 1;
    const nextPageSize = options.itemsPerPage || ledger.movementPageSize.value;

    const isUnchanged =
      nextPage === ledger.movementPage.value &&
      nextPageSize === ledger.movementPageSize.value;

    if (isUnchanged) {
      return;
    }

    ledger.movementPage.value = nextPage;
    ledger.movementPageSize.value = nextPageSize;
    loadApiData();
  }

  onMounted(() => {
    loadApiData();
  });

  return {
    apiCategories,
    apiProductOptions,
    loading,
    error,
    loadApiData,

    // Stock sub-composable
    search: stock.search,
    categoryFilter: stock.categoryFilter,
    lowStockOnly: stock.lowStockOnly,
    apiProducts: stock.apiProducts,
    inventoryTotal: stock.inventoryTotal,
    inventoryPage: stock.inventoryPage,
    inventoryPageSize: stock.inventoryPageSize,
    apiMetrics: stock.apiMetrics,
    lowStockCount: stock.lowStockCount,
    visibleProducts: stock.visibleProducts,
    onInventoryOptions,

    // Ledger sub-composable
    movementType: ledger.movementType,
    movementFrom: ledger.movementFrom,
    movementTo: ledger.movementTo,
    apiMovements: ledger.apiMovements,
    movementTotal: ledger.movementTotal,
    movementPage: ledger.movementPage,
    movementPageSize: ledger.movementPageSize,
    visibleMovements: ledger.visibleMovements,
    displayType: ledger.displayType,
    onMovementOptions,

    // Dialogs sub-composable
    canAdjust: dialogs.canAdjust,
    dialog: dialogs.dialog,
    draft: dialogs.draft,
    saving: dialogs.saving,
    fieldErrors: dialogs.fieldErrors,
    openMovement: dialogs.openMovement,
    saveMovement: dialogs.saveMovement,
  };
}

