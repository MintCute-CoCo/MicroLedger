<script setup>
/**
 * SupplierSummaryCards.vue
 *
 * Renders the top summary cards for the Supplier Directory:
 * total registered suppliers and active suppliers.
 */
defineProps({
  totalCount: {
    type: Number,
    default: 0,
  },
  activeCount: {
    type: Number,
    default: 0,
  },
});
</script>

<template>
  <v-row class="mb-4">
    <v-col cols="12" sm="6">
      <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
        <div class="d-flex align-center ga-3">
          <v-avatar color="primary" variant="tonal" rounded="lg" size="40">
            <v-icon icon="mdi-truck-delivery-outline" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Total suppliers</div>
            <div class="text-h6 font-weight-bold">{{ totalCount }}</div>
          </div>
        </div>
      </v-card>
    </v-col>

    <v-col cols="12" sm="6">
      <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
        <div class="d-flex align-center ga-3">
          <v-avatar color="success" variant="tonal" rounded="lg" size="40">
            <v-icon icon="mdi-check-circle-outline" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Active suppliers</div>
            <div class="text-h6 font-weight-bold">{{ activeCount }}</div>
          </div>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>
