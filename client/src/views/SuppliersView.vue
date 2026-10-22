<script setup>
import ResponsiveTable from '../components/ResponsiveTable.vue';
import SupplierFormDialog from '../components/suppliers/SupplierFormDialog.vue';
import { useSuppliers } from '../composables/suppliers/useSuppliers.js';

const {
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
  start,
  save,
  toggle,
} = useSuppliers();
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6">
    <div class="page-heading">
      <div>
        <div class="text-overline text-medium-emphasis">WARRANTY</div>
        <h1 class="text-h5 font-weight-bold">Suppliers</h1>
        <p class="text-body-2 text-medium-emphasis">
          Keep supplier and service contact details for warranty claims.
        </p>
      </div>
      <v-btn
        v-if="isAdmin"
        color="primary"
        rounded="lg"
        class="w-100 w-sm-auto"
        prepend-icon="mdi-plus"
        @click="start()"
      >
        New supplier
      </v-btn>
    </div>

    <v-alert
      v-if="error && !open"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      {{ error }}
    </v-alert>

    <v-row class="mb-2">
      <v-col cols="12" sm="6">
        <v-card rounded="xl" variant="outlined" class="pa-4">
          <div class="text-caption text-medium-emphasis">Total suppliers</div>
          <div class="text-h6 font-weight-bold">{{ rows.length }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6">
        <v-card rounded="xl" variant="outlined" class="pa-4">
          <div class="text-caption text-medium-emphasis">Active suppliers</div>
          <div class="text-h6 font-weight-bold">{{ activeSupplierCount }}</div>
        </v-card>
      </v-col>
    </v-row>

    <v-card rounded="xl" variant="outlined">
      <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-2">
        <div>
          <div class="text-h6 font-weight-bold">Supplier directory</div>
          <div class="text-caption text-medium-emphasis">
            {{ rows.length }} suppliers registered for warranty support
          </div>
        </div>
        <v-chip color="primary" variant="tonal" size="small">
          {{ rows.length }} Suppliers
        </v-chip>
      </v-card-title>

      <ResponsiveTable
        :headers="tableHeaders"
        :items="rows"
        :loading="busy"
      >
        <template #item.actions="{ item }">
          <div v-if="isAdmin" class="d-flex">
            <v-btn
              icon="mdi-pencil-outline"
              variant="text"
              aria-label="Edit supplier"
              @click="start(item)"
            />
            <v-btn
              :icon="item.status === 'active' ? 'mdi-pause-circle-outline' : 'mdi-play-circle-outline'"
              variant="text"
              :aria-label="item.status === 'active' ? 'Deactivate supplier' : 'Activate supplier'"
              @click="toggle(item)"
            />
          </div>
        </template>
      </ResponsiveTable>
    </v-card>

    <SupplierFormDialog
      v-model:open="open"
      :busy="busy"
      :editing="editing"
      :error="error"
      :field-errors="fieldErrors"
      :form="form"
      @save="save"
    />
  </v-container>
</template>
