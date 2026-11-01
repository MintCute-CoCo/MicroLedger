<script setup>
/**
 * Inventory Management & Movement Ledger View (/inventory)
 *
 * PURPOSE:
 * Tracks physical stock balances, low-stock warnings, inbound supplier stock-ins,
 * and immutable inventory transaction ledgers.
 * Supports Admin-only stock adjustments with mandatory reason documentation.
 */
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
    <v-row class="mb-4">
      <v-col cols="12" sm="4">
        <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
          <div class="d-flex align-center ga-3">
            <v-avatar color="primary" variant="tonal" rounded="lg" size="40">
              <v-icon icon="mdi-package-variant-closed" />
            </v-avatar>
            <div>
              <div class="text-caption text-medium-emphasis">Total units</div>
              <div class="text-h6 font-weight-bold">
                {{ apiMetrics.totalUnits.toLocaleString() }}
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="4">
        <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
          <div class="d-flex align-center ga-3">
            <v-avatar color="secondary" variant="tonal" rounded="lg" size="40">
              <v-icon icon="mdi-shape-outline" />
            </v-avatar>
            <div>
              <div class="text-caption text-medium-emphasis">Active products</div>
              <div class="text-h6 font-weight-bold">
                {{ apiMetrics.total }}
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="4">
        <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
          <div class="d-flex align-center ga-3">
            <v-avatar color="warning" variant="tonal" rounded="lg" size="40">
              <v-icon icon="mdi-alert-outline" />
            </v-avatar>
            <div>
              <div class="text-caption text-medium-emphasis">Below reorder level</div>
              <div class="text-h6 font-weight-bold">{{ lowStockCount }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

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

