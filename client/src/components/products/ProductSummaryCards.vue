<script setup>
/**
 * ProductSummaryCards.vue
 *
 * Renders the top metric summary strip for the Products Catalog:
 * total product count, active category count, low stock alert count,
 * and stock control guidance.
 */
defineProps({
  productTotal: {
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
  <v-row class="mb-4">
    <v-col cols="12" sm="6" md="3">
      <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
        <div class="d-flex align-center ga-3">
          <v-avatar color="primary" variant="tonal" rounded="lg" size="40">
            <v-icon icon="mdi-package-variant-closed" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Total products</div>
            <div class="text-h6 font-weight-bold">{{ productTotal }}</div>
          </div>
        </div>
      </v-card>
    </v-col>

    <v-col cols="12" sm="6" md="3">
      <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
        <div class="d-flex align-center ga-3">
          <v-avatar color="secondary" variant="tonal" rounded="lg" size="40">
            <v-icon icon="mdi-shape-outline" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Categories</div>
            <div class="text-h6 font-weight-bold">{{ categoryCount }}</div>
          </div>
        </div>
      </v-card>
    </v-col>

    <v-col cols="12" sm="6" md="3">
      <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
        <div class="d-flex align-center ga-3">
          <v-avatar color="warning" variant="tonal" rounded="lg" size="40">
            <v-icon icon="mdi-alert-outline" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Low stock</div>
            <div class="text-h6 font-weight-bold">{{ lowStockCount }}</div>
          </div>
        </div>
      </v-card>
    </v-col>

    <v-col cols="12" sm="6" md="3">
      <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
        <div class="d-flex align-center ga-3">
          <v-avatar color="primary" variant="tonal" rounded="lg" size="40">
            <v-icon icon="mdi-information-outline" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Stock control</div>
            <div class="text-body-2 font-weight-medium">Adjust via Inventory</div>
          </div>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>
