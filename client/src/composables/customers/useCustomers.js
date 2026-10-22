import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { apiRequest } from '../../api/client.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';

/**
 * Standard table column headers for customer directory.
 */
export const CUSTOMER_TABLE_HEADERS = [
  { title: 'CUSTOMER', key: 'name' },
  { title: 'PHONE', key: 'phone' },
  { title: 'TOTAL VISITS', key: 'visits', align: 'end' },
  { title: 'LIFETIME SPEND', key: 'spent', align: 'end' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
];

/**
 * Converts decimal currency string/number into integer cents.
 *
 * @param {string|number} value - Decimal currency representation.
 * @returns {number} Integer cents.
 */
export function toCents(value) {
  const parts = String(value ?? '0').split('.');
  const wholePart = parts[0] || '0';
  const fractionPart = parts[1] || '';

  const wholeCents = Number(wholePart) * 100;
  const fractionCents = Number(fractionPart.padEnd(2, '0').slice(0, 2));

  return wholeCents + fractionCents;
}

/**
 * Derives uppercase 1-2 letter initials from customer name.
 *
 * @param {string} name - Customer full name.
 * @returns {string} 1-2 character initials.
 */
export function getCustomerInitials(name) {
  const parts = (name || '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }

  const initials = parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return initials || '?';
}

/**
 * Composable managing customer directory querying, search debouncing,
 * modal forms for create/edit, duplicate phone warnings, and pagination.
 *
 * Designed for university FYP evaluation following clean architecture.
 *
 * @returns {Object} Customer directory state and mutation methods.
 */
export function useCustomers() {
  /**
   * Search input text.
   */
  const search = ref('');

  /**
   * Remote customer directory records.
   */
  const apiCustomers = ref([]);

  /**
   * Total number of customer records.
   */
  const apiTotal = ref(0);

  /**
   * Current pagination page (1-based).
   */
  const page = ref(1);

  /**
   * Number of items displayed per page.
   */
  const pageSize = ref(8);

  /**
   * Data loading indicator.
   */
  const loading = ref(false);

  /**
   * Form save in-flight indicator.
   */
  const saving = ref(false);

  /**
   * User-facing error message banner.
   */
  const error = ref('');

  /**
   * Duplicate phone number warning banner.
   */
  const duplicateWarning = ref(null);

  /**
   * Modal dialog visibility state.
   */
  const dialog = ref(false);

  /**
   * Currently edited customer object, or null when registering new.
   */
  const editingCustomer = ref(null);

  /**
   * Customer input form draft.
   */
  const draft = ref({ name: '', phone: '' });

  /**
   * Field-level validation error messages.
   */
  const fieldErrors = ref({});

  /**
   * Filtered customer rows.
   */
  const visibleCustomers = computed(() => {
    return apiCustomers.value;
  });

  /**
   * Total customer count across the directory.
   */
  const customerCount = computed(() => {
    return apiTotal.value;
  });

  /**
   * Loads paginated customer directory from API with search keyword filter.
   */
  async function loadCustomers() {
    loading.value = true;
    error.value = '';

    try {
      const params = new URLSearchParams({
        page: String(page.value),
        page_size: String(pageSize.value),
      });

      const trimmed = search.value.trim();
      if (trimmed) {
        params.set('q', trimmed);
      }

      const result = await apiRequest(`/customers?${params}`);
      apiTotal.value = result.total || 0;

      const rawItems = result.items || [];
      apiCustomers.value = rawItems.map((item) => {
        const spentCents = toCents(item.lifetimeSpend);
        const initials = getCustomerInitials(item.name);

        return {
          ...item,
          phone: item.phone || '—',
          spent: spentCents,
          initials,
          tone: 'blue',
        };
      });
    } catch (requestError) {
      error.value = requestError.message;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Handles server-side table pagination and page-size changes.
   *
   * @param {Object} options - Table options.
   */
  function onTableOptions(options) {
    const nextPage = options.page || 1;
    const nextPageSize = options.itemsPerPage || pageSize.value;

    const isUnchanged =
      nextPage === page.value &&
      nextPageSize === pageSize.value;

    if (isUnchanged) {
      return;
    }

    page.value = nextPage;
    pageSize.value = nextPageSize;
    loadCustomers();
  }

  /**
   * Opens modal dialog to register a new customer.
   */
  function openCreate() {
    editingCustomer.value = null;
    draft.value = { name: '', phone: '' };
    error.value = '';
    fieldErrors.value = {};
    dialog.value = true;
  }

  /**
   * Opens modal dialog to edit an existing customer record.
   *
   * @param {Object} customer - Selected customer.
   */
  function openEdit(customer) {
    editingCustomer.value = customer;
    draft.value = {
      name: customer.name,
      phone: customer.phone === '—' ? '' : customer.phone,
    };
    error.value = '';
    fieldErrors.value = {};
    dialog.value = true;
  }

  /**
   * Saves customer information (create new or patch existing).
   */
  async function saveCustomer() {
    const name = draft.value.name.trim();
    const phone = draft.value.phone.trim();

    saving.value = true;
    error.value = '';
    duplicateWarning.value = null;
    fieldErrors.value = {};

    try {
      if (editingCustomer.value) {
        await apiRequest(`/customers/${editingCustomer.value.id}`, {
          method: 'PATCH',
          body: { name, phone },
        });
        await loadCustomers();
      } else {
        const result = await apiRequest('/customers', {
          method: 'POST',
          body: { name, phone },
        });
        duplicateWarning.value = result.warning || null;
        await loadCustomers();
      }

      dialog.value = false;
      draft.value = { name: '', phone: '' };
      editingCustomer.value = null;
    } catch (requestError) {
      const mapped = fieldErrorsFrom(requestError);
      fieldErrors.value = mapped.fields;
      error.value = mapped.globalMessage;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Debounce timer for customer search input.
   */
  let searchTimer = null;
  watch(search, () => {
    page.value = 1;
    if (searchTimer) {
      clearTimeout(searchTimer);
    }
    searchTimer = setTimeout(loadCustomers, 250);
  });

  onMounted(loadCustomers);

  onBeforeUnmount(() => {
    if (searchTimer) {
      clearTimeout(searchTimer);
    }
  });

  return {
    search,
    apiCustomers,
    apiTotal,
    page,
    pageSize,
    loading,
    saving,
    error,
    duplicateWarning,
    dialog,
    editingCustomer,
    draft,
    fieldErrors,
    headers: CUSTOMER_TABLE_HEADERS,
    visibleCustomers,
    customerCount,
    toCents,
    getCustomerInitials,
    loadCustomers,
    onTableOptions,
    openCreate,
    openEdit,
    saveCustomer,
  };
}

