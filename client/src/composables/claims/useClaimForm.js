import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { apiRequest } from '../../api/client.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';

/**
 * Formats a warranty item into an informative label for autocomplete search.
 *
 * @param {Object} warranty - Warranty record.
 * @returns {string} Informative label.
 */
export function formatWarrantyLabel(warranty) {
  if (!warranty) {
    return '';
  }

  const parts = [warranty.product_name, warranty.sku];

  if (warranty.serial_no) {
    parts.push(`Serial: ${warranty.serial_no}`);
  }

  parts.push(warranty.validity);

  return parts.join(' · ');
}

/**
 * Composable managing claim creation form, warranty live autocomplete,
 * customer phone matching, and expired warranty notes.
 *
 * @param {Object} options - Configuration options.
 * @param {import('vue').Ref<boolean>} options.isAdmin - Indicates if current user is admin.
 * @param {Function} options.onClaimCreated - Callback invoked after a claim is submitted.
 * @returns {Object} Claim creation state and handler methods.
 */
export function useClaimForm({ isAdmin, onClaimCreated }) {
  /**
   * Modal dialog visibility flag for new claim submission.
   */
  const createOpen = ref(false);

  /**
   * Form input state for new claim.
   */
  const form = reactive({
    warrantyId: null,
    customerId: null,
    problem: '',
    outOfWarrantyNote: '',
  });

  /**
   * Field-level validation error messages.
   */
  const fieldErrors = ref({});

  /**
   * Operation error message banner.
   */
  const formError = ref('');

  /**
   * Network in-flight state.
   */
  const saving = ref(false);

  /**
   * Live search query for warranty lookup.
   */
  const warrantySearch = ref('');

  /**
   * Live search query for customer lookup.
   */
  const customerSearch = ref('');

  /**
   * Warranty options returned from server query.
   */
  const warranties = ref([]);

  /**
   * Customer options with phone numbers returned from server query.
   */
  const customers = ref([]);

  /**
   * Currently active selected warranty item.
   */
  const selectedWarrantyItem = ref(null);

  /**
   * Currently active selected customer item.
   */
  const selectedCustomerItem = ref(null);

  /**
   * Finds the active warranty object associated with the create form.
   */
  const selectedWarranty = computed(() => {
    const matchInList = warranties.value.find((w) => {
      return w.id === form.warrantyId;
    });

    if (matchInList) {
      return matchInList;
    }

    if (selectedWarrantyItem.value?.id === form.warrantyId) {
      return selectedWarrantyItem.value;
    }

    return null;
  });

  /**
   * Eligible warranty options for creating a claim.
   * Admins may file expired warranties with an explanatory note; staff require Active status.
   */
  const warrantyOptions = computed(() => {
    const isEligible = (warranty) => {
      const isUsable = warranty.usable;
      const isValid = isAdmin.value || warranty.validity === 'Active';
      return isUsable && isValid;
    };

    const eligibleList = warranties.value.filter(isEligible);

    // Keep currently selected item visible in dropdown even if not in the current search page
    if (selectedWarrantyItem.value && isEligible(selectedWarrantyItem.value)) {
      const alreadyPresent = eligibleList.some((item) => {
        return item.id === selectedWarrantyItem.value.id;
      });

      if (!alreadyPresent) {
        eligibleList.unshift(selectedWarrantyItem.value);
      }
    }

    return eligibleList;
  });

  /**
   * Customer options with phone numbers for claim notifications.
   */
  const customerOptions = computed(() => {
    const withPhone = customers.value.filter((cust) => {
      return Boolean(cust.phone);
    });

    if (selectedCustomerItem.value?.phone) {
      const alreadyPresent = withPhone.some((item) => {
        return item.id === selectedCustomerItem.value.id;
      });

      if (!alreadyPresent) {
        withPhone.unshift(selectedCustomerItem.value);
      }
    }

    return withPhone;
  });

  /**
   * Searches warranties by serial, SKU, or product name.
   *
   * @param {string} queryText - Search text.
   */
  async function loadWarrantyOptions(queryText = '') {
    try {
      const query = new URLSearchParams({
        validity: 'all',
        page_size: '100',
      });

      if (queryText.trim()) {
        query.set('q', queryText.trim());
      }

      const result = await apiRequest(`/warranties?${query}`);
      warranties.value = result.items || [];
    } catch (requestError) {
      formError.value = requestError.message;
    }
  }

  /**
   * Searches customers by phone or name.
   *
   * @param {string} queryText - Search text.
   */
  async function loadCustomerOptions(queryText = '') {
    try {
      const query = new URLSearchParams({
        page_size: '100',
      });

      if (queryText.trim()) {
        query.set('q', queryText.trim());
      }

      const result = await apiRequest(`/customers?${query}`);
      customers.value = result.items || [];
    } catch (requestError) {
      formError.value = requestError.message;
    }
  }

  let warrantySearchTimer = null;
  let customerSearchTimer = null;

  watch(warrantySearch, (newSearch) => {
    if (warrantySearchTimer) {
      clearTimeout(warrantySearchTimer);
    }
    warrantySearchTimer = setTimeout(() => {
      loadWarrantyOptions(newSearch || '');
    }, 250);
  });

  watch(customerSearch, (newSearch) => {
    if (customerSearchTimer) {
      clearTimeout(customerSearchTimer);
    }
    customerSearchTimer = setTimeout(() => {
      loadCustomerOptions(newSearch || '');
    }, 250);
  });

  watch(
    () => form.warrantyId,
    (newWarrantyId) => {
      selectedWarrantyItem.value =
        warranties.value.find((w) => w.id === newWarrantyId) || null;
      form.customerId = null;
    }
  );

  watch(
    () => form.customerId,
    (newCustomerId) => {
      selectedCustomerItem.value =
        customers.value.find((c) => c.id === newCustomerId) || null;
    }
  );

  onBeforeUnmount(() => {
    if (warrantySearchTimer) {
      clearTimeout(warrantySearchTimer);
    }
    if (customerSearchTimer) {
      clearTimeout(customerSearchTimer);
    }
  });

  /**
   * Opens the create claim modal dialog.
   */
  function openCreateClaim() {
    formError.value = '';
    fieldErrors.value = {};
    Object.assign(form, {
      warrantyId: null,
      customerId: null,
      problem: '',
      outOfWarrantyNote: '',
    });
    warrantySearch.value = '';
    customerSearch.value = '';
    createOpen.value = true;
  }

  /**
   * Submits a new warranty claim.
   */
  async function create() {
    saving.value = true;
    formError.value = '';
    fieldErrors.value = {};

    try {
      const body = {
        warrantyId: form.warrantyId,
        problem: form.problem,
      };

      if (form.customerId) {
        body.customerId = form.customerId;
      }
      if (form.outOfWarrantyNote) {
        body.outOfWarrantyNote = form.outOfWarrantyNote;
      }

      await apiRequest('/claims', {
        method: 'POST',
        body,
      });

      createOpen.value = false;
      Object.assign(form, {
        warrantyId: null,
        customerId: null,
        problem: '',
        outOfWarrantyNote: '',
      });

      warrantySearch.value = '';
      customerSearch.value = '';
      selectedWarrantyItem.value = null;
      selectedCustomerItem.value = null;

      if (typeof onClaimCreated === 'function') {
        await onClaimCreated();
      }
    } catch (requestError) {
      const mapped = fieldErrorsFrom(requestError);
      fieldErrors.value = mapped.fields;
      formError.value = mapped.globalMessage;
    } finally {
      saving.value = false;
    }
  }

  return {
    createOpen,
    form,
    fieldErrors,
    formError,
    saving,
    warrantySearch,
    customerSearch,
    warranties,
    customers,
    selectedWarranty,
    warrantyOptions,
    customerOptions,
    selectedWarrantyItem,
    selectedCustomerItem,
    formatWarrantyLabel,
    loadWarrantyOptions,
    loadCustomerOptions,
    openCreateClaim,
    create,
  };
}

