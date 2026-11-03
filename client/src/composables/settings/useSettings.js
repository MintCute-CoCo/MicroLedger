import { computed, onMounted, reactive, ref } from 'vue';
import { apiRequest } from '../../api/client.js';
import { applyDisplaySettings, formatMoney } from '../../utils/format.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';

/**
 * Standard store currency presets for rapid localization configuration.
 */
export const CURRENCY_PRESETS = [
  {
    code: 'VND',
    decimals: 0,
    label: 'VND — Vietnamese Dong (₫, 0 decimals)',
    description: 'Standard domestic currency for Vietnam retail operations.',
  },
  {
    code: 'USD',
    decimals: 2,
    label: 'USD — US Dollar ($, 2 decimals)',
    description: 'International standard currency with minor cent units.',
  },
  {
    code: 'EUR',
    decimals: 2,
    label: 'EUR — Euro (€, 2 decimals)',
    description: 'European single currency with cent denominations.',
  },
];

/**
 * Composable managing global store configuration, ISO currency formatting,
 * decimal precision settings, safety guardrails, and server-side persistence.
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

  const initialCurrencyCode = ref('USD');
  const initialCurrencyDecimals = ref(2);

  const busy = ref(false);
  const message = ref('');
  const error = ref('');
  const fieldErrors = ref({});
  const confirmDialogOpen = ref(false);

  /**
   * Identifies whether the user is modifying the store's primary base currency code.
   */
  const isCurrencyChanged = computed(() => {
    const currentCode = (form.currency_code || '').trim().toUpperCase();
    const initialCode = (initialCurrencyCode.value || '').trim().toUpperCase();
    return currentCode !== initialCode;
  });

  /**
   * Generates a live formatted preview of a sample monetary amount (in cents)
   * using the currently entered form settings.
   *
   * @param {number} cents - Lowest unit denomination to preview.
   * @returns {string} Formatted currency preview string.
   */
  function previewAmount(cents) {
    const code = (form.currency_code || 'USD').trim().toUpperCase();
    const decimals = Number.isInteger(form.currency_decimals)
      ? form.currency_decimals
      : 2;

    return formatMoney(cents, code, decimals);
  }

  /**
   * Applies a predefined store currency preset.
   *
   * @param {string} code - ISO 4217 currency code.
   * @param {number} decimals - Precision decimal places (0 to 2).
   */
  function applyPreset(code, decimals) {
    form.currency_code = code;
    form.currency_decimals = decimals;
    fieldErrors.value.currency_code = undefined;
    fieldErrors.value.currency_decimals = undefined;
  }

  /**
   * Reverts current form changes back to the saved database settings.
   */
  function revertSettings() {
    form.currency_code = initialCurrencyCode.value;
    form.currency_decimals = initialCurrencyDecimals.value;
    fieldErrors.value = {};
    confirmDialogOpen.value = false;
  }

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

      initialCurrencyCode.value = form.currency_code;
      initialCurrencyDecimals.value = form.currency_decimals;
    } catch (e) {
      error.value = e.message;
    }
  }

  /**
   * Intercepts save action to trigger confirmation guardrail if currency code was changed.
   */
  function handleSaveClick() {
    if (isCurrencyChanged.value) {
      confirmDialogOpen.value = true;
    } else {
      executeSave();
    }
  }

  /**
   * Persists updated currency and display configurations to the backend.
   */
  async function executeSave() {
    confirmDialogOpen.value = false;
    busy.value = true;
    error.value = '';
    message.value = '';
    fieldErrors.value = {};

    try {
      const payload = {
        currency_code: form.currency_code.trim().toUpperCase(),
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

      initialCurrencyCode.value = form.currency_code;
      initialCurrencyDecimals.value = form.currency_decimals;

      applyDisplaySettings(updated);
      message.value = 'Settings saved successfully.';
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
    initialCurrencyCode,
    initialCurrencyDecimals,
    isCurrencyChanged,
    confirmDialogOpen,
    busy,
    message,
    error,
    fieldErrors,
    presets: CURRENCY_PRESETS,
    previewAmount,
    applyPreset,
    revertSettings,
    handleSaveClick,
    executeSave,
    // Keep backward compatibility
    save: handleSaveClick,
  };
}
