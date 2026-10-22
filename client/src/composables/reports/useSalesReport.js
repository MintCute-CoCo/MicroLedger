import { computed } from 'vue';

/**
 * Table headers for voided transactions.
 */
export const VOIDED_SALES_HEADERS = [
  { title: 'SALE', key: 'sale_no' },
  { title: 'DATE', key: 'sold_at' },
  { title: 'CUSTOMER', key: 'customer' },
  { title: 'STAFF', key: 'staff' },
  { title: 'REASON', key: 'void_reason' },
  { title: 'TOTAL', key: 'total', align: 'end' },
];

/**
 * Converts a decimal dollar amount to integer cents.
 *
 * @param {string|number} amount - Dollar amount.
 * @returns {number} Value in cents.
 */
export function toCents(amount) {
  const numericVal = Number(amount || 0);
  return Math.round(numericVal * 100);
}

/**
 * Composable calculating grouped sales totals, headers, and voided sales lists.
 *
 * @param {Object} options - Configuration options.
 * @param {import('vue').Ref<string>} options.group - Active grouping dimension ref.
 * @param {import('vue').Ref<Object|null>} options.reportData - Raw report payload.
 * @returns {Object} Sales report calculations and headers.
 */
export function useSalesReport({ group, reportData }) {
  /**
   * Dynamic column headers for the sales summary table based on active grouping.
   */
  const salesHeaders = computed(() => {
    let groupColumnTitle = 'GROUP';
    if (group.value === 'day') {
      groupColumnTitle = 'DATE';
    }

    return [
      { title: groupColumnTitle, key: 'key' },
      { title: 'UNITS', key: 'quantity', align: 'end' },
      { title: 'SUBTOTAL', key: 'subtotal', align: 'end' },
      { title: 'DISCOUNT', key: 'discount', align: 'end' },
      { title: 'NET SALES', key: 'total', align: 'end' },
    ];
  });

  /**
   * Aggregates total metrics across all sales report groups.
   */
  const salesTotals = computed(() => {
    const groups = reportData.value?.groups || [];

    const initialAccumulator = {
      quantity: 0,
      subtotal: 0,
      discount: 0,
      total: 0,
    };

    return groups.reduce((acc, row) => {
      const units = Number(row.quantity || 0);
      const subtotalCents = Number(row.subtotal || 0);
      const discountCents = Number(row.discount || 0);
      const totalCents = Number(row.total || 0);

      return {
        quantity: acc.quantity + units,
        subtotal: acc.subtotal + subtotalCents,
        discount: acc.discount + discountCents,
        total: acc.total + totalCents,
      };
    }, initialAccumulator);
  });

  return {
    salesHeaders,
    salesTotals,
    voidedSalesHeaders: VOIDED_SALES_HEADERS,
    toCents,
  };
}

