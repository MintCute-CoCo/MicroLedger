import { onMounted, reactive, ref } from 'vue';
import { apiRequest } from '../../api/client.js';
import { applyDisplaySettings } from '../../utils/format.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';

/**
 * Composable managing global store configuration, ISO currency formatting,
 * decimal precision settings, and server-side persistence.
 *
 * @returns {Object} Reactive state, error maps, and settings save handler.
 */
export function useSettings() {
  /**
   * Currency settings form state.
   */
  const form = reactive({
    currency_code: 'USD',
    currency_decimals: 2,
  });

  const busy = ref(false);
  const message = ref('');
  const error = ref('');
  const fieldErrors = ref({});

  /**
   * Fetches active store settings from the server.
   */
  async function loadSettings() {
    try {
      const data = await apiRequest('/settings');
      form.currency_code = data.currency_code || 'USD';
      form.currency_decimals = Number.isInteger(data.currency_decimals)
        ? data.currency_decimals
        : 2;
    } catch (e) {
      error.value = e.message;
    }
  }

  /**
   * Persists updated currency and display configurations.
   */
  async function save() {
    busy.value = true;
    error.value = '';
    message.value = '';
    fieldErrors.value = {};

    try {
      const payload = {
        currency_code: form.currency_code,
        currency_decimals: form.currency_decimals,
      };

      const updated = await apiRequest('/settings', {
        method: 'PATCH',
        body: payload,
      });

      form.currency_code = updated.currency_code || form.currency_code;
      form.currency_decimals = Number.isInteger(updated.currency_decimals)
        ? updated.currency_decimals
        : form.currency_decimals;

      applyDisplaySettings(updated);
      message.value = 'Settings saved.';
    } catch (e) {
      const mapped = fieldErrorsFrom(e);
      fieldErrors.value = mapped.fields;
      error.value = mapped.globalMessage;
    } finally {
      busy.value = false;
    }
  }

  onMounted(loadSettings);

  return {
    form,
    busy,
    message,
    error,
    fieldErrors,
    save,
  };
}

