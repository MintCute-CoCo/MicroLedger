import { computed, ref } from 'vue';
import { apiRequest } from '../../api/client.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';

/**
 * Composable managing stock receipt (Stock In) and manual inventory adjustments,
 * form validation, and submission mutations.
 *
 * @param {Object} options - Configuration options. * @param {import('vue').Ref<Object|null>} options.user - Current user object for role checking.
 * @param {import('vue').Ref<Array>} options.productOptions - Product dropdown items. * @param {Function} options.onSuccess - Callback to refresh inventory after recording movement.
 * @returns {Object} Dialog modal reactive state and handlers.
 */
export function useInventoryDialogs({
  user,
  productOptions,
  onSuccess,
}) {
  /**
   * Visibility flag for stock-in / adjustment modal dialog.
   */
  const dialog = ref(false);

  /**
   * Form input draft state.
   */
  const draft = ref({
    productId: null,
    type: 'Stock in',
    quantity: '',
    reason: '',
  });

  /**
   * Network in-flight state indicator.
   */
  const saving = ref(false);

  /**
   * Global error message banner.
   */
  const error = ref('');

  /**
   * Field-specific validation errors.
   */
  const fieldErrors = ref({});

  /**
   * Evaluates if the active user possesses permission to perform manual inventory adjustments.
   * Admin role is required.
   */
  const canAdjust = computed(() => {
    return user.value?.role === 'admin';
  });

  /**
   * Opens the Stock In or Adjust Stock dialog modal.
   *
   * @param {'Stock in'|'Adjust stock'} type - Operation mode.
   * @param {string|number|null} [productId=null] - Optional pre-selected product.
   */
  function openMovement(type, productId = null) {
    const products = productOptions.value;
    const defaultProductId = productId ?? products[0]?.id ?? null;

    draft.value = {
      productId: defaultProductId,
      type,
      quantity: '',
      reason: '',
    };
    error.value = '';
    fieldErrors.value = {};
    dialog.value = true;
  }

  /**
   * Submits stock receipt or adjustment to the API.
   */
  async function saveMovement() {
    const changeQuantity = Number(draft.value.quantity);

    if (!draft.value.productId || !changeQuantity) {
      return;
    }

    saving.value = true;
    error.value = '';
    fieldErrors.value = {};

    try {
      if (draft.value.type === 'Stock in') {
        const note = draft.value.reason.trim() || undefined;

        await apiRequest('/inventory/stock-in', {
          method: 'POST',
          body: {
            productId: draft.value.productId,
            quantity: changeQuantity,
            note,
          },
        });

        if (typeof onSuccess === 'function') {
          await onSuccess();
        }
      } else {
        await apiRequest('/inventory/adjustments', {
          method: 'POST',
          body: {
            productId: draft.value.productId,
            quantityChange: changeQuantity,
            reason: draft.value.reason.trim(),
          },
        });

        if (typeof onSuccess === 'function') {
          await onSuccess();
        }
      }

      dialog.value = false;
    } catch (requestError) {
      const mapped = fieldErrorsFrom(requestError);
      fieldErrors.value = mapped.fields;
      error.value = mapped.globalMessage;
    } finally {
      saving.value = false;
    }
  }

  return {
    dialog,
    draft,
    saving,
    error,
    fieldErrors,
    canAdjust,
    openMovement,
    saveMovement,
  };
}

