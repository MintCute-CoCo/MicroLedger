import { computed, ref } from 'vue';
import { apiRequest } from '../../api/client.js';
import { useNotificationsStore } from '../../stores/notifications.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';

/**
 * Parses user-typed price string to cents with validation.
 *
 * @param {string|number} value - Raw input string.
 * @returns {number|null} Valid cents integer or null.
 */
export function parsePriceInput(value) {
  const cleaned = String(value ?? '').trim().replace(/[$,\s]/g, '');

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null;
  }

  const [whole, fraction = ''] = cleaned.split('.');
  const wholeCents = Number(whole) * 100;
  const fractionCents = Number(fraction.padEnd(2, '0'));

  return wholeCents + fractionCents;
}

/**
 * Composable managing product creation and edit modal forms, validation rules,
 * field-level error mapping, and active/inactive status toggling.
 *
 * @param {Object} options - Configuration options.
 * @param {import('vue').Ref<Object|null>} options.user - Current user object.
 * @param {import('vue').Ref<Array>} options.apiCategories - Categories list reference.
 * @param {Function} options.onSuccess - Callback to refresh product table after mutations.
 * @returns {Object} Product form reactive state and mutation methods.
 */
export function useProductForm({
  user,
  apiCategories,
  onSuccess,
}) {
  const notifications = useNotificationsStore();
  /**
   * Modal dialog visibility state for creating/editing products.
   */
  const createDialog = ref(false);

  /**
   * Reference to product record currently being edited, or null if creating new.
   */
  const editingProduct = ref(null);

  /**
   * Form submission network in-flight indicator.
   */
  const saving = ref(false);

  /**
   * Field-level validation error messages.
   */
  const fieldErrors = ref({});

  /**
   * Operation-level error message.
   */
  const formError = ref('');

  /**
   * Default blank product draft.
   */
  const defaultDraft = {
    sku: '',
    name: '',
    category: '',
    unit: 'pcs',
    price: '',
    cost: '',
    stock: '0',
    reorder: '5',
    warranty: '0',
    tracksSerial: false,
  };

  /**
   * Active draft form object.
   */
  const draft = ref({ ...defaultDraft });

  /**
   * Evaluates if current user can create or edit products.
   */
  const canEdit = computed(() => {
    return user.value?.role === 'admin';
  });

  /**
   * Active category options available when creating a new product.
   */
  const activeCategoryOptions = computed(() => {
    const categories = apiCategories.value || [];
    return categories
      .filter((cat) => cat.status === 'active')
      .map((cat) => ({
        title: cat.name,
        value: cat.id,
      }));
  });

  /**
   * Category options available when editing (preserves currently assigned category).
   */
  const productCategoryOptions = computed(() => {
    const currentCategoryId = editingProduct.value?.categoryId;
    const categories = apiCategories.value || [];

    return categories
      .filter((cat) => cat.status === 'active' || String(cat.id) === String(currentCategoryId))
      .map((cat) => ({
        title: cat.name,
        value: cat.id,
      }));
  });

  /**
   * Opens the product creation dialog with default values.
   */
  function openCreate() {
    editingProduct.value = null;

    const categories = apiCategories.value || [];
    const firstActiveCategory = categories.find((item) => item.status === 'active');
    const defaultCategory = firstActiveCategory?.id || '';

    draft.value = {
      sku: '',
      name: '',
      category: defaultCategory,
      unit: 'pcs',
      price: '',
      cost: '',
      stock: '0',
      reorder: '5',
      warranty: '0',
      tracksSerial: false,
    };

    formError.value = '';
    fieldErrors.value = {};
    createDialog.value = true;
  }

  /**
   * Opens the edit modal populating fields with existing product data.
   *
   * @param {Object} product - Product record to edit.
   */
  function openEdit(product) {
    editingProduct.value = product;

    let assignedCategoryId = product.categoryId;
    if (!assignedCategoryId) {
      const categories = apiCategories.value || [];
      const match = categories.find((cat) => cat.name === product.category);
      assignedCategoryId = match?.id || '';
    }

    const priceFormatted = (product.price / 100).toFixed(2);
    let costFormatted = '';
    if (product.cost !== undefined) {
      costFormatted = (product.cost / 100).toFixed(2);
    }

    draft.value = {
      sku: product.sku,
      name: product.name,
      category: assignedCategoryId || product.category || '',
      unit: product.unit || 'pcs',
      price: priceFormatted,
      cost: costFormatted,
      stock: String(product.stock),
      reorder: String(product.reorder),
      warranty: String(product.warrantyMonths ?? 0),
      tracksSerial: Boolean(product.tracksSerial),
    };

    formError.value = '';
    fieldErrors.value = {};
    createDialog.value = true;
  }

  /**
   * Toggles product active/inactive status with confirmation protection when stock exists.
   *
   * @param {Object} product - Product record to toggle.
   */
  async function toggleProductStatus(product) {
    const nextStatus = product.status === 'active' ? 'inactive' : 'active';

    let confirmDeactivate = true;
    if (nextStatus === 'inactive') {
      const stockNote =
        product.stock > 0 ? ` It currently has ${product.stock} units in stock.` : '';
      confirmDeactivate = window.confirm(`Deactivate ${product.name}?${stockNote}`);
    }

    if (!confirmDeactivate) {
      return;
    }

    formError.value = '';

    try {
      await apiRequest(`/products/${product.id}`, {
        method: 'PATCH',
        body: {
          status: nextStatus,
          confirmDeactivate,
        },
      });

      if (typeof onSuccess === 'function') {
        await onSuccess();
      }
    } catch (requestError) {
      formError.value = requestError.message;
    }
  }

  /**
   * Validates and submits product creation or updates.
   */
  async function saveProduct() {
    const cleanSku = draft.value.sku.trim();

    const priceCents = parsePriceInput(draft.value.price);
    const costCents = draft.value.cost ? parsePriceInput(draft.value.cost) : 0;

    const invalidNumbers =
      priceCents === null ||
      costCents === null ||
      Number(draft.value.stock) < 0 ||
      Number(draft.value.reorder) < 0;

    if (invalidNumbers) {
      notifications.notify('Enter valid prices and non-negative stock values.');
      return;
    }

    saving.value = true;
    formError.value = '';
    fieldErrors.value = {};

    try {
      const productPayload = {
        name: draft.value.name.trim(),
        categoryId: draft.value.category,
        unit: draft.value.unit.trim() || 'pcs',
        sellingPrice: String(draft.value.price),
        costPrice: draft.value.cost ? String(draft.value.cost) : '0',
        reorderLevel: Number(draft.value.reorder),
        warrantyMonths: Number(draft.value.warranty),
        tracksSerial: Boolean(draft.value.tracksSerial),
      };

      if (editingProduct.value) {
        await apiRequest(`/products/${editingProduct.value.id}`, {
          method: 'PATCH',
          body: productPayload,
        });
      } else {
        await apiRequest('/products', {
          method: 'POST',
          body: {
            ...productPayload,
            sku: cleanSku,
            openingStock: Number(draft.value.stock),
          },
        });
      }

      if (typeof onSuccess === 'function') {
        await onSuccess();
      }

      createDialog.value = false;
    } catch (requestError) {
      const mapped = fieldErrorsFrom(requestError, {
        categoryId: 'category',
        costPrice: 'cost',
        sellingPrice: 'price',
        openingStock: 'stock',
        reorderLevel: 'reorder',
        warrantyMonths: 'warranty',
      });

      fieldErrors.value = mapped.fields;
      formError.value = mapped.globalMessage;
    } finally {
      saving.value = false;
    }
  }

  return {
    createDialog,
    editingProduct,
    saving,
    fieldErrors,
    formError,
    draft,
    canEdit,
    activeCategoryOptions,
    productCategoryOptions,
    openCreate,
    openEdit,
    toggleProductStatus,
    saveProduct,
  };
}

