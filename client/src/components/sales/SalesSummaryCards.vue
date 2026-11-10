<script setup>
/**
 * SalesSummaryCards.vue
 *
 * Renders the top financial metrics for the Sales Register view:
 * completed sales volume, page-level revenue total, and voided sales count.
 */
import { formatMoney } from '../../utils/format.js';

defineProps({
  completedCount: {
    type: Number,
    default: 0,
  },
  completedTotal: {
    type: Number,
    default: 0,
  },
  voidedCount: {
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
            <v-icon icon="mdi-cash-multiple" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Completed sales</div>
            <div class="text-h6 font-weight-bold">{{ completedCount }}</div>
          </div>
        </div>
      </v-card>
    </v-col>

    <v-col cols="12" sm="4">
      <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
        <div class="d-flex align-center ga-3">
          <v-avatar color="success" variant="tonal" rounded="lg" size="40">
            <v-icon icon="mdi-finance" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Revenue (page)</div>
            <div class="text-h6 font-weight-bold">{{ formatMoney(completedTotal) }}</div>
          </div>
        </div>
      </v-card>
    </v-col>

    <v-col cols="12" sm="4">
      <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
        <div class="d-flex align-center ga-3">
          <v-avatar color="error" variant="tonal" rounded="lg" size="40">
            <v-icon icon="mdi-cancel" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Voided sales</div>
            <div class="text-h6 font-weight-bold">{{ voidedCount }}</div>
          </div>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>
