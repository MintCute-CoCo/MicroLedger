import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { apiRequest } from '../../api/client.js';
import { useAuthStore } from '../../stores/auth.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';

/**
 * Composable providing warranty tracking, manual warranty issuance,
 * and customer attachment capabilities for retail merchandise.
 *
 * Designed to separate API queries, debounced autocomplete buffers,
 * and form validation state away from the presentation layer.
 *
 * @returns {Object} Reactive state, computed options, and actions.
 */
export function useWarranties() {
  const auth = useAuthStore();
  const isAdmin = computed(() => auth.user?.role === 'admin');

  /**
   * Warranties list state and pagination.
   */
  const rows = ref([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(10);
  const search = ref('');
  const error = ref('');
  const busy = ref(false);

  /**
   * Autocomplete options and search buffers.
   */
  const products = ref([]);
  const customers = ref([]);
  const productSearch = ref('');
  const customerSearch = ref('');
  const selectedProductItem = ref(null);
  const selectedCustomerItem = ref(null);

  /**
   * Dialog states and form drafts.
   */
  const manualOpen = ref(false);
  const attachOpen = ref(false);
  const selected = ref(null);
  const attachCustomerId = ref(null);
  const fieldErrors = ref({});

  const form = reactive({
    productId: null,
    customerId: null,
    startDate: '',
    warrantyMonths: null,
  });

  /**
   * Table column layout for warranties list.
   */
  const tableHeaders = [
    { title: 'PRODUCT', key: 'product_name' },
    { title: 'SKU', key: 'sku' },
    { title: 'CUSTOMER', key: 'customer_name' },
    { title: 'SALE', key: 'sale_no' },
    { title: 'SERIAL', key: 'serial_no' },
    { title: 'COVERAGE', key: 'expiry_date' },
    { title: 'STATUS', key: 'validity' },
    { title: '', key: 'actions', sortable: false },
  ];

  /**
   * Dynamic product options preserving selected item if search clears.
   */
  const productOptions = computed(() => {
    const options = [...products.value];
    if (selectedProductItem.value) {
      const exists = options.some((item) => item.id === selectedProductItem.value.id);
      if (!exists) {
        options.unshift(selectedProductItem.value);
      }
    }
    return options;
  });

  /**
   * Dynamic customer options preserving selected item if search clears.
   */
  const customerOptions = computed(() => {
    const options = [...customers.value];
    if (selectedCustomerItem.value) {
      const exists = options.some((item) => item.id === selectedCustomerItem.value.id);
      if (!exists) {
        options.unshift(selectedCustomerItem.value);
      }
    }
    return options;
  });

  /**
   * Fetches paginated warranties based on current filters and page.
   */
  async function load() {
    busy.value = true;
    try {
      const params = new URLSearchParams({
        page: String(page.value),
        page_size: String(pageSize.value),
      });

      const trimmedSearch = search.value.trim();
      if (trimmedSearch) {
        params.set('q', trimmedSearch);
      }

      const result = await apiRequest(`/warranties?${params}`);
      rows.value = result.items;
      total.value = result.total;
      error.value = '';
    } catch (e) {
      error.value = e.message;
    } finally {
      busy.value = false;
    }
  }

  /**
   * Searches active products for warranty issuance.
   *
   * @param {string} [term=''] - Search keyword.
   */
  async function loadProducts(term = '') {
    try {
      const params = new URLSearchParams({
        status: 'active',
        page_size: '100',
      });

      const trimmed = term.trim();
      if (trimmed) {
        params.set('q', trimmed);
      }

      const response = await apiRequest(`/products?${params}`);
      products.value = response.items;
    } catch (e) {
      error.value = e.message;
    }
  }

  /**
   * Searches customers for warranty attachment or manual creation.
   *
   * @param {string} [term=''] - Search keyword.
   */
  async function loadCustomers(term = '') {
    try {
      const params = new URLSearchParams({
        page_size: '100',
      });

      const trimmed = term.trim();
      if (trimmed) {
        params.set('q', trimmed);
      }

      const response = await apiRequest(`/customers?${params}`);
      customers.value = response.items;
    } catch (e) {
      error.value = e.message;
    }
  }

  /**
   * Debounce timers for search fields.
   */
  let searchTimer = null;
  let productTimer = null;
  let customerTimer = null;

  watch(search, () => {
    page.value = 1;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 250);
  });

  watch(productSearch, (term) => {
    clearTimeout(productTimer);
    productTimer = setTimeout(() => {
      loadProducts(term || '');
    }, 250);
  });

  watch(customerSearch, (term) => {
    clearTimeout(customerTimer);
    customerTimer = setTimeout(() => {
      loadCustomers(term || '');
    }, 250);
  });

  watch(
    () => form.productId,
    (id) => {
      const found = products.value.find((item) => item.id === id);
      if (found) {
        selectedProductItem.value = found;
      }
    }
  );

  watch(
    () => form.customerId,
    (id) => {
      const found = customers.value.find((item) => item.id === id);
      if (found) {
        selectedCustomerItem.value = found;
      }
    }
  );

  watch(attachCustomerId, (id) => {
    const found = customers.value.find((item) => item.id === id);
    if (found) {
      selectedCustomerItem.value = found;
    }
  });

  /**
   * Handles server-side table pagination updates.
   *
   * @param {Object} options - Table options object.
   */
  function onTableOptions(options) {
    const nextPage = options.page || 1;
    const nextPageSize = options.itemsPerPage || pageSize.value;

    if (nextPage === page.value && nextPageSize === pageSize.value) {
      return;
    }

    page.value = nextPage;
    pageSize.value = nextPageSize;
    load();
  }

  /**
   * Opens dialog for manual warranty creation.
   */
  function openManual() {
    Object.assign(form, {
      productId: null,
      customerId: null,
      startDate: '',
      warrantyMonths: null,
    });

    selectedProductItem.value = null;
    selectedCustomerItem.value = null;
    productSearch.value = '';
    customerSearch.value = '';
    error.value = '';
    fieldErrors.value = {};
    manualOpen.value = true;
  }

  /**
   * Opens dialog for attaching a customer to an anonymous warranty.
   *
   * @param {Object} row - Selected warranty row.
   */
  function openAttach(row) {
    selected.value = row;
    attachCustomerId.value = null;
    selectedCustomerItem.value = null;
    customerSearch.value = '';
    error.value = '';
    fieldErrors.value = {};

    if (!customerOptions.value.length) {
      loadCustomers();
    }

    attachOpen.value = true;
  }

  /**
   * Submits manual warranty creation payload.
   */
  async function create() {
    busy.value = true;
    error.value = '';
    fieldErrors.value = {};

    try {
      const body = {
        productId: form.productId,
        customerId: form.customerId,
      };

      if (form.startDate) {
        body.startDate = form.startDate;
      }

      if (form.warrantyMonths) {
        body.warrantyMonths = Number(form.warrantyMonths);
      }

      await apiRequest('/warranties/manual', {
        method: 'POST',
        body,
      });

      manualOpen.value = false;
      Object.assign(form, {
        productId: null,
        customerId: null,
        startDate: '',
        warrantyMonths: null,
      });

      selectedProductItem.value = null;
      selectedCustomerItem.value = null;
      productSearch.value = '';
      customerSearch.value = '';

      await load();
    } catch (e) {
      const mapped = fieldErrorsFrom(e);
      fieldErrors.value = mapped.fields;
      error.value = mapped.globalMessage;
    } finally {
      busy.value = false;
    }
  }

  /**
   * Submits customer attachment for a walk-in warranty.
   */
  async function attach() {
    if (!selected.value || !attachCustomerId.value) {
      return;
    }

    busy.value = true;
    error.value = '';
    fieldErrors.value = {};

    try {
      await apiRequest(`/warranties/${selected.value.id}/customer`, {
        method: 'PATCH',
        body: {
          customerId: attachCustomerId.value,
        },
      });

      attachOpen.value = false;
      selectedCustomerItem.value = null;
      customerSearch.value = '';

      await load();
    } catch (e) {
      const mapped = fieldErrorsFrom(e, { customerId: 'attachCustomerId' });
      fieldErrors.value = mapped.fields;
      error.value = mapped.globalMessage;
    } finally {
      busy.value = false;
    }
  }

  onMounted(async () => {
    await load();
    if (isAdmin.value) {
      await Promise.all([loadProducts(), loadCustomers()]);
    }
  });

  onBeforeUnmount(() => {
    clearTimeout(searchTimer);
    clearTimeout(productTimer);
    clearTimeout(customerTimer);
  });

  return {
    isAdmin,
    rows,
    total,
    page,
    pageSize,
    search,
    error,
    busy,
    productOptions,
    customerOptions,
    productSearch,
    customerSearch,
    manualOpen,
    attachOpen,
    selected,
    attachCustomerId,
    fieldErrors,
    form,
    tableHeaders,
    openManual,
    openAttach,
    create,
    attach,
    onTableOptions,
    load,
  };
}

