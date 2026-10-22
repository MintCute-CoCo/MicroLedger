/**
 * Table headers for warranty claims summary.
 */
export const WARRANTY_STATUS_HEADERS = [
  { title: 'CLAIM STATUS', key: 'status' },
  { title: 'CLAIMS', key: 'count', align: 'end' },
];

/**
 * Table headers for overdue warranty supplier dispatches.
 */
export const OVERDUE_CLAIMS_HEADERS = [
  { title: 'CLAIM', key: 'claim_no' },
  { title: 'PRODUCT', key: 'product' },
  { title: 'CUSTOMER', key: 'customer' },
  { title: 'SUPPLIER', key: 'supplier' },
  { title: 'EXPECTED', key: 'expected_return_date' },
  { title: 'DAYS OVERDUE', key: 'daysOverdue', align: 'end' },
];

/**
 * Table headers for claims grouped by supplier.
 */
export const CLAIMS_BY_SUPPLIER_HEADERS = [
  { title: 'SUPPLIER', key: 'supplier' },
  { title: 'CLAIMS', key: 'count', align: 'end' },
];

/**
 * Composable providing table column headers for warranty claims reports.
 *
 * @returns {Object} Static column configurations.
 */
export function useWarrantyReport() {
  return {
    warrantyStatusHeaders: WARRANTY_STATUS_HEADERS,
    overdueClaimsHeaders: OVERDUE_CLAIMS_HEADERS,
    claimsBySupplierHeaders: CLAIMS_BY_SUPPLIER_HEADERS,
  };
}

