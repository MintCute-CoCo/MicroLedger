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
  <div class="summary-cards-row mb-4">
    <!-- Completed sales volume -->
    <div class="summary-card">
      <span class="summary-icon icon-blue">
        <v-icon
          icon="mdi-cash-multiple"
          size="18"
        />
      </span>
      <div>
        <span class="text-caption text-medium-emphasis">Completed sales</span>
        <strong class="text-h6 font-weight-bold">{{ props.financialSummary.units.toLocaleString() }}</strong>
      </div>
    </div>

    <!-- Revenue -->
    <div class="summary-card">
      <span class="summary-icon icon-green">
        <v-icon
          icon="mdi-finance"
          size="18"
        />
      </span>
      <div>
        <span class="text-caption text-medium-emphasis">Revenue</span>
        <strong class="text-h6 font-weight-bold revenue-val">{{ formatMoney(props.financialSummary.totalCents) }}</strong>
      </div>
    </div>

    <!-- Gross Subtotal -->
    <div class="summary-card">
      <span class="summary-icon icon-purple">
        <v-icon
          icon="mdi-calculator"
          size="18"
        />
      </span>
      <div>
        <span class="text-caption text-medium-emphasis">Gross subtotal</span>
        <strong class="text-h6 font-weight-bold">{{ formatMoney(props.financialSummary.subtotalCents) }}</strong>
      </div>
    </div>

    <!-- Voided sales -->
    <div class="summary-card">
      <span class="summary-icon icon-rose">
        <v-icon
          icon="mdi-cancel"
          size="18"
        />
      </span>
      <div>
        <span class="text-caption text-medium-emphasis">Voided</span>
        <strong class="text-h6 font-weight-bold voided-val">
          {{ props.voidedSummary.count }} ({{ formatMoney(props.voidedSummary.totalCents) }})
        </strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary-card > div strong.revenue-val {
  color: #319276;
}

.summary-card > div strong.voided-val {
  color: #bb7070;
}
</style>
