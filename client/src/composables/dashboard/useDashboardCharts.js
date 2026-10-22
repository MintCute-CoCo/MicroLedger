import { computed } from 'vue';
import { formatMoney } from '../../utils/format.js';

/**
 * Composable calculating normalized bar heights, maximum turnover,
 * and currency scale markers for the 7-day sales overview chart.
 *
 * @param {Object} options - Configuration options.
 * @param {import('vue').Ref<Object|null>} options.report - Live dashboard payload from API.
 * @returns {Object} Chart series data, maximum revenue, and Y-axis labels.
 */
export function useDashboardCharts({ report }) {
  /**
   * Maximum daily revenue in cents across the 7-day window.
   * Serves as the 100% baseline for proportional bar height calculations.
   */
  const chartMaximum = computed(() => {
    const dayRecords = report.value?.last7Days || [];
    if (!dayRecords.length) {
      return 0;
    }

    const totalsInCents = dayRecords.map((day) => {
      const numericTotal = Number(day.total || 0);
      return Math.round(numericTotal * 100);
    });

    const highestDayTurnover = Math.max(0, ...totalsInCents);
    return highestDayTurnover;
  });

  /**
   * Normalized 7-day bar chart data collection.
   * Each item contains weekday abbreviation, today indicator, and height percentage (0 - 100%).
   */
  const chart = computed(() => {
    if (!report.value) {
      return [];
    }

    const baselineCents = chartMaximum.value;
    const todayIsoDate = report.value.today?.date;

    const dayList = report.value.last7Days || [];
    return dayList.map((day) => {
      const dateObject = new Date(`${day.day}T12:00:00Z`);
      const dayShortName = new Intl.DateTimeFormat('en', {
        weekday: 'short',
      }).format(dateObject);

      const dayTotalCents = Number(day.total || 0) * 100;

      let percentageHeight = 0;
      if (baselineCents > 0) {
        percentageHeight = (dayTotalCents / baselineCents) * 100;
      }

      const isToday = day.day === todayIsoDate;

      return {
        day: dayShortName,
        today: isToday,
        amount: percentageHeight,
        total: Math.round(dayTotalCents),
      };
    });
  });

  /**
   * Y-axis currency scale labels divided into 5 standard tiers (100%, 75%, 50%, 25%, 0%).
   */
  const chartYLabels = computed(() => {
    if (!report.value) {
      return Array.from({ length: 5 }, () => formatMoney(0));
    }

    const scaleFractions = [1, 0.75, 0.5, 0.25, 0];

    return scaleFractions.map((fraction) => {
      const tierValueInCents = chartMaximum.value * fraction;
      return formatMoney(tierValueInCents);
    });
  });

  return {
    chartMaximum,
    chart,
    chartYLabels,
  };
}

