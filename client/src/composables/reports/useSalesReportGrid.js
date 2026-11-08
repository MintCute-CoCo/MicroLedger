import { computed } from 'vue';
import { toCents } from './useSalesReport.js';

/**
 * Table column definitions for voided sales transactions.
 */
export const VOIDED_TABLE_HEADERS = [
  { title: 'SALE #', key: 'sale_no', sortable: true },
  { title: 'VOIDED DATE & TIME', key: 'sold_at', sortable: true },
  { title: 'CUSTOMER', key: 'customer', sortable: true },
  { title: 'CASHIER', key: 'staff', sortable: true },
  { title: 'REASON FOR VOID', key: 'void_reason', sortable: true },
  { title: 'AMOUNT VOIDED', key: 'total', align: 'end', sortable: true },
];

/**
 * Composable providing table headers and integer minor-unit financial aggregations
 * for the analytical sales report grid.
 *
 * Follows strict FYP architectural separation of concerns:
 * - Business arithmetic and header calculations live in this composable.
 * - Vue presentation components focus strictly on rendering.
 *
 * @param {Object} options - Input reactive options.
 * @param {import('vue').Ref<string>} options.group - Active aggregation dimension ('day', 'product', etc.).
 * @param {import('vue').Ref<Array>} options.groups - Grouped sales records.
 * @param {import('vue').Ref<Array>} options.voided - Voided sales transaction records.
 * @returns {Object} Computed headers and summary statistics.
 */
export function useSalesReportGrid({ group, groups, voided }) {
  /**
   * Calculates dynamic table column headers based on active aggregation dimension.
   */
  const dynamicTableHeaders = computed(() => {
    const currentGroup = group.value;
    let primaryColumnTitle = 'GROUP';

    if (currentGroup === 'day') {
      primaryColumnTitle = 'CALENDAR DATE';
    } else if (currentGroup === 'product') {
      primaryColumnTitle = 'PRODUCT NAME';
    } else if (currentGroup === 'category') {
      primaryColumnTitle = 'CATEGORY';
    } else if (currentGroup === 'user') {
      primaryColumnTitle = 'CASHIER / STAFF MEMBER';
    } else if (currentGroup === 'payment') {
      primaryColumnTitle = 'PAYMENT METHOD';
    }

    return [
      { title: primaryColumnTitle, key: 'key', sortable: true },
      { title: 'UNITS SOLD', key: 'quantity', align: 'end', sortable: true },
      { title: 'SUBTOTAL', key: 'subtotal', align: 'end', sortable: true },
      { title: 'DISCOUNT', key: 'discount', align: 'end', sortable: true },
      { title: 'NET REVENUE', key: 'total', align: 'end', sortable: true },
    ];
  });

  /**
   * Aggregates completed sales totals using discrete step-by-step integer minor-unit arithmetic.
   * Strictly adheres to the project requirement: monetary math uses integer cents without floating point errors.
   */
  const financialSummary = computed(() => {
    const rows = groups.value || [];
    let accumulatedUnits = 0;
    let accumulatedSubtotalCents = 0;
    let accumulatedDiscountCents = 0;
    let accumulatedTotalCents = 0;

    for (const row of rows) {
      const units = Number(row.quantity || 0);
      const subtotalCents = toCents(row.subtotal);
      const discountCents = toCents(row.discount);
      const totalCents = toCents(row.total);

      accumulatedUnits += units;
      accumulatedSubtotalCents += subtotalCents;
      accumulatedDiscountCents += discountCents;
      accumulatedTotalCents += totalCents;
    }

    return {
      units: accumulatedUnits,
      subtotalCents: accumulatedSubtotalCents,
      discountCents: accumulatedDiscountCents,
      totalCents: accumulatedTotalCents,
      groupsCount: rows.length,
    };
  });

  /**
   * Aggregates voided transactions value for transparent accounting disclosure.
   */
  const voidedSummary = computed(() => {
    const voidRows = voided.value || [];
    let voidedCents = 0;

    for (const voidRow of voidRows) {
      const amountCents = toCents(voidRow.total);
      voidedCents += amountCents;
    }

    return {
      count: voidRows.length,
      totalCents: voidedCents,
    };
  });

  return {
    dynamicTableHeaders,
    voidedTableHeaders: VOIDED_TABLE_HEADERS,
    financialSummary,
    voidedSummary,
    toCents,
  };
}
