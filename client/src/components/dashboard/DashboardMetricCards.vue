<script setup>
import { formatMoney } from '../../utils/format.js';

const props = defineProps({
  todaySales: {
    type: [Number, String],
    default: 0,
  },
  completedCount: {
    type: Number,
    default: 0,
  },
  stockUnits: {
    type: Number,
    default: 0,
  },
  productCount: {
    type: Number,
    default: 0,
  },
  categoryCount: {
    type: Number,
    default: 0,
  },
  lowStockCount: {
    type: Number,
    default: 0,
  },
});
</script>

<template>
  <v-row>
    <v-col cols="12" sm="6" lg="3">
      <v-card
        rounded="xl"
        variant="outlined"
        class="pa-4 h-100"
      >
        <div class="d-flex align-center justify-space-between">
          <span class="text-caption text-medium-emphasis">Today’s sales</span>
          <v-avatar color="primary" variant="tonal" rounded="lg" size="36">
            <v-icon icon="mdi-cash-multiple" />
          </v-avatar>
        </div>
        <div class="text-h5 font-weight-bold mt-3">
          {{ formatMoney(props.todaySales) }}
        </div>
        <div class="text-caption text-medium-emphasis mt-1">
          <span>Today’s sales</span>
        </div>
      </v-card>
    </v-col>

    <v-col cols="12" sm="6" lg="3">
      <v-card
        rounded="xl"
        variant="outlined"
        class="pa-4 h-100"
      >
        <div class="d-flex align-center justify-space-between">
          <span class="text-caption text-medium-emphasis">Completed sales</span>
          <v-avatar color="success" variant="tonal" rounded="lg" size="36">
            <v-icon icon="mdi-receipt-text-check-outline" />
          </v-avatar>
        </div>
        <div class="text-h5 font-weight-bold mt-3">
          {{ props.completedCount }}
        </div>
        <div class="text-caption text-medium-emphasis mt-1">
          <span>Completed today</span>
        </div>
      </v-card>
    </v-col>

    <v-col cols="12" sm="6" lg="3">
      <v-card
        rounded="xl"
        variant="outlined"
        class="pa-4 h-100"
      >
        <div class="d-flex align-center justify-space-between">
          <span class="text-caption text-medium-emphasis">Items in stock</span>
          <v-avatar color="deep-purple" variant="tonal" rounded="lg" size="36">
            <v-icon icon="mdi-package-variant-closed" />
          </v-avatar>
        </div>
        <div class="text-h5 font-weight-bold mt-3">
          {{ props.stockUnits.toLocaleString() }}
        </div>
        <div class="text-caption text-medium-emphasis mt-1">
          {{ props.productCount }} products across {{ props.categoryCount }} categories
        </div>
      </v-card>
    </v-col>

    <v-col cols="12" sm="6" lg="3">
      <v-card
        rounded="xl"
        variant="outlined"
        class="pa-4 h-100"
      >
        <div class="d-flex align-center justify-space-between">
          <span class="text-caption text-medium-emphasis">Needs reordering</span>
          <v-avatar color="warning" variant="tonal" rounded="lg" size="36">
            <v-icon icon="mdi-alert-outline" />
          </v-avatar>
        </div>
        <div class="text-h5 font-weight-bold mt-3">
          {{ props.lowStockCount }}
        </div>
        <div class="text-caption text-medium-emphasis mt-1">
          Check stock levels at or below threshold
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>
