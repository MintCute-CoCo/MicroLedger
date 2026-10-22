import { ref } from 'vue';

/**
 * Report categories available to store administrators.
 */
export const REPORT_TYPE_OPTIONS = [
  { title: 'Sales report', value: 'sales' },
  { title: 'Inventory report', value: 'inventory' },
  { title: 'Warranty report', value: 'warranty' },
];

/**
 * Grouping dimensions available for sales aggregation.
 */
export const SALES_GROUPING_OPTIONS = [
  { title: 'By day', value: 'day' },
  { title: 'By product', value: 'product' },
  { title: 'By category', value: 'category' },
  { title: 'By staff member', value: 'user' },
  { title: 'By payment method', value: 'payment' },
];

/**
 * Composable managing report criteria: category selection,
 * date interval boundaries, and sales grouping dimensions.
 *
 * @returns {Object} Reactive filters and query builder.
 */
export function useReportsFilters() {
  /**
   * Active report category ('sales', 'inventory', 'warranty').
   */
  const reportType = ref('sales');

  /**
   * Sales breakdown dimension ('day', 'product', 'category', 'user', 'payment').
   */
  const group = ref('day');

  /**
   * Date range start boundary (YYYY-MM-DD).
   */
  const from = ref('');

  /**
   * Date range end boundary (YYYY-MM-DD).
   */
  const to = ref('');

  /**
   * Builds URLSearchParams for date range query with chronological validation.
   *
   * @returns {URLSearchParams} Query parameter instance.
   */
  function dateQuery() {
    if (from.value && to.value && from.value > to.value) {
      throw new Error('The end date must not be before the start date.');
    }

    const query = new URLSearchParams();
    if (from.value) {
      query.set('from_date', from.value);
    }
    if (to.value) {
      query.set('to_date', to.value);
    }

    return query;
  }

  return {
    reportType,
    group,
    from,
    to,
    dateQuery,
    reportTypeOptions: REPORT_TYPE_OPTIONS,
    salesGroupingOptions: SALES_GROUPING_OPTIONS,
  };
}

