import { computed, ref } from 'vue';
import { apiDownload, apiRequest } from '../../api/client.js';

/**
 * Composable providing batch product catalog import, Excel/CSV preview validation,
 * downloadable error summaries, and transaction commit workflows.
 *
 * @returns {Object} Reactive state, computed pagination properties, and actions.
 */
export function useImports() {
  /**
   * File upload and import state.
   */
  const file = ref(null);
  const preview = ref(null);
  const busy = ref(false);
  const mode = ref('all');
  const error = ref('');
  const done = ref('');

  /**
   * Table header definitions for import row preview.
   */
  const tableHeaders = [
    { title: 'ROW', key: 'rowNumber' },
    { title: 'SKU', key: 'data.sku' },
    { title: 'NAME', key: 'data.name' },
    { title: 'RESULT', key: 'status' },
    { title: 'ISSUES', key: 'issues' },
  ];

  /**
   * Formats combined validation errors and warnings for a preview row.
   *
   * @param {Object} item - Row preview item.
   * @returns {string} Semicolon-delimited issues summary.
   */
  function formatIssues(item) {
    const errors = item.errors || [];
    const warnings = item.warnings || [];
    const combined = [...errors, ...warnings];

    if (combined.length === 0) {
      return '—';
    }

    const formatted = combined.map((entry) => `${entry.column}: ${entry.message}`);
    return formatted.join('; ');
  }

  /**
   * Computes total number of pages for preview pagination.
   */
  const totalPreviewPages = computed(() => {
    if (!preview.value?.counts?.total) {
      return 1;
    }
    const totalRows = preview.value.counts.total;
    const size = preview.value.pageSize || preview.value.page_size || 25;
    return Math.ceil(totalRows / size);
  });

  /**
   * Downloads standard import template in CSV or XLSX format.
   *
   * @param {'csv'|'xlsx'} format - Target file format.
   */
  async function template(format) {
    try {
      await apiDownload(
        `/imports/template?format=${format}`,
        `microledger-import-template.${format}`
      );
    } catch (e) {
      error.value = e.message;
    }
  }

  /**
   * Uploads selected spreadsheet for server-side validation and preview generation.
   */
  async function upload() {
    if (!file.value) {
      return;
    }

    const rawFile = Array.isArray(file.value) ? file.value[0] : file.value;
    if (!rawFile) {
      return;
    }

    busy.value = true;
    error.value = '';
    done.value = '';

    try {
      const data = new FormData();
      data.append('file', rawFile);

      const response = await apiRequest('/imports/preview', {
        method: 'POST',
        body: data,
      });
      preview.value = response;
    } catch (e) {
      error.value = e.message;
    } finally {
      busy.value = false;
    }
  }

  /**
   * Navigates through paginated preview rows.
   *
   * @param {number} targetPage - Target page number.
   */
  async function pagePreview(targetPage) {
    if (!preview.value) {
      return;
    }

    try {
      const response = await apiRequest(
        `/imports/${preview.value.id}?page=${targetPage}&page_size=25`
      );
      preview.value = response;
    } catch (e) {
      error.value = e.message;
    }
  }

  /**
   * Downloads error rows as a CSV file for manual correction.
   */
  async function errorsFile() {
    if (!preview.value) {
      return;
    }

    try {
      await apiDownload(
        `/imports/${preview.value.id}/errors.csv`,
        `import-${preview.value.id}-errors.csv`
      );
    } catch (e) {
      error.value = e.message;
    }
  }

  /**
   * Commits the validated import preview into active catalogue products.
   */
  async function commit() {
    if (!preview.value) {
      return;
    }

    if (mode.value === 'all' && preview.value.counts.error > 0) {
      return;
    }

    const counts = preview.value.counts;
    const summary = `${counts.new} new and ${counts.update} updated products`;
    const skippedNote =
      mode.value === 'valid_only'
        ? `; ${counts.error} invalid rows will be skipped`
        : '';

    const confirmed = window.confirm(`Commit this import with ${summary}${skippedNote}?`);
    if (!confirmed) {
      return;
    }

    busy.value = true;
    error.value = '';

    try {
      const result = await apiRequest(`/imports/${preview.value.id}/commit`, {
        method: 'POST',
        body: {
          mode: mode.value,
        },
      });

      done.value = `Import complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped.`;
      preview.value = null;
      file.value = null;
    } catch (e) {
      error.value = e.message;
    } finally {
      busy.value = false;
    }
  }

  return {
    file,
    preview,
    busy,
    mode,
    error,
    done,
    tableHeaders,
    formatIssues,
    totalPreviewPages,
    template,
    upload,
    pagePreview,
    errorsFile,
    commit,
  };
}

