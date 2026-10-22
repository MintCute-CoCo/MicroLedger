<script setup>
import InventoryStockSection from '../components/inventory/InventoryStockSection.vue';
import InventoryMovementSection from '../components/inventory/InventoryMovementSection.vue';
import InventoryMovementDialog from '../components/inventory/InventoryMovementDialog.vue';
import { useAuthStore } from '../stores/auth.js';
import { formatDateTime } from '../utils/format.js';
import { useInventory } from '../composables/inventory/useInventory.js';

const auth = useAuthStore();

/**
 * Extract inventory state, computed values, and actions from the composable.
 */
const {
  apiCategories,
  apiMetrics,
  apiProductOptions,
  canAdjust,
  categoryFilter,
  dialog,
  draft,
  error,
  fieldErrors,
  inventoryPage,
  inventoryPageSize,
  inventoryTotal,
  loading,
  lowStockCount,
  lowStockOnly,
  movementFrom,
  movementPage,
  movementPageSize,
  movementTo,
  movementTotal,
  movementType,
  onInventoryOptions,
  onMovementOptions,
  openMovement,
  saveMovement,
  saving,
  search,
  visibleMovements,
  visibleProducts,
} = useInventory();

/**
 * Column configuration for the stock overview table.
 */
const headers = [
  { title: 'PRODUCT', key: 'name' },
  { title: 'SKU', key: 'sku' },
  { title: 'ON HAND', key: 'stock', align: 'end' },
  { title: 'REORDER AT', key: 'reorder', align: 'end' },
  { title: 'STATUS', key: 'status' },
  { title: '', key: 'actions', align: 'end', sortable: false },
];

/**
 * Column configuration for the stock movement history ledger.
 */
const movementHeaders = [
  { title: 'DATE & TIME', key: 'time' },
  { title: 'PRODUCT', key: 'product' },
  { title: 'TYPE', key: 'type' },
  { title: 'CHANGE', key: 'change', align: 'end' },
  { title: 'BALANCE', key: 'balance', align: 'end' },
  { title: 'USER', key: 'user' },
  { title: 'NOTE', key: 'reason' },
];

</script>

<template>
  <v-container fluid class="pa-4 pa-md-6 inventory-page">
    <div class="page-heading">
      <div>
        <div class="text-overline text-medium-emphasis">STOCK CONTROL</div>
        <h1 class="text-h5 font-weight-bold">Inventory</h1>
        <p class="text-body-2 text-medium-emphasis">Keep track of stock levels and movement history.</p>
      </div>

      <div class="d-flex flex-wrap ga-2">
        <v-btn
          v-if="canAdjust"
          variant="outlined"
          rounded="lg"
          class="w-100 w-sm-auto"
          prepend-icon="mdi-swap-horizontal"
          @click="openMovement('Adjustment')"
        >
          Adjust stock
        </v-btn>

        <v-btn
          color="primary"
          rounded="lg"
          class="w-100 w-sm-auto"
          prepend-icon="mdi-tray-arrow-down"
          @click="openMovement('Stock in')"
        >
          Stock in
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

    <!-- Overview Metric Cards -->
    <div class="summary-cards-row">
      <div class="summary-card">
        <span class="summary-icon icon-blue">
          <v-icon icon="mdi-package-variant-closed" size="18" />
        </span>
        <div>
          <span class="text-caption text-medium-emphasis">Total units</span>
          <strong class="text-h6 font-weight-bold">
            {{ apiMetrics.totalUnits.toLocaleString() }}
          </strong>
        </div>
      </div>

      <div class="summary-card">
        <span class="summary-icon icon-purple">
          <v-icon icon="mdi-shape-outline" size="18" />
        </span>
        <div>
          <span class="text-caption text-medium-emphasis">Active products</span>
          <strong class="text-h6 font-weight-bold">
            {{ apiMetrics.total }}
          </strong>
        </div>
      </div>

      <div class="summary-card">
        <span class="summary-icon icon-amber">
          <v-icon icon="mdi-alert-outline" size="18" />
        </span>
        <div>
          <span class="text-caption text-medium-emphasis">Below reorder level</span>
          <strong class="text-h6 font-weight-bold">{{ lowStockCount }}</strong>
          <span class="text-caption text-medium-emphasis">Needs attention</span>
        </div>
      </div>
    </div>

    <InventoryStockSection
      v-model:search="search"
      v-model:category="categoryFilter"
      v-model:low-stock-only="lowStockOnly"
      :api-mode="true"
      :items="visibleProducts"
      :items-length="inventoryTotal"
      :page="inventoryPage"
      :page-size="inventoryPageSize"
      :loading="loading"
      :headers="headers"
      :categories="[
        { title: 'All categories', value: 'all' },
        ...apiCategories.map((item) => ({ title: item.name, value: item.id }))
      ]"
      :can-adjust="canAdjust"
      @options="onInventoryOptions"
      @stock-in="openMovement('Stock in', $event)"
      @adjust="openMovement('Adjustment', $event)"
    />

    <InventoryMovementSection
      v-model:type="movementType"
      v-model:from="movementFrom"
      v-model:to="movementTo"
      :api-mode="true"
      :items="visibleMovements"
      :items-length="movementTotal"
      :page="movementPage"
      :page-size="movementPageSize"
      :loading="loading"
      :headers="movementHeaders"
      @options="onMovementOptions"
    />
    <!-- Stock Movement Dialog -->
    <InventoryMovementDialog
      v-model:open="dialog"
      :draft="draft"
      :field-errors="fieldErrors"
      :error="error"
      :saving="saving"
      :product-options="apiProductOptions"
      @submit="saveMovement"
    />
  </v-container>
</template>

