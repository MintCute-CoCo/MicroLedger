import { ref } from 'vue';
import { apiRequest } from '../../api/client.js';

/**
 * Composable managing claim history audit inspection and timeline modal.
 *
 * @returns {Object} Claim detail state and fetch handler.
 */
export function useClaimDetail() {
  /**
   * Detail modal dialog visibility.
   */
  const detailOpen = ref(false);

  /**
   * Detail payload returned by `/claims/:id`.
   */
  const detail = ref(null);

  /**
   * Summary row of currently inspected claim.
   */
  const selected = ref(null);

  /**
   * Detail network loading indicator.
   */
  const detailBusy = ref(false);

  /**
   * Error message encountered while loading detail history.
   */
  const detailError = ref('');

  /**
   * Fetches full claim timeline history and opens the detail dialog.
   *
   * @param {Object} row - Claim record to inspect.
   */
  async function showDetail(row) {
    selected.value = row;
    detail.value = null;
    detailOpen.value = true;
    detailBusy.value = true;
    detailError.value = '';

    try {
      detail.value = await apiRequest(`/claims/${row.id}`);
    } catch (requestError) {
      detailError.value = requestError.message;
    } finally {
      detailBusy.value = false;
    }
  }

  return {
    detailOpen,
    detail,
    selected,
    detailBusy,
    detailError,
    showDetail,
  };
}

