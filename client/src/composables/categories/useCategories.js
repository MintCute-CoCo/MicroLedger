import { computed, onMounted, ref } from 'vue';
import { apiRequest } from '../../api/client.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';

/**
 * Composable managing product catalog category taxonomies,
 * modal form validation, and active/inactive status transitions.
 *
 * @returns {Object} Reactive state, table column specs, and category actions.
 */
export function useCategories() {
  /**
   * Reactive state for categories catalogue view.
   */
  const categories = ref([]);
  const loading = ref(true);
  const saving = ref(false);
  const dialog = ref(false);
  const error = ref('');
  const editing = ref(null);
  const draft = ref({ name: '', description: '' });
  const fieldErrors = ref({});

  /**
   * Counts active categories for the summary card.
   *
   * @returns {number} Number of categories with active status.
   */
  function countActiveCategories() {
    const activeCategories = categories.value.filter((category) => {
      return category.status === 'active';
    });

    return activeCategories.length;
  }

  const activeCategoryCount = computed(countActiveCategories);

  /**
   * Table columns layout for categories list.
   */
  const tableHeaders = [
    { title: 'CATEGORY', key: 'name' },
    { title: 'DESCRIPTION', key: 'description' },
    { title: 'ACTIVE PRODUCTS', key: 'activeProductCount', align: 'end' },
    { title: 'STATUS', key: 'status' },
    { title: '', key: 'actions', sortable: false, align: 'end' },
  ];

  /**
   * Loads all product categories including active and inactive items.
   */
  async function load() {
    loading.value = true;
    error.value = '';

    try {
      const response = await apiRequest('/categories?status=all');
      categories.value = response.items;
    } catch (requestError) {
      error.value = requestError.message;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Opens dialog modal for creating a new product category.
   */
  function openCreate() {
    editing.value = null;
    draft.value = {
      name: '',
      description: '',
    };
    error.value = '';
    fieldErrors.value = {};
    dialog.value = true;
  }

  /**
   * Opens dialog modal for editing an existing product category.
   *
   * @param {Object} category - Selected category record.
   */
  function openEdit(category) {
    editing.value = category;
    draft.value = {
      name: category.name,
      description: category.description || '',
    };
    error.value = '';
    fieldErrors.value = {};
    dialog.value = true;
  }

  /**
   * Saves category changes (either creates new or updates existing).
   */
  async function save() {
    const trimmedName = draft.value.name.trim();
    if (!trimmedName) {
      return;
    }

    saving.value = true;
    error.value = '';
    fieldErrors.value = {};

    try {
      const payload = {
        name: trimmedName,
        description: draft.value.description.trim() || null,
      };

      if (editing.value) {
        await apiRequest(`/categories/${editing.value.id}`, {
          method: 'PATCH',
          body: payload,
        });
      } else {
        await apiRequest('/categories', {
          method: 'POST',
          body: payload,
        });
      }

      dialog.value = false;
      await load();
    } catch (requestError) {
      const mapped = fieldErrorsFrom(requestError);
      fieldErrors.value = mapped.fields;
      error.value = mapped.globalMessage;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Toggles category active status (activation or deactivation).
   * Deactivation is prevented if category contains active products.
   *
   * @param {Object} category - Selected category record.
   */
  async function toggleStatus(category) {
    if (category.status === 'active') {
      const confirmed = window.confirm(`Deactivate ${category.name}?`);
      if (!confirmed) {
        return;
      }
    }

    error.value = '';

    try {
      const nextStatus = category.status === 'active' ? 'inactive' : 'active';
      const updated = await apiRequest(`/categories/${category.id}`, {
        method: 'PATCH',
        body: { status: nextStatus },
      });

      // Update the record in local state with an explicit multi-line map
      categories.value = categories.value.map((item) => {
        if (item.id === updated.id) {
          return {
            ...item,
            ...updated,
          };
        }
        return item;
      });
    } catch (requestError) {
      error.value = requestError.message;
    }
  }

  onMounted(load);

  return {
    categories,
    activeCategoryCount,
    loading,
    saving,
    dialog,
    error,
    editing,
    draft,
    fieldErrors,
    tableHeaders,
    load,
    openCreate,
    openEdit,
    save,
    toggleStatus,
  };
}

