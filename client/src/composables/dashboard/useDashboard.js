import { onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth.js';
import {
  useDashboardMetrics,
  useDashboardCharts,
  useDashboardFeeds,
} from './index.js';

/**
 * Top-level Dashboard Composable aggregating specialized sub-composables:
 * - `useDashboardMetrics`: Executive turnover, items in stock, reorder count, greeting.
 * - `useDashboardCharts`: 7-day revenue trend bar chart, maximum calculation, percentage scaling.
 * - `useDashboardFeeds`: Top selling products, recent transactions list, items to watch.
 *
 * Implements strict separation of concerns for university FYP evaluation.
 *
 * @returns {Object} Unified dashboard state and metrics.
 */
export function useDashboard() {
  const auth = useAuthStore();

  /**
   * Activity feeds and remote reporting sub-composable.
   */
  const feeds = useDashboardFeeds();

  /**
   * Summary KPIs and calendar greetings sub-composable.
   */
  const metrics = useDashboardMetrics({
    report: feeds.report,
  });

  /**
   * 7-day trend chart scaling sub-composable.
   */
  const charts = useDashboardCharts({
    report: feeds.report,
  });

  onMounted(() => {
    feeds.loadDashboard();
  });

  return {
    auth,

    // Feeds state
    report: feeds.report,
    recentSales: feeds.recentSales,
    lowStock: feeds.lowStock,
    reportError: feeds.reportError,
    dashboardError: feeds.dashboardError,
    salesError: feeds.salesError,
    productsError: feeds.productsError,
    salesLoaded: feeds.salesLoaded,
    productsLoaded: feeds.productsLoaded,
    topProducts: feeds.topProducts,
    salesRows: feeds.salesRows,
    lowStockItems: feeds.lowStockItems,
    loadDashboard: feeds.loadDashboard,

    // Metrics state
    todaySales: metrics.todaySales,
    stockUnits: metrics.stockUnits,
    lowStockCount: metrics.lowStockCount,
    productCount: metrics.productCount,
    categoryCount: metrics.categoryCount,
    completedCount: metrics.completedCount,
    greeting: metrics.greeting,
    dayLabel: metrics.dayLabel,

    // Charts state
    chart: charts.chart,
    chartYLabels: charts.chartYLabels,
    chartMaximum: charts.chartMaximum,
  };
}

