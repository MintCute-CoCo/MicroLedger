<script setup>
import CategoryManagementSection from '../components/categories/CategoryManagementSection.vue';
import CategoryFormDialog from '../components/categories/CategoryFormDialog.vue';
import { useCategories } from '../composables/categories/useCategories.js';

/**
 * Categories management composable managing taxonomies,
 * modal dialogs, and active/inactive status transitions.
 */
const {
  categories,
  loading,
  saving,
  dialog,
  error,
  editing,
  draft,
  fieldErrors,
  tableHeaders,
  openCreate,
  openEdit,
  save,
  toggleStatus,
  load,
} = useCategories();
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6 categories-page">
    <div class="page-heading">
      <div>
        <div class="text-overline text-medium-emphasis">CATALOG</div>
        <h1 class="text-h5 font-weight-bold">Categories</h1>
        <p class="text-body-2 text-medium-emphasis">Group products and keep inactive categories in existing records.</p>
      </div>

      <div class="d-flex flex-wrap ga-2">
        <v-btn
          color="primary"
          rounded="lg"
          class="w-100 w-sm-auto"
          prepend-icon="mdi-plus"
          @click="openCreate"
        >
          New category
        </v-btn>
      </div>
    </div>

    <v-alert
      v-if="error && !dialog"
      type="error"
      variant="tonal"
      density="comfortable"
      class="users-alert"
    >
      {{ error }}
    </v-alert>

    <CategoryManagementSection
      :categories="categories"
      :active-count="activeCategoryCount"
      :headers="tableHeaders"
      :loading="loading"
      @reload="load"
      @edit="openEdit"
      @toggle-status="toggleStatus"
    />
    <CategoryFormDialog
      v-model:open="dialog"
      :editing="editing"
      :draft="draft"
      :field-errors="fieldErrors"
      :error="error"
      :saving="saving"
      @save="save"
    />
  </v-container>
</template>

