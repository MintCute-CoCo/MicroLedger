<script setup>
import ReportDataGrid from '../components/reports/ReportDataGrid.vue';
import ReportFilterBar from '../components/reports/ReportFilterBar.vue';
import { useSalesReportPage } from '../composables/reports/useSalesReportPage.js';

const {
  fromDate,
  toDate,
  activeGroup,
  activePaymentMethod,
  activeCategoryId,
  activeUserId,
  availableCategories,
  availableUsers,
  reportGroups,
  voidedSales,
  isBusy,
  errorMessage,
  applyQuickPreset,
  handleResetFilters,
  fetchSalesReport,
  dismissError,
} = useSalesReportPage();
</script>
<template>
  <v-container fluid class="pa-4 pa-md-6 sales-report-page">
    <!-- View Header Block (Matching SalesView.vue page-heading) -->
    <div class="page-heading">
      <div>
        <div class="text-overline text-medium-emphasis">
          ANALYTICS & REPORTS
        </div>

        <div class="d-flex align-center flex-wrap ga-2">
          <h1 class="text-h5 font-weight-bold">Sales Report</h1>

          <v-chip
            size="small"
            color="primary"
            variant="tonal"
            class="ml-sm-2 text-caption font-weight-bold"
          >
            Time Zone: GMT+7 (Vietnam)
          </v-chip>
        </div>

        <p class="text-body-2 text-medium-emphasis">Review completed and voided sales aggregated across custom date ranges.</p>
      </div>
    </div>

    <!-- Error Alert Banner -->
    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="dismissError"
    >
      {{ errorMessage }}
    </v-alert>

    <!-- Main Analytical Content: Metric Cards, Grouped Table with Inline Filters, and Voided Card -->
    <ReportDataGrid
      :group="activeGroup"
      :groups="reportGroups"
      :voided="voidedSales"
      :busy="isBusy"
    >
      <template #filters>
        <ReportFilterBar
          v-model:from="fromDate"
          v-model:to="toDate"
          v-model:group="activeGroup"
          v-model:payment-method="activePaymentMethod"
          v-model:category-id="activeCategoryId"
          v-model:user-id="activeUserId"
          :categories="availableCategories"
          :users="availableUsers"
          :group-count="reportGroups.length"
          :busy="isBusy"
          @submit="fetchSalesReport"
          @reset="handleResetFilters"
          @preset="applyQuickPreset"
        />
      </template>
    </ReportDataGrid>
  </v-container>
</template>

