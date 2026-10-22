<script setup>
import CustomerDirectorySection from '../components/customers/CustomerDirectorySection.vue';
import CustomerFormDialog from '../components/customers/CustomerFormDialog.vue';
import { formatMoney } from '../utils/format.js';
import { useCustomers } from '../composables/customers/useCustomers.js';

/**
 * Customers Management View.
 *
 * Provides customer relationship management including phone contact lookup,
 * lifetime visit counts, total revenue contributions, and creation/editing dialogs.
 */
const {
  search,
  page,
  loading,
  saving,
  error,
  duplicateWarning,
  dialog,
  editingCustomer,
  draft,
  fieldErrors,
  headers,
  visibleCustomers,
  customerCount,
  onTableOptions,
  openCreate,
  openEdit,
  saveCustomer,
  auth,
  pageSize,
} = useCustomers();
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6 customers-page">
    <div class="page-heading">
      <div>
        <div class="text-overline text-medium-emphasis">RELATIONSHIPS</div>
        <h1 class="text-h5 font-weight-bold">Customers</h1>
        <p class="text-body-2 text-medium-emphasis">Keep customer details close at hand.</p>
      </div>

      <div class="d-flex flex-wrap ga-2">
        <v-btn
          color="primary"
          rounded="lg"
          class="w-100 w-sm-auto"
          prepend-icon="mdi-account-plus-outline"
          @click="openCreate"
        >
          Add customer
        </v-btn>
      </div>
    </div>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="comfortable"
      class="users-alert"
    >
      {{ error }}
    </v-alert>

    <v-alert
      v-if="duplicateWarning"
      type="warning"
      variant="tonal"
      density="comfortable"
      closable
      class="customer-warning"
      @click:close="duplicateWarning = null"
    >
      {{ duplicateWarning.message }} Existing customer:
      <strong>{{ duplicateWarning.existingCustomer.name }}</strong>
      · {{ duplicateWarning.existingCustomer.phone }}
    </v-alert>

    <CustomerDirectorySection
      v-model:search="search"
      :count="customerCount"
      :headers="headers"
      :items="visibleCustomers"
      :page="page"
      :page-size="pageSize"
      :loading="loading"
      @options="onTableOptions"
      @edit="openEdit"
    />
    <CustomerFormDialog
      v-model:open="dialog"
      :editing-customer="editingCustomer"
      :draft="draft"
      :field-errors="fieldErrors"
      :error="error"
      :saving="saving"
      @submit="saveCustomer"
    />
  </v-container>
</template>

