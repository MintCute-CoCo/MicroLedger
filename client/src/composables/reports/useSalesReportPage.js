import { onMounted, ref } from 'vue';
import { apiRequest } from '../../api/client.js';

/**
 * Formats a JavaScript date as an ISO calendar date in a requested time zone.
 *
 * @param {Date} date - Date to format.
 * @param {string} timeZone - IANA time zone identifier.
 * @returns {string} Calendar date in YYYY-MM-DD form.
 */
function formatDateInStoreTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
}

/**
 * Owns the dedicated sales report's filters, reference data, and API lifecycle.
 *
 * @returns {Object} Reactive report state and actions for the route view.
 */
export function useSalesReportPage() {
  const fromDate = ref('');
  const toDate = ref('');
  const activeGroup = ref('day');
  const activePaymentMethod = ref('');
  const activeCategoryId = ref('');
  const activeUserId = ref('');
  const availableCategories = ref([]);
  const availableUsers = ref([]);
  const reportGroups = ref([]);
  const voidedSales = ref([]);
  const isBusy = ref(false);
  const errorMessage = ref('');
  const storeTimeZone = ref('Asia/Ho_Chi_Minh');

  /**
   * Sets the initial report date range to the past 30 calendar days.
   *
   * @param {string} timeZone - Time zone used to determine calendar dates.
   * @returns {void}
   */
  function initializeDefaultDateBoundaries(timeZone) {
    const now = new Date();
    const today = formatDateInStoreTimeZone(now, timeZone);
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);

    toDate.value = today;
    fromDate.value = formatDateInStoreTimeZone(startDate, timeZone);
  }

  /**
   * Applies a named date preset and reloads the report.
   *
   * @param {string} presetCode - Supported range: today, 7days, month, or 30days.
   * @returns {void}
   */
  function applyQuickPreset(presetCode) {
    const now = new Date();
    const today = formatDateInStoreTimeZone(now, storeTimeZone.value);
    let startDate = today;

    if (presetCode === '7days') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      startDate = formatDateInStoreTimeZone(sevenDaysAgo, storeTimeZone.value);
    } else if (presetCode === 'month') {
      startDate = `${today.slice(0, 7)}-01`;
    } else if (presetCode === '30days') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      startDate = formatDateInStoreTimeZone(thirtyDaysAgo, storeTimeZone.value);
    }

    fromDate.value = startDate;
    toDate.value = today;
    fetchSalesReport();
  }

  /**
   * Resets all report filters to their default values and reloads the report.
   *
   * @returns {void}
   */
  function handleResetFilters() {
    activeGroup.value = 'day';
    activePaymentMethod.value = '';
    activeCategoryId.value = '';
    activeUserId.value = '';
    initializeDefaultDateBoundaries(storeTimeZone.value);
    fetchSalesReport();
  }

  /**
   * Loads categories, staff, and store time zone for the report filter controls.
   *
   * @returns {Promise<void>} Resolves after reference data requests finish.
   */
  async function loadFilterReferenceData() {
    const [categoriesResult, usersResult, settingsResult] = await Promise.all([
      apiRequest('/categories').catch(() => null),
      apiRequest('/users').catch(() => null),
      apiRequest('/settings').catch(() => null),
    ]);

    if (Array.isArray(categoriesResult?.items)) {
      availableCategories.value = categoriesResult.items;
    }

    if (Array.isArray(usersResult?.items)) {
      availableUsers.value = usersResult.items;
    }

    if (settingsResult?.time_zone) {
      storeTimeZone.value = settingsResult.time_zone;
    }
  }

  /**
   * Fetches the sales report using the current filters and handles request states.
   *
   * @returns {Promise<void>} Resolves after the report request finishes.
   */
  async function fetchSalesReport() {
    if (fromDate.value && toDate.value && fromDate.value > toDate.value) {
      errorMessage.value = 'The "To Date" boundary must not precede the "From Date" boundary.';
      return;
    }

    isBusy.value = true;
    errorMessage.value = '';

    try {
      const queryParameters = new URLSearchParams();
      queryParameters.set('group', activeGroup.value);

      if (fromDate.value) {
        queryParameters.set('from_date', fromDate.value);
      }

      if (toDate.value) {
        queryParameters.set('to_date', toDate.value);
      }

      if (activePaymentMethod.value) {
        queryParameters.set('payment_method', activePaymentMethod.value);
      }

      if (activeCategoryId.value) {
        queryParameters.set('category_id', activeCategoryId.value);
      }

      if (activeUserId.value) {
        queryParameters.set('user_id', activeUserId.value);
      }

      const requestEndpoint = `/reports/sales?${queryParameters.toString()}`;
      const response = await apiRequest(requestEndpoint);
      reportGroups.value = Array.isArray(response?.groups) ? response.groups : [];
      voidedSales.value = Array.isArray(response?.voided) ? response.voided : [];
    } catch (requestError) {
      errorMessage.value = requestError.message || 'Failed to retrieve sales report data.';
      reportGroups.value = [];
      voidedSales.value = [];
    } finally {
      isBusy.value = false;
    }
  }

  /**
   * Clears the current report error message.
   *
   * @returns {void}
   */
  function dismissError() {
    errorMessage.value = '';
  }

  onMounted(async () => {
    await loadFilterReferenceData();
    initializeDefaultDateBoundaries(storeTimeZone.value);
    await fetchSalesReport();
  });

  return {
    fromDate,
    toDate,
    activeGroup,
    activePaymentMethod,
    activeCategoryId,
    activeUserId,
    availableCategories,
    availableUsers,
    reportGroups,
    voidedSales,
    isBusy,
    errorMessage,
    storeTimeZone,
    applyQuickPreset,
    handleResetFilters,
    fetchSalesReport,
    dismissError,
  };
}
