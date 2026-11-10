<script setup>
import ProductCatalogSection from '../components/products/ProductCatalogSection.vue';
import ProductFormDialog from '../components/products/ProductFormDialog.vue';
import ProductSummaryCards from '../components/products/ProductSummaryCards.vue';
import { displaySettings } from '../utils/format.js';
import { useProducts } from '../composables/products/useProducts.js';

/**
 * Products Catalog View.
 *
 * Provides inventory managers and administrators with a comprehensive interface to search,
 * filter, sort, paginate, create, edit, deactivate, and export products.
 */
const {
  search,
  category,
  statusFilter,
  lowStockOnly,
  minStock,
  maxStock,
  minPrice,
  maxPrice,
  advancedOpen,
  apiCategories,
  apiPage,
  loading,
  error,
  createDialog,
  editingProduct,
  saving,
  fieldErrors,
  draft,
  canEdit,
  categories,
  statuses,
  activeCategoryOptions,
  productCategoryOptions,
  productRows,
  productTotal,
  lowStockCount,
  headers,
  categoryIcon,
  onTableOptions,
  exportFilteredProducts,
  openCreate,
  openEdit,
  toggleProductStatus,
  saveProduct,
  updateDraft,
  clearFieldError,
} = useProducts();

/**
 * Validation rule ensuring a required form input is non-empty.
 */
const required = [
  (value) => Boolean(String(value ?? '').trim()) || 'This field is required.',
];
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6 products-page">
    <!-- Header Section with actions -->
    <div class="page-heading">
      <div>
        <div class="text-overline text-medium-emphasis">
          CATALOG
        </div>
        <h1 class="text-h5 font-weight-bold">Products</h1>
        <p class="text-body-2 text-medium-emphasis">Manage your product catalog and pricing.</p>
      </div>

      <div class="d-flex flex-wrap ga-2">
        <!-- Excel Export Action -->
        <v-btn
          v-if="canEdit"
          variant="outlined"
          rounded="lg"
          class="w-100 w-sm-auto"
          prepend-icon="mdi-download"
          @click="exportFilteredProducts"
        >
          Export filtered
        </v-btn>

        <!-- Bulk Import Link -->
        <v-btn
          v-if="canEdit"
          to="/imports"
          variant="outlined"
          rounded="lg"
          class="w-100 w-sm-auto"
          prepend-icon="mdi-tray-arrow-down"
        >
          Import
        </v-btn>

        <!-- Create Product Modal Trigger -->
        <v-btn
          v-if="canEdit"
          color="primary"
          rounded="lg"
          class="w-100 w-sm-auto"
          prepend-icon="mdi-plus"
          @click="openCreate"
        >
          New product
        </v-btn>
      </div>
    </div>

    <!-- Global Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="comfortable"
      class="users-alert"
    >
      {{ error }}
    </v-alert>

    <ProductSummaryCards
      :product-total="productTotal"
      :category-count="apiCategories.length"
      :low-stock-count="lowStockCount"
    />

    <ProductCatalogSection
      v-model:search="search"
      v-model:category="category"
      v-model:status-filter="statusFilter"
      v-model:low-stock-only="lowStockOnly"
      v-model:advanced-open="advancedOpen"
      v-model:min-stock="minStock"
      v-model:max-stock="maxStock"
      v-model:min-price="minPrice"
      v-model:max-price="maxPrice"
      :api-mode="true"
      :can-edit="canEdit"
      :categories="categories"
      :statuses="statuses"
      :headers="headers"
      :items="productRows"
      :items-length="productTotal"
      :page="apiPage"
      :loading="loading"
      :category-icon="categoryIcon"
      @options="onTableOptions"
      @edit="openEdit"
      @toggle-status="toggleProductStatus"
    />
    <!-- Create / Edit Product Modal Dialog -->
    <ProductFormDialog
      v-model:open="createDialog"
      :editing-product="editingProduct"
      :draft="draft"
      :field-errors="fieldErrors"
      :error="error"
      :saving="saving"
      :active-category-options="activeCategoryOptions"
      :product-category-options="productCategoryOptions"
      :currency-code="displaySettings.currency_code"
      :required-rule="required"
      @update:draft="updateDraft"
      @clear-error="clearFieldError"
      @submit="saveProduct"
    />
  </v-container>
</template>

