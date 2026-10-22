import { computed } from 'vue';

/**
 * Composable providing executive KPIs, inventory totals, and dynamic time-of-day greeting.
 *
 * @param {Object} options - Configuration options.
 * @param {import('vue').Ref<Object|null>} options.report - Live dashboard payload from API.
 * @returns {Object} Reactive KPI metrics and calendar greetings.
 */
export function useDashboardMetrics({ report }) {
  /**
   * Key Metric: Today's gross turnover in cents.
   */
  const todaySales = computed(() => {
    if (report.value && report.value.today) {
      const numericTotal = Number(report.value.today.total || 0);
      return Math.round(numericTotal * 100);
    }

    return 0;
  });

  /**
   * Key Metric: Total active inventory units in stock across the store.
   */
  const stockUnits = computed(() => {
    if (report.value && report.value.inventory) {
      return report.value.inventory.units || 0;
    }

    return 0;
  });

  /**
   * Key Metric: Number of distinct products requiring replenishment (stock <= reorder level).
   */
  const lowStockCount = computed(() => {
    if (report.value && report.value.inventory) {
      return report.value.inventory.lowStockCount || 0;
    }

    return 0;
  });

  /**
   * Total number of active catalogue products.
   */
  const productCount = computed(() => {
    if (report.value && report.value.inventory) {
      return report.value.inventory.activeProducts || 0;
    }

    return 0;
  });

  /**
   * Total number of active product categories.
   */
  const categoryCount = computed(() => {
    if (report.value && report.value.inventory) {
      return report.value.inventory.activeCategories || 0;
    }

    return 0;
  });

  /**
   * Total count of completed sale transactions today.
   */
  const completedCount = computed(() => {
    if (report.value && report.value.today) {
      return report.value.today.count || 0;
    }

    return 0;
  });

  /**
   * Time-of-day greeting (Morning, Afternoon, Evening) determined by local system time.
   */
  const greeting = computed(() => {
    const currentHour = new Date().getHours();

    if (currentHour < 12) {
      return 'Good morning';
    }

    if (currentHour < 18) {
      return 'Good afternoon';
    }

    return 'Good evening';
  });

  /**
   * Current calendar date headline formatted with weekday and month.
   * Evaluates relative to the local system time zone (or API store time zone) rather than UTC.
   */
  const dayLabel = computed(() => {
    // Current date object in the runtime environment
    const currentDate = new Date();

    // Determine the active time zone: use configured store time zone if present and not 'UTC',
    // otherwise default to the client's local system time zone.
    const activeTimeZone = (report.value && report.value.timeZone && report.value.timeZone !== 'UTC')
      ? report.value.timeZone
      : Intl.DateTimeFormat().resolvedOptions().timeZone;

    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: activeTimeZone,
    });

    return formatter.format(currentDate);
  });

  return {
    todaySales,
    stockUnits,
    lowStockCount,
    productCount,
    categoryCount,
    completedCount,
    greeting,
    dayLabel,
  };
}

