<script setup>
import WarrantyDialogs from '../components/warranties/WarrantyDialogs.vue';
import WarrantyRecordsSection from '../components/warranties/WarrantyRecordsSection.vue';
import { useWarranties } from '../composables/warranties/useWarranties.js';

const {
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
} = useWarranties();
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6">
    <div class="page-heading">
      <div>
        <div class="text-overline text-medium-emphasis">WARRANTY</div>
        <h1 class="text-h5 font-weight-bold">Warranty records</h1>
        <p class="text-body-2 text-medium-emphasis">
          Search product coverage and attach customer details.
        </p>
      </div>
      <v-btn
        v-if="isAdmin"
        color="primary"
        rounded="lg"
        class="w-100 w-sm-auto"
        prepend-icon="mdi-plus"
        @click="openManual"
      >
        Manual warranty
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
      {{ error }}
    </v-alert>

    <WarrantyRecordsSection
      v-model:search="search"
      :total="total"
      :headers="tableHeaders"
      :items="rows"
      :page="page"
      :page-size="pageSize"
      :loading="busy"
      @options="onTableOptions"
      @refresh="load"
      @attach="openAttach"
    />

    <WarrantyDialogs
      v-model:manual-open="manualOpen"
      v-model:attach-open="attachOpen"
      v-model:product-search="productSearch"
      v-model:customer-search="customerSearch"
      v-model:attach-customer-id="attachCustomerId"
      :busy="busy"
      :error="error"
      :products="productOptions"
      :customers="customerOptions"
      :field-errors="fieldErrors"
      :form="form"
      @create="create"
      @attach="attach"
    />
  </v-container>
</template>
