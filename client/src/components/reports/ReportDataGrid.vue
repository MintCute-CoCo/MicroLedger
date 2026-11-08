<script setup>
/**
 * ReportDataGrid.vue
 *
 * Coordinator component composing the three decoupled sections of the analytical sales report:
 * 1. Financial summary cards (ReportSummaryCards.vue)
 * 2. Grouped sales data table (ReportGroupedTable.vue)
 * 3. Dedicated voided transactions audit table (ReportVoidedTable.vue, SRS-RPT-02)
 *
 * Follows strict FYP architectural separation:
 * All monetary arithmetic, table headers, and integer minor-unit summaries are
 * computed in useSalesReportGrid.js.
 */
import { toRef } from 'vue';
import { useSalesReportGrid } from '../../composables/reports/useSalesReportGrid.js';
import ReportSummaryCards from './ReportSummaryCards.vue';
import ReportGroupedTable from './ReportGroupedTable.vue';
import ReportVoidedTable from './ReportVoidedTable.vue';

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

const {
  dynamicTableHeaders,
  voidedTableHeaders,
  financialSummary,
  voidedSummary,
} = useSalesReportGrid({
  group: toRef(props, 'group'),
  groups: toRef(props, 'groups'),
  voided: toRef(props, 'voided'),
});
</script>

<template>
  <div class="report-data-grid">
    <!-- SECTION 1: Summary Metrics -->
    <ReportSummaryCards
      :financial-summary="financialSummary"
      :voided-summary="voidedSummary"
    />

    <!-- SECTION 2: Grouped Sales Breakdown Table with Slot for Filters -->
    <ReportGroupedTable
      :group="props.group"
      :groups="props.groups"
      :headers="dynamicTableHeaders"
      :busy="props.busy"
    >
      <template #filters>
        <slot name="filters" />
      </template>
    </ReportGroupedTable>

    <!-- SECTION 3: Dedicated Voided Sales Table (SRS-RPT-02) -->
    <ReportVoidedTable
      :voided="props.voided"
      :voided-summary="voidedSummary"
      :headers="voidedTableHeaders"
      :busy="props.busy"
    />
  </div>
</template>
