import {
  calculateStoreDateBoundaries,
  fetch7DaySalesTrend,
  fetchActiveCategoriesCount,
  fetchClaimsBySupplier,
  fetchInventoryCounts,
  fetchInventoryReportCurrent,
  fetchInventoryReportMovements,
  fetchOverdueClaims,
  fetchSalesReportGroups,
  fetchStoreDateToday,
  fetchTodaySalesTotals,
  fetchTopSellingProducts,
  fetchTotalStockValue,
  fetchVoidedSales,
  fetchWarrantyStatusCounts,
  findStoreTimeZone,
} from './repository.js';

/**
 * Compiles high-level business intelligence metrics for the main system dashboard.
 * Evaluates today's sales and trailing 7-day sales trend relative to the store's configured
 * time zone with explicit start and end boundary timestamps.
 *
 * @param {Object} user - The authenticated user requesting the dashboard.
 * @returns {Promise<Object>} Formatted dashboard metrics payload.
 */
export async function dashboard(user) {
  // Step 1: Retrieve the configured store time zone (falling back to host system time zone)
  const timeZone = await findStoreTimeZone();

  // Step 2: Declare current time, apply timezone offset, and define explicit start/end boundaries
  // Explicitly declared variables without dense one-liners as required by FYP coding style
  const boundaries = calculateStoreDateBoundaries(timeZone);
  const todayDateString = boundaries.todayDateString;

  // Step 3: Query today's sales totals within explicit timezone boundaries
  const totalsRecord = await fetchTodaySalesTotals(timeZone, boundaries);
  const todayTotal = totalsRecord?.total ?? '0.00';
  const todayCount = Number(totalsRecord?.count ?? 0);

  // Step 4: Query sales records grouped by date for the 7-day trailing window
  const dailyRows = await fetch7DaySalesTrend(timeZone, boundaries);
  const byDayMap = new Map();
  for (const row of dailyRows) {
    byDayMap.set(row.day, row);
  }

  // Step 5: Construct continuous 7-day chronological sequence ending on today
  const sevenDays = [];
  const dateParts = todayDateString.split('-');
  const anchorYear = Number(dateParts[0]);
  const anchorMonthIndex = Number(dateParts[1]) - 1;
  const anchorDay = Number(dateParts[2]);

  for (let offset = 6; offset >= 0; offset -= 1) {
    const calendarDate = new Date(Date.UTC(anchorYear, anchorMonthIndex, anchorDay));
    calendarDate.setUTCDate(calendarDate.getUTCDate() - offset);

    const dateKey = calendarDate.toISOString().slice(0, 10);
    const existingDayData = byDayMap.get(dateKey);

    if (existingDayData) {
      sevenDays.push(existingDayData);
    } else {
      sevenDays.push({
        day: dateKey,
        total: '0.00',
        count: 0,
      });
    }
  }

  // Step 6: Retrieve top-selling products over the 7-day window
  const topProductsRaw = await fetchTopSellingProducts(timeZone, boundaries, 5);
  const topProducts = topProductsRaw.map((row) => ({
    productId: String(row.productId),
    name: row.name,
    quantity: Number(row.quantity),
    revenue: row.revenue,
  }));

  // Fetch inventory counts and active categories
  const stockCounts = await fetchInventoryCounts();
  const categoryCounts = await fetchActiveCategoriesCount();

  const activeProducts = Number(stockCounts?.products ?? 0);
  const activeCategories = Number(categoryCounts?.count ?? 0);
  const totalUnits = Number(stockCounts?.units ?? 0);
  const lowStockCount = Number(stockCounts?.lowStock ?? 0);

  // Stock value is restricted strictly to administrators
  let stockValue = null;
  if (user.role === 'admin') {
    const valuation = await fetchTotalStockValue();
    stockValue = valuation?.value ?? '0.00';
  }

  const inventorySummary = {
    activeProducts,
    activeCategories,
    units: totalUnits,
    lowStockCount,
  };

  if (stockValue !== null) {
    inventorySummary.stockValue = stockValue;
  }

  return {
    today: {
      date: todayDateString,
      total: todayTotal,
      count: todayCount,
    },
    last7Days: sevenDays,
    topProducts,
    inventory: inventorySummary,
    timeZone,
  };
}

/**
 * Generates an analytical sales report aggregated by day, product, category, user, or payment method,
 * alongside a listing of voided sales within the specified filter parameters.
 *
 * @param {Object} filters - Validated filter parameters from salesReportSchema.
 * @returns {Promise<Object>} Aggregated grouping rows and voided sales entries.
 */
export async function salesReport(filters) {
  const timeZone = await findStoreTimeZone();

  // Fetch sales groups according to selected aggregation dimension
  const { selectedKey, groups } = await fetchSalesReportGroups(filters, timeZone);

  const formattedGroups = groups.map((row) => {
    const rawSubtotal = Number(row.subtotal ?? 0);
    const rawDiscount = Number(row.discount ?? 0);
    const rawTotal = Number(row.total ?? 0);

    return {
      key: row[selectedKey],
      quantity: Number(row.quantity),
      subtotal: rawSubtotal.toFixed(2),
      discount: rawDiscount.toFixed(2),
      total: rawTotal.toFixed(2),
    };
  });

  // Fetch voided sales matching the same criteria
  const voided = await fetchVoidedSales(filters, timeZone);

  return {
    group: filters.group,
    groups: formattedGroups,
    voided,
  };
}

/**
 * Generates an analytical inventory report containing current stock balances,
 * historical ledger movements, and inventory valuation for Admin users.
 *
 * @param {Object} user - The authenticated user requesting the report.
 * @param {Object} filters - Validated inventory report filters.
 * @returns {Promise<Object>} Current product stock levels and ledger movement history.
 */
export async function inventoryReport(user, filters) {
  const timeZone = await findStoreTimeZone();
  const isAdmin = user.role === 'admin';

  // Fetch current active product stock list
  const rawCurrent = await fetchInventoryReportCurrent(filters, isAdmin);
  const current = rawCurrent.map((row) => ({
    ...row,
    id: String(row.id),
  }));

  // Fetch historical inventory ledger movements
  const movements = await fetchInventoryReportMovements(filters, timeZone);

  // Compute total inventory valuation if requested by an Admin
  let stockValue = null;
  if (isAdmin) {
    const valuation = await fetchTotalStockValue();
    stockValue = valuation?.value ?? '0.00';
  }

  const reportResult = {
    current,
    movements,
  };

  if (stockValue !== null) {
    reportResult.stockValue = stockValue;
  }

  return reportResult;
}

/**
 * Generates a warranty operations report showing claims count by status,
 * supplier claim breakdowns, and overdue supplier return tracking.
 *
 * @returns {Promise<Object>} Warranty claim metrics, overdue items, and supplier summaries.
 */
export async function warrantyReport() {
  const timeZone = await findStoreTimeZone();
  const today = await fetchStoreDateToday(timeZone);

  // Retrieve counts grouped by lifecycle status
  const rawStatuses = await fetchWarrantyStatusCounts();
  const statuses = rawStatuses.map((row) => ({
    status: row.status,
    count: Number(row.count),
  }));

  // Retrieve claims with suppliers exceeding their expected return date
  const rawOverdue = await fetchOverdueClaims(today);
  const overdue = rawOverdue.map((row) => {
    let dateString;
    if (row.expected_return_date instanceof Date) {
      dateString = row.expected_return_date.toISOString().slice(0, 10);
    } else {
      dateString = String(row.expected_return_date).slice(0, 10);
    }

    const todayMillis = new Date(`${today}T00:00:00Z`).getTime();
    const expectedMillis = new Date(`${dateString}T00:00:00Z`).getTime();
    const diffMillis = todayMillis - expectedMillis;
    const daysOverdue = Math.floor(diffMillis / 86400000);

    return {
      ...row,
      id: String(row.id),
      daysOverdue,
    };
  });

  // Retrieve claims count aggregated by supplier
  const rawBySupplier = await fetchClaimsBySupplier();
  const bySupplier = rawBySupplier.map((row) => ({
    ...row,
    supplier_id: String(row.supplier_id),
    count: Number(row.count),
  }));

  return {
    today,
    statuses,
    overdue,
    bySupplier,
  };
}
