<script setup>
import ResponsiveTable from '../components/ResponsiveTable.vue';
import { formatDateTime, formatMoney } from '../utils/format.js';
import { useReports } from '../composables/reports/useReports.js';
import ReportsCriteriaCard from '../components/reports/ReportsCriteriaCard.vue';
import SalesSummarySection from '../components/reports/SalesSummarySection.vue';
import InventorySnapshotSection from '../components/reports/InventorySnapshotSection.vue';
import WarrantyOverviewSection from '../components/reports/WarrantyOverviewSection.vue';
import ReportExportPanel from '../components/reports/ReportExportPanel.vue';

/**
 * Analytics and Data Export View.
 *
 * Provides executive sales reports with multiple grouping dimensions, inventory snapshots
 * with cost valuations and ledger movements, warranty overdue matrices, and bulk dataset downloads.
 */
const {
  auth,
  type,
  reportType,
  group,
  reportData,
  format,
  from,
  to,
  error,
  busy,
  salesHeaders,
  salesTotals,
  inventoryHeaders,
  reportTypeOptions,
  salesGroupingOptions,
  exportDataOptions,
  exportFormatOptions,
  voidedSalesHeaders,
  stockMovementsHeaders,
  warrantyStatusHeaders,
  overdueClaimsHeaders,
  claimsBySupplierHeaders,
  toCents,
  download,
  loadReport,
} = useReports();
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6 reports-page">
    <!-- View Header -->
    <div class="page-heading">
      <div>
        <div class="text-overline text-medium-emphasis">ANALYTICS</div>
        <h1 class="text-h5 font-weight-bold">{{ auth.user?.role === 'staff' ? 'Warranty report' : 'Reports and export' }}</h1>
        <p class="text-body-2 text-medium-emphasis">Review store performance and download data for a selected date range.</p>
        <div
          v-if="auth.user?.role === 'admin'"
          class="mt-2"
        >
          <v-btn
            to="/reports/sales"
            color="primary"
            variant="tonal"
            size="small"
            rounded="lg"
            class="w-100 w-sm-auto"
            prepend-icon="mdi-chart-line"
          >
            Open Dedicated Sales Report
          </v-btn>
        </div>
      </div>
    </div>

    <ReportsCriteriaCard
      :is-admin="auth.user?.role === 'admin'"
      v-model:report-type="reportType"
      v-model:from="from"
      v-model:to="to"
      v-model:group="group"
      :report-type-options="reportTypeOptions"
      :sales-grouping-options="salesGroupingOptions"
      :error="error"
      :busy="busy"
      @load="loadReport"
    />

    <SalesSummarySection
      v-if="reportData?.groups"
      :data="reportData"
      :headers="salesHeaders"
      :voided-headers="voidedSalesHeaders"
      :totals="salesTotals"
      :to-cents="toCents"
    />

    <InventorySnapshotSection
      v-if="reportData?.current"
      :data="reportData"
      :headers="inventoryHeaders"
      :movement-headers="stockMovementsHeaders"
      :to-cents="toCents"
    />

    <WarrantyOverviewSection
      v-if="reportData?.statuses"
      :data="reportData"
      :status-headers="warrantyStatusHeaders"
      :overdue-headers="overdueClaimsHeaders"
      :supplier-headers="claimsBySupplierHeaders"
    />

    <ReportExportPanel
      v-if="auth.user?.role === 'admin'"
      v-model:type="type"
      v-model:format="format"
      :data-options="exportDataOptions"
      :format-options="exportFormatOptions"
      :busy="busy"
      @download="download"
    />
  </v-container>
</template>
