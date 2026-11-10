<script setup>
/**
 * InventorySummaryCards.vue
 *
 * Renders the top metric summary strip for the Inventory panel:
 * total physical stock units, active catalog products count,
 * and count of items falling below their reorder threshold.
 */
defineProps({
  totalUnits: {
    type: Number,
    default: 0,
  },
  activeProducts: {
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
    <v-col cols="12" sm="4">
      <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
        <div class="d-flex align-center ga-3">
          <v-avatar color="primary" variant="tonal" rounded="lg" size="40">
            <v-icon icon="mdi-package-variant-closed" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Total units</div>
            <div class="text-h6 font-weight-bold">
              {{ totalUnits.toLocaleString() }}
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
              {{ activeProducts }}
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
</template>
