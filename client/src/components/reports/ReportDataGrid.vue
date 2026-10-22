<script setup>
import { computed } from 'vue';
import { formatDate, formatDateTime, formatMoney } from '../../utils/format.js';
import ResponsiveTable from '../ResponsiveTable.vue';

/**
 * ============================================================================
 * Component: ReportDataGrid.vue
 * ============================================================================
 *
 * PURPOSE:
 * Displays the aggregated sales dataset, financial overview cards, and the
 * dedicated voided sales transaction audit table using standard Vuetify 3 components.
 *
 * CRITICAL BUSINESS RULE (SRS-RPT-02):
 * Voided transactions MUST be cleanly separated and excluded from total revenue,
 * units sold, and discount calculations.
 *
 * PROPS:
 * - group: Active aggregation dimension string ('day', 'product', 'category', 'user', 'payment').
 * - groups: Array of completed sales grouping records from the backend API.
 * - voided: Array of voided sale records from the backend API.
 * - busy: Whether an active query request is currently loading.
 */
const props = defineProps({
  group: {
    type: String,
    required: true,
  },
  groups: {
    type: Array,
    default: () => [],
  },
  voided: {
    type: Array,
    default: () => [],
  },
  busy: {
    type: Boolean,
    default: false,
  },
});

/**
 * Converts a decimal dollar amount string or number to integer cents for formatMoney.
 *
 * @param {string|number} amount - Dollar amount.
 * @returns {number} Value in cents.
 */
function toCents(amount) {
  const numericVal = Number(amount || 0);
  return Math.round(numericVal * 100);
}

/**
 * Calculates dynamic table column headers based on active aggregation dimension.
 */
const dynamicTableHeaders = computed(() => {
  let primaryColumnTitle = 'GROUP';

  if (props.group === 'day') {
    primaryColumnTitle = 'CALENDAR DATE';
  } else if (props.group === 'product') {
    primaryColumnTitle = 'PRODUCT NAME';
  } else if (props.group === 'category') {
    primaryColumnTitle = 'CATEGORY';
  } else if (props.group === 'user') {
    primaryColumnTitle = 'CASHIER / STAFF MEMBER';
  } else if (props.group === 'payment') {
    primaryColumnTitle = 'PAYMENT METHOD';
  }

  return [
    { title: primaryColumnTitle, key: 'key', sortable: true },
    { title: 'UNITS SOLD', key: 'quantity', align: 'end', sortable: true },
    { title: 'SUBTOTAL', key: 'subtotal', align: 'end', sortable: true },
    { title: 'DISCOUNT', key: 'discount', align: 'end', sortable: true },
    { title: 'NET REVENUE', key: 'total', align: 'end', sortable: true },
  ];
});

/**
 * Fixed table column headers for voided sales transactions.
 */
const voidedTableHeaders = [
  { title: 'SALE #', key: 'sale_no', sortable: true },
  { title: 'VOIDED DATE & TIME', key: 'sold_at', sortable: true },
  { title: 'CUSTOMER', key: 'customer', sortable: true },
  { title: 'CASHIER', key: 'staff', sortable: true },
  { title: 'REASON FOR VOID', key: 'void_reason', sortable: true },
  { title: 'AMOUNT VOIDED', key: 'total', align: 'end', sortable: true },
];

/**
 * Aggregates completed sales totals using discrete step-by-step arithmetic.
 * Strictly adheres to the FYP coding style without dense one-liners.
 */
const financialSummary = computed(() => {
  let accumulatedUnits = 0;
  let accumulatedSubtotalCents = 0;
  let accumulatedDiscountCents = 0;
  let accumulatedTotalCents = 0;

  for (const row of props.groups) {
    const units = Number(row.quantity || 0);
    const subtotalCents = toCents(row.subtotal);
    const discountCents = toCents(row.discount);
    const totalCents = toCents(row.total);

    accumulatedUnits += units;
    accumulatedSubtotalCents += subtotalCents;
    accumulatedDiscountCents += discountCents;
    accumulatedTotalCents += totalCents;
  }

  return {
    units: accumulatedUnits,
    subtotalCents: accumulatedSubtotalCents,
    discountCents: accumulatedDiscountCents,
    totalCents: accumulatedTotalCents,
    groupsCount: props.groups.length,
  };
});

/**
 * Aggregates voided transactions value for transparent accounting disclosure.
 */
const voidedSummary = computed(() => {
  let voidedCents = 0;

  for (const voidRow of props.voided) {
    const amountCents = toCents(voidRow.total);
    voidedCents += amountCents;
  }

  return {
    count: props.voided.length,
    totalCents: voidedCents,
  };
});
</script>

<template>
  <div class="report-data-grid">
    <!-- SECTION 1: Summary Metrics (Matching SalesView.vue sales-summary) -->
    <div class="summary-cards-row">
      <!-- Completed sales -->
      <div class="summary-card">
        <span class="summary-icon icon-blue">
          <v-icon
            icon="mdi-cash-multiple"
            size="18"
          />
        </span>
        <div>
          <span class="text-caption text-medium-emphasis">Completed sales</span>
          <strong class="text-h6 font-weight-bold">{{ financialSummary.units.toLocaleString() }} pcs</strong>
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
          <strong class="text-h6 font-weight-bold revenue-val">{{ formatMoney(financialSummary.totalCents) }}</strong>
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
          <strong class="text-h6 font-weight-bold">{{ formatMoney(financialSummary.subtotalCents) }}</strong>
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
          <strong class="text-h6 font-weight-bold voided-val">{{ voidedSummary.count }} ({{ formatMoney(voidedSummary.totalCents) }})</strong>
        </div>
      </div>
    </div>

    <!-- SECTION 2: Main Sales Grouping Table Card (Matching SalesView.vue sales-card) -->
    <v-card
      rounded="xl"
      class="sales-card mb-4"
    >
      <slot name="filters" />

      <!-- Fallback toolbar if filters slot is not provided -->
      <div
        v-if="!$slots.filters"
        class="table-toolbar"
      >
        <div>
          <h2 class="text-h6 font-weight-bold mb-1">Grouped sales breakdown</h2>
          <p class="text-caption text-medium-emphasis mb-0">{{ groups.length }} groups match filters · Aggregated by {{ group }}</p>
        </div>

        <v-chip
          color="primary"
          variant="tonal"
          size="small"
        >
          {{ groups.length }} Groups
        </v-chip>
      </div>

      <!-- Grouped Sales Table with Mobile Record Cards -->
      <ResponsiveTable
        :headers="dynamicTableHeaders"
        :items="groups"
        :loading="busy"
        :items-per-page="10"
        item-key="key"
        density="compact"
        hover
      >
        <!-- Format Key Column (e.g. date formatting if grouped by day) -->
        <template #item.key="{ item }">
          <span
            v-if="group === 'day'"
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

        <!-- Format Net Total -->
        <template #item.total="{ item }">
          <strong class="font-weight-bold" style="color: #253d90;">
            {{ formatMoney(toCents(item.total)) }}
          </strong>
        </template>
      </ResponsiveTable>
    </v-card>

    <!-- SECTION 3: Dedicated Voided Sales Section (Strict SRS-RPT-02 Compliance) -->
    <v-card
      rounded="xl"
      class="sales-card"
    >
      <div class="table-toolbar">
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
            Revoked transactions excluded from revenue totals · {{ voidedSummary.count }} voided
          </p>
        </div>

        <v-chip
          :color="voided.length > 0 ? 'error' : 'default'"
          variant="tonal"
          size="small"
        >
          {{ voidedSummary.count }} Voided · {{ formatMoney(voidedSummary.totalCents) }}
        </v-chip>
      </div>

      <!-- Voided Transactions Vuetify Data Table -->
      <ResponsiveTable
        v-if="voided.length > 0"
        :headers="voidedTableHeaders"
        :items="voided"
        :loading="busy"
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
          <span class="text-error font-italic">
            {{ item.void_reason }}
          </span>
        </template>

        <!-- Format Void Amount -->
        <template #item.total="{ item }">
          <strong class="text-error font-weight-bold">
            {{ formatMoney(toCents(item.total)) }}
          </strong>
        </template>
      </ResponsiveTable>

      <!-- Empty State for Voided Transactions -->
      <div
        v-else
        class="pa-6 text-center text-medium-emphasis"
      >
        <v-icon
          icon="mdi-check-circle-outline"
          color="success"
          size="32"
          class="mb-2"
        />
        <div class="text-subtitle-2 font-weight-medium text-high-emphasis">
          Zero voided transactions
        </div>
        <div class="text-caption">
          All sales in this date range remain active and unrevoked.
        </div>
      </div>
    </v-card>
  </div>
</template>

<style scoped>
.summary-card > div strong.revenue-val {
  color: #319276;
}

.summary-card > div strong.voided-val {
  color: #bb7070;
}

.sales-card {
  border: 1px solid #e9edf3;
  border-radius: 14px;
  background: #fff;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(25, 42, 78, .035);
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 13px;
}

.table-toolbar h2 {
  margin: 0 0 4px;
  color: #354157;
}

.table-toolbar p {
  margin: 0;
  color: #7c889b;
}

:deep(.v-data-table__th) {
  height: 42px !important;
  background: #fafbfc !important;
  color: #7c889b !important;
  font-weight: 700 !important;
  letter-spacing: 0.55px !important;
  text-transform: uppercase !important;
  border-bottom: 1px solid #f0f2f6 !important;
}

:deep(.v-data-table__td) {
  height: 52px !important;
  color: #3e4b61 !important;
  border-bottom: 1px solid #f0f2f6 !important;
}

:deep(.v-data-table-footer) {
  min-height: 48px !important;
  color: #7c889b !important;
}

@media (max-width: 599px) {
  .table-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

