import { computed, onMounted, reactive, ref } from 'vue';
import { apiRequest } from '../../api/client.js';
import { useAuthStore } from '../../stores/auth.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';

/**
 * Composable managing supplier profiles, vendor contact details,
 * create/edit dialog states, and active/inactive status toggling.
 *
 * @returns {Object} Reactive state, table column specs, and supplier actions.
 */
export function useSuppliers() {
  const auth = useAuthStore();
  const isAdmin = computed(() => auth.user?.role === 'admin');

  /**
   * Reactive component state.
   */
  const rows = ref([]);
  const error = ref('');
  const busy = ref(false);
  const open = ref(false);
  const editing = ref(null);
  const fieldErrors = ref({});

  /**
   * Counts active supplier records for the directory summary.
   *
   * @returns {number} Number of active suppliers.
   */
  function countActiveSuppliers() {
    const activeRows = rows.value.filter((supplier) => {
      return supplier.status === 'active';
    });

    return activeRows.length;
  }

  const activeSupplierCount = computed(countActiveSuppliers);

  /**
   * Form draft state for supplier create/edit.
   */
  const form = reactive({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    notes: '',
  });

  /**
   * Table column definitions for suppliers list.
   */
  const tableHeaders = [
    { title: 'SUPPLIER', key: 'name' },
    { title: 'CONTACT', key: 'contact_person' },
    { title: 'PHONE', key: 'phone' },
    { title: 'EMAIL', key: 'email' },
    { title: 'STATUS', key: 'status' },
    { title: '', key: 'actions', sortable: false },
  ];

  /**
   * Loads all suppliers including active and inactive records.
   */
  async function load() {
    busy.value = true;
    try {
      const response = await apiRequest('/suppliers?status=all');
      rows.value = response.items;
      error.value = '';
    } catch (e) {
      error.value = e.message;
    } finally {
      busy.value = false;
    }
  }

  /**
   * Opens dialog modal to create or edit a supplier.
   *
   * @param {Object|null} row - Existing supplier or null for create.
   */
  function start(row = null) {
    editing.value = row;
    error.value = '';
    fieldErrors.value = {};

    if (row) {
      form.name = row.name;
      form.contact_person = row.contact_person || '';
      form.phone = row.phone || '';
      form.email = row.email || '';
      form.notes = row.notes || '';
    } else {
      form.name = '';
      form.contact_person = '';
      form.phone = '';
      form.email = '';
      form.notes = '';
    }

    open.value = true;
  }

  /**
   * Submits supplier create or update payload.
   */
  async function save() {
    busy.value = true;
    error.value = '';
    fieldErrors.value = {};

    try {
      const body = {
        name: form.name.trim(),
        contact_person: form.contact_person.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (editing.value) {
        await apiRequest(`/suppliers/${editing.value.id}`, {
          method: 'PATCH',
          body,
        });
      } else {
        await apiRequest('/suppliers', {
          method: 'POST',
          body,
        });
      }

      open.value = false;
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
   * Toggles supplier active/inactive status.
   *
   * @param {Object} row - Target supplier record.
   */
  async function toggle(row) {
    if (row.status === 'active') {
      const confirmed = window.confirm(`Deactivate ${row.name}?`);
      if (!confirmed) {
        return;
      }
    }

    try {
      const nextStatus = row.status === 'active' ? 'inactive' : 'active';
      await apiRequest(`/suppliers/${row.id}`, {
        method: 'PATCH',
        body: { status: nextStatus },
      });
      await load();
    } catch (e) {
      error.value = e.message;
    }
  }

  onMounted(load);

  return {
    isAdmin,
    rows,
    activeSupplierCount,
    error,
    busy,
    open,
    editing,
    fieldErrors,
    form,
    tableHeaders,
    load,
    start,
    save,
    toggle,
  };
}

