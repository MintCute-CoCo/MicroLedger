import { onMounted, ref } from 'vue';
import { apiRequest } from '../../api/client.js';

/**
 * Composable providing administrative audit log telemetry,
 * filtering by action and entity types, and data loading state.
 *
 * @returns {Object} Reactive state, table column specs, and load action.
 */
export function useAudit() {
  /**
   * Reactive state for audit logs view.
   */
  const rows = ref([]);
  const error = ref('');
  const busy = ref(false);
  const action = ref('');
  const entity = ref('');

  /**
   * Table column configuration for audit log entries.
   */
  const tableHeaders = [
    { title: 'TIME', key: 'created_at' },
    { title: 'USER', key: 'user_name' },
    { title: 'ACTION', key: 'action' },
    { title: 'ENTITY', key: 'entity_type' },
    { title: 'RECORD', key: 'entity_id' },
    { title: 'DETAILS', key: 'details' },
  ];

  /**
   * Loads recent system audit log entries filtered by action or entity type.
   */
  async function load() {
    busy.value = true;
    error.value = '';

    try {
      const queryParams = new URLSearchParams({
        page_size: '100',
      });

      if (action.value) {
        queryParams.set('action', action.value);
      }

      if (entity.value) {
        queryParams.set('entity_type', entity.value);
      }

      const response = await apiRequest(`/audit-logs?${queryParams}`);
      rows.value = response.items;
    } catch (err) {
      error.value = err.message;
    } finally {
      busy.value = false;
    }
  }

  onMounted(load);

  return {
    rows,
    error,
    busy,
    action,
    entity,
    tableHeaders,
    load,
  };
}

