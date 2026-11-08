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
 * Converts a decimal monetary amount string or number to integer cents without floating point distortion.
 *
 * @param {string|number} amount - Decimal monetary amount (e.g. "12.50").
 * @returns {number} Value in integer cents.
 */
export function toCents(amount) {
  if (amount === null || amount === undefined || amount === '') {
    return 0;
  }
  const str = String(amount).trim();
  const isNegative = str.startsWith('-');
  const cleanStr = isNegative ? str.slice(1) : str;
  const tokens = cleanStr.split('.');
  const wholePart = Number.parseInt(tokens[0] || '0', 10);
  const fractionPart = (tokens[1] || '').padEnd(2, '0').slice(0, 2);
  const fractionCents = Number.parseInt(fractionPart || '0', 10);
  const totalCents = wholePart * 100 + fractionCents;
  return isNegative ? -totalCents : totalCents;
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

