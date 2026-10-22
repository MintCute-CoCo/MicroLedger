import { computed, ref } from 'vue';
import { apiRequest } from '../../api/client.js';

/**
 * Composable managing real-time feeds: top products by revenue,
 * recent sales transactions, low-stock watchlist, and remote API loading.
 *
 * @param {Object} options - Configuration options.
 * @returns {Object} Feeds state, top products, recent sales, and loader function.
 */
export function useDashboardFeeds() {
  /**
   * Raw payload response returned by the `/reports/dashboard` endpoint.
   */
  const report = ref(null);

  /**
   * Latest sales transactions (up to 4 items).
   */
  const recentSales = ref([]);

  /**
   * List of products at or below reorder threshold.
   */
  const lowStock = ref([]);

  /**
   * User-facing error message banner if background reporting fails.
   */
  const reportError = ref('');
  const dashboardError = ref('');
  const salesError = ref('');
  const productsError = ref('');
  const salesLoaded = ref(false);
  const productsLoaded = ref(false);

  /**
   * Feed: Top selling products aggregated over the past 7 days.
   */
  const topProducts = computed(() => {
    if (!report.value) {
      return [];
    }

    const rawList = report.value.topProducts || [];

    return rawList.map((product) => {
      const revenueCents = Number(product.revenue || 0) * 100;

      return {
        name: product.name,
        units: product.quantity,
        amount: revenueCents,
        tone: 'blue',
      };
    });
  });

  /**
   * Feed: Recent sales feed displayed on the dashboard (up to 4 items).
   */
  const salesRows = computed(() => recentSales.value);

  /**
   * Feed: Low stock items to watch (up to 4 items).
   */
  const lowStockItems = computed(() => lowStock.value);

  /**
   * Loads dashboard KPIs, recent transaction feed, and catalog stock warnings.
   */
  async function loadDashboard() {
    dashboardError.value = '';
    salesError.value = '';
    productsError.value = '';
    reportError.value = '';

    const results = await Promise.allSettled([
        apiRequest('/reports/dashboard'),
        apiRequest('/sales?page_size=4'),
        apiRequest('/products?status=active&page_size=100'),
    ]);

    const dashboardResult = results[0];
    if (dashboardResult.status === 'fulfilled') {
      report.value = dashboardResult.value;
    } else {
      dashboardError.value = dashboardResult.reason.message;
    }

    const salesResult = results[1];
    if (salesResult.status === 'fulfilled') {
      const rawSales = salesResult.value.items || [];
      recentSales.value = rawSales.map((sale) => {
        const isVoided = sale.status === 'voided';
        const totalCents = Number(sale.total || 0) * 100;

        return {
          id: sale.id,
          number: sale.saleNo,
          customer: sale.customerName,
          total: totalCents,
          status: isVoided ? 'Voided' : 'Completed',
          createdAt: sale.soldAt,
        };
      });
    } else {
      salesError.value = salesResult.reason.message;
    }
    salesLoaded.value = true;

    const productsResult = results[2];
    if (productsResult.status === 'fulfilled') {
      const rawProducts = productsResult.value.items || [];
      const lowStockMatches = rawProducts
        .filter((prod) => {
          const qty = Number(prod.stockQty || 0);
          const reorder = Number(prod.reorderLevel || 0);
          return qty <= reorder;
        })
        .slice(0, 4)
        .map((prod) => {
          return {
            ...prod,
            stock: prod.stockQty,
            tone: 'blue',
          };
        });

      lowStock.value = lowStockMatches;
    } else {
      productsError.value = productsResult.reason.message;
    }
    productsLoaded.value = true;

    const errors = [dashboardError.value, salesError.value, productsError.value]
      .filter((message) => Boolean(message));
    reportError.value = errors.join(' ');
  }

  return {
    report,
    recentSales,
    lowStock,
    reportError,
    dashboardError,
    salesError,
    productsError,
    salesLoaded,
    productsLoaded,
    topProducts,
    salesRows,
    lowStockItems,
    loadDashboard,
  };
}

