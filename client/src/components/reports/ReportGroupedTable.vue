<script setup>
/**
 * ReportGroupedTable.vue
 *
 * Renders the aggregated sales grouping data table card with embedded filter slot.
 * Formats grouped dimension keys, units, subtotals, discounts, and net revenue.
 */
import { formatDate, formatMoney } from '../../utils/format.js';
import { toCents } from '../../composables/reports/useSalesReport.js';
import ResponsiveTable from '../ResponsiveTable.vue';

const props = defineProps({
  group: {
    type: String,
    required: true,
  },
  groups: {
    type: Array,
    default: () => [],
  },
  headers: {
    type: Array,
    required: true,
  },
  busy: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <v-card
    rounded="xl"
    variant="outlined"
    class="sales-card mb-4"
  >
    <slot name="filters" />

    <!-- Fallback toolbar if filters slot is not provided -->
    <div
      v-if="!$slots.filters"
      class="d-flex flex-column flex-sm-row align-start align-sm-center justify-space-between ga-3 pa-4 border-b"
    >
      <div>
        <h2 class="text-h6 font-weight-bold mb-1">Grouped sales breakdown</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          {{ props.groups.length }} groups match filters · Aggregated by {{ props.group }}
        </p>
      </div>

      <v-chip
        color="primary"
        variant="tonal"
        size="small"
      >
        {{ props.groups.length }} Groups
      </v-chip>
    </div>

    <!-- Grouped Sales Table with Mobile Record Cards -->
    <ResponsiveTable
      :headers="props.headers"
      :items="props.groups"
      :loading="props.busy"
      :items-per-page="10"
      item-key="key"
      density="compact"
      hover
    >
      <!-- Format Key Column (e.g. date formatting if grouped by day) -->
      <template #item.key="{ item }">
        <span
          v-if="props.group === 'day'"
          class="font-weight-medium"
        >
          {{ formatDate(item.key) }}
        </span>

        <span
          v-else
          class="font-weight-medium"
        >
          {{ item.key || 'Direct / Walk-in' }}
        </span>
      </template>

      <!-- Format Units Sold -->
      <template #item.quantity="{ item }">
        <span>
          {{ Number(item.quantity).toLocaleString() }}
        </span>
      </template>

      <!-- Format Subtotal -->
      <template #item.subtotal="{ item }">
        <span>
          {{ formatMoney(toCents(item.subtotal)) }}
        </span>
      </template>

      <!-- Format Discount -->
      <template #item.discount="{ item }">
        <span class="text-medium-emphasis">
          {{ formatMoney(toCents(item.discount)) }}
        </span>
      </template>

      <!-- Format Net Total (text-primary utility class, zero inline styles) -->
      <template #item.total="{ item }">
        <strong class="font-weight-bold text-primary">
          {{ formatMoney(toCents(item.total)) }}
        </strong>
      </template>
    </ResponsiveTable>
  </v-card>
</template>
