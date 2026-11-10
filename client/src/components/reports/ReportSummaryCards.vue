<script setup>
/**
 * ReportSummaryCards.vue
 *
 * Renders the top financial summary cards for the analytical sales report:
 * completed sales volume, net revenue, gross subtotal, and voided transactions.
 *
 * Adheres strictly to:
 * - AGENTS.md retail neutrality (no domain-specific unit assumptions like 'pcs').
 * - Achromatic design system with flat outlined cards and contextual badge colors.
 */
import { formatMoney } from '../../utils/format.js';

const props = defineProps({
  financialSummary: {
    type: Object,
    required: true,
  },
  voidedSummary: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <v-row class="mb-4">
    <!-- Completed sales volume -->
    <v-col cols="12" sm="6" lg="3">
      <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
        <div class="d-flex align-center ga-3">
          <v-avatar color="primary" variant="tonal" rounded="lg" size="40">
            <v-icon icon="mdi-cash-multiple" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Completed sales</div>
            <div class="text-h6 font-weight-bold">{{ props.financialSummary.units.toLocaleString() }}</div>
          </div>
        </div>
      </v-card>
    </v-col>

    <!-- Revenue -->
    <v-col cols="12" sm="6" lg="3">
      <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
        <div class="d-flex align-center ga-3">
          <v-avatar color="success" variant="tonal" rounded="lg" size="40">
            <v-icon icon="mdi-finance" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Revenue</div>
            <div class="text-h6 font-weight-bold text-success">{{ formatMoney(props.financialSummary.totalCents) }}</div>
          </div>
        </div>
      </v-card>
    </v-col>

    <!-- Gross Subtotal -->
    <v-col cols="12" sm="6" lg="3">
      <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
        <div class="d-flex align-center ga-3">
          <v-avatar color="secondary" variant="tonal" rounded="lg" size="40">
            <v-icon icon="mdi-calculator" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Gross subtotal</div>
            <div class="text-h6 font-weight-bold">{{ formatMoney(props.financialSummary.subtotalCents) }}</div>
          </div>
        </div>
      </v-card>
    </v-col>

    <!-- Voided sales -->
    <v-col cols="12" sm="6" lg="3">
      <v-card rounded="xl" variant="outlined" class="pa-4 h-100">
        <div class="d-flex align-center ga-3">
          <v-avatar color="error" variant="tonal" rounded="lg" size="40">
            <v-icon icon="mdi-cancel" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Voided</div>
            <div class="text-h6 font-weight-bold text-error">
              {{ props.voidedSummary.count }} ({{ formatMoney(props.voidedSummary.totalCents) }})
            </div>
          </div>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>
