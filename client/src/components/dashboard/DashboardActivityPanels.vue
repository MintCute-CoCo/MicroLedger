<script setup>
import { formatDateTime, formatMoney } from '../../utils/format.js';

const props = defineProps({
  salesError: {
    type: String,
    default: '',
  },
  productsError: {
    type: String,
    default: '',
  },
  salesLoaded: Boolean,
  productsLoaded: Boolean,
  salesRows: {
    type: Array,
    default: () => [],
  },
  lowStockItems: {
    type: Array,
    default: () => [],
  },
});
</script>

<template>
  <v-row>
    <v-col cols="12" lg="7">
      <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
        <div class="d-flex align-start justify-space-between ga-2">
          <div>
            <h2 class="text-h6 font-weight-bold">Recent sales</h2>
            <p class="text-caption text-medium-emphasis mb-0">
              Your latest transactions
            </p>
          </div>
          <v-btn
            to="/sales"
            variant="text"
            color="primary"
            append-icon="mdi-arrow-right"
          >
            View all
          </v-btn>
        </div>

        <v-list v-if="props.salesRows.length" lines="two" class="mt-2">
          <v-list-item
            v-for="sale in props.salesRows"
            :key="sale.id"
            :title="sale.customer"
            :subtitle="`${sale.number} · ${formatDateTime(sale.createdAt)}`"
          >
            <template #prepend>
              <v-avatar color="primary" variant="tonal" rounded="lg">
                <v-icon icon="mdi-receipt-text-outline" />
              </v-avatar>
            </template>
            <template #append>
              <div class="text-right">
                <div class="text-body-2 font-weight-bold">
                  {{ formatMoney(sale.total) }}
                </div>
                <v-chip
                  :color="sale.status === 'Voided' ? 'error' : 'success'"
                  variant="tonal"
                  size="x-small"
                >
                  {{ sale.status }}
                </v-chip>
              </div>
            </template>
          </v-list-item>
        </v-list>
        <v-alert
          v-else
          :type="props.salesError ? 'warning' : 'info'"
          variant="tonal"
          density="compact"
          class="mt-4"
        >
          {{ props.salesError
            ? 'Recent sales are unavailable.'
            : !props.salesLoaded
              ? 'Loading recent sales…'
              : 'No sales have been recorded yet.' }}
        </v-alert>
      </v-card>
    </v-col>

    <v-col cols="12" lg="5">
      <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
        <div class="d-flex align-start justify-space-between ga-2">
          <div>
            <h2 class="text-h6 font-weight-bold">Stock to watch</h2>
            <p class="text-caption text-medium-emphasis mb-0">Items running low</p>
          </div>
          <v-btn
            to="/inventory"
            variant="text"
            color="primary"
            append-icon="mdi-arrow-right"
          >
            Inventory
          </v-btn>
        </div>

        <v-list v-if="props.lowStockItems.length" lines="two" class="mt-2">
          <v-list-item
            v-for="product in props.lowStockItems.slice(0, 4)"
            :key="product.id"
            :title="product.name"
            :subtitle="product.sku"
          >
            <template #prepend>
              <v-avatar color="warning" variant="tonal" rounded="lg">
                <v-icon icon="mdi-package-variant-closed" />
              </v-avatar>
            </template>
            <template #append>
              <div class="text-right">
                <div class="text-body-1 font-weight-bold">{{ product.stock }}</div>
                <div class="text-caption text-medium-emphasis">left</div>
              </div>
            </template>
          </v-list-item>
        </v-list>
        <v-alert
          v-else
          :type="props.productsError ? 'warning' : 'success'"
          variant="tonal"
          density="compact"
          class="mt-4"
        >
          {{ props.productsError
            ? 'Low-stock items are unavailable.'
            : !props.productsLoaded
              ? 'Loading inventory summary…'
              : 'Stock levels look good.' }}
        </v-alert>
      </v-card>
    </v-col>
  </v-row>
</template>
