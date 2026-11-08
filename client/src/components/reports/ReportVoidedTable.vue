<script setup>
/**
 * ReportVoidedTable.vue
 *
 * Renders the dedicated voided sales transaction audit table card (SRS-RPT-02).
 * Strictly isolates revoked transactions from active sales revenue totals.
 */
import { formatDateTime, formatMoney } from '../../utils/format.js';
import { toCents } from '../../composables/reports/useSalesReport.js';
import ResponsiveTable from '../ResponsiveTable.vue';

const props = defineProps({
  voided: {
    type: Array,
    default: () => [],
  },
  voidedSummary: {
    type: Object,
    required: true,
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
    class="sales-card"
  >
    <div class="d-flex flex-column flex-sm-row align-start align-sm-center justify-space-between ga-3 pa-4 border-b">
      <div>
        <div class="d-flex align-center">
          <v-icon
            icon="mdi-cancel"
            size="18"
            color="error"
            class="mr-2"
          />
          <h2 class="text-h6 font-weight-bold mb-1">Voided transactions</h2>
        </div>

        <p class="text-caption text-medium-emphasis mb-0">
          Revoked transactions excluded from revenue totals · {{ props.voidedSummary.count }} voided
        </p>
      </div>

      <v-chip
        :color="props.voided.length > 0 ? 'error' : 'default'"
        variant="tonal"
        size="small"
      >
        {{ props.voidedSummary.count }} Voided · {{ formatMoney(props.voidedSummary.totalCents) }}
      </v-chip>
    </div>

    <!-- Voided Transactions Data Table -->
    <ResponsiveTable
      v-if="props.voided.length > 0"
      :headers="props.headers"
      :items="props.voided"
      :loading="props.busy"
      :items-per-page="5"
      :items-per-page-options="[5, 10, 25]"
      item-key="sale_no"
      density="compact"
      hover
    >
      <!-- Format Sold Date & Time -->
      <template #item.sold_at="{ item }">
        <span>
          {{ formatDateTime(item.sold_at) }}
        </span>
      </template>

      <!-- Format Voided Customer -->
      <template #item.customer="{ item }">
        <span>
          {{ item.customer || 'Walk-in Customer' }}
        </span>
      </template>

      <!-- Format Staff -->
      <template #item.staff="{ item }">
        <span>
          {{ item.staff }}
        </span>
      </template>

      <!-- Format Void Reason -->
      <template #item.void_reason="{ item }">
        <span class="text-caption text-error font-weight-medium">
          {{ item.void_reason }}
        </span>
      </template>

      <!-- Format Amount Voided -->
      <template #item.total="{ item }">
        <strong class="font-weight-bold text-error">
          {{ formatMoney(toCents(item.total)) }}
        </strong>
      </template>
    </ResponsiveTable>

    <!-- Empty state when zero voided sales exist -->
    <div
      v-else
      class="pa-6 text-center text-medium-emphasis"
    >
      <v-icon
        icon="mdi-check-circle-outline"
        size="32"
        color="success"
        class="mb-2"
      />
      <div class="text-body-2 font-weight-medium">
        No voided transactions
      </div>
      <div class="text-caption">
        All sales in this date range remain active and unrevoked.
      </div>
    </div>
  </v-card>
</template>
