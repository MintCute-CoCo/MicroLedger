import { ref } from 'vue';
import { apiDownload } from '../../api/client.js';

/**
 * Export entity options.
 */
export const EXPORT_DATA_OPTIONS = [
  { title: 'Products', value: 'products' },
  { title: 'Inventory', value: 'inventory' },
  { title: 'Sales', value: 'sales' },
  { title: 'Sales report', value: 'sales_report' },
  { title: 'Inventory report', value: 'inventory_report' },
  { title: 'Warranty report', value: 'warranty_report' },
];

/**
 * Export file format options.
 */
export const EXPORT_FORMAT_OPTIONS = [
  { title: 'Excel (.xlsx)', value: 'xlsx' },
  { title: 'CSV', value: 'csv' },
];

/**
 * Composable providing bulk data exports in Excel (.xlsx) and CSV formats.
 *
 * @param {Object} options - Configuration options.
 * @param {Function} options.dateQuery - Function returning date range query params.
 * @param {import('vue').Ref<string>} options.from - Start date ref.
 * @param {import('vue').Ref<string>} options.to - End date ref.
 * @param {import('vue').Ref<string>} options.group - Active grouping ref.
 * @returns {Object} Export state and download handler.
 */
export function useReportsExport({ dateQuery, from, to, group }) {
  /**
   * Selected dataset to export.
   */
  const type = ref('products');

  /**
   * Selected file format ('xlsx' or 'csv').
   */
  const format = ref('xlsx');

  /**
   * Export in-flight indicator.
   */
  const busy = ref(false);

  /**
   * Error message banner.
   */
  const error = ref('');

  /**
   * Triggers an asynchronous file download of selected reports or entities.
   */
  async function download() {
    const isSalesExport = ['sales', 'sales_report'].includes(type.value);
    const hasMissingDates = !from.value || !to.value;

    if (isSalesExport && hasMissingDates) {
      error.value = 'Choose a start and end date for sales exports.';
      return;
    }

    busy.value = true;
    error.value = '';

    try {
      const query = dateQuery();
      query.set('format', format.value);

      const isReport = type.value.endsWith('_report');
      let reportName = null;
      if (isReport) {
        reportName = type.value.replace('_report', '');
      }

      if (type.value === 'sales_report') {
        query.set('group', group.value);
      }

      let endpointPath = `/exports/${type.value}`;
      if (reportName) {
        endpointPath = `/exports/reports/${reportName}`;
      }

      let fileBaseName = type.value;
      if (reportName) {
        fileBaseName = `${reportName}-report`;
      }

      const filename = `${fileBaseName}.${format.value}`;
      await apiDownload(`${endpointPath}?${query}`, filename);
    } catch (requestError) {
      error.value = requestError.message;
    } finally {
      busy.value = false;
    }
  }

  return {
    type,
    format,
    busy,
    error,
    exportDataOptions: EXPORT_DATA_OPTIONS,
    exportFormatOptions: EXPORT_FORMAT_OPTIONS,
    download,
  };
}

