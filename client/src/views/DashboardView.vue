<script setup>
import { computed } from 'vue';
import DashboardMetricCards from '../components/dashboard/DashboardMetricCards.vue';
import DashboardSalesAndProducts from '../components/dashboard/DashboardSalesAndProducts.vue';
import DashboardActivityPanels from '../components/dashboard/DashboardActivityPanels.vue';
import { formatDateTime, formatMoney } from '../utils/format.js';
import { useDashboard } from '../composables/dashboard/useDashboard.js';

/**
 * Store Executive Dashboard View.
 *
 * Provides a real-time overview of retail operations including daily turnover,
 * transaction counts, inventory health, 7-day sales trends, top sellers, and recent activity.
 */
const {
  auth,
  reportError,
  dashboardError,
  salesError,
  productsError,
  salesLoaded,
  productsLoaded,
  todaySales,
  stockUnits,
  lowStockCount,
  lowStockItems,
  salesRows,
  productCount,
  categoryCount,
  completedCount,
  greeting,
  dayLabel,
  chart,
  chartYLabels,
  topProducts,
} = useDashboard();

/**
 * Resolves the authenticated user's first name for personal greeting.
 */
const userFirstName = computed(() => {
  const fullName = auth.user?.fullName || '';
  const first = fullName.split(' ')[0];
  return first || 'Alex';
});
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6 dashboard-page">
    <!-- Top Welcome Banner -->
    <div class="page-heading">
      <div>
        <div class="text-overline text-medium-emphasis">
          {{ dayLabel }}
        </div>
        <h1 class="text-h5 font-weight-bold">
          {{ greeting }}, {{ userFirstName }}
          <span class="wave">✦</span>
        </h1>
        <p class="text-body-2 text-medium-emphasis">Here’s what’s happening at your store today.</p>
      </div>

      <!-- Quick Action: Open Cash Register -->
      <v-btn
        to="/pos"
        color="primary"
        prepend-icon="mdi-plus"
        rounded="lg"
        size="large"
        class="heading-action w-100 w-sm-auto"
      >
        New sale
      </v-btn>
    </div>

    <!-- Error Alert if Report API Fails -->
    <v-alert
      v-if="reportError"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      {{ reportError }}
    </v-alert>

    <DashboardMetricCards
      :today-sales="todaySales"
      :completed-count="completedCount"
      :stock-units="stockUnits"
      :product-count="productCount"
      :category-count="categoryCount"
      :low-stock-count="lowStockCount"
    />

    <DashboardSalesAndProducts
      :today-sales="todaySales"
      :chart="chart"
      :top-products="topProducts"
      :report-error="dashboardError"
    />

    <DashboardActivityPanels
      :sales-error="salesError"
      :products-error="productsError"
      :sales-loaded="salesLoaded"
      :products-loaded="productsLoaded"
      :sales-rows="salesRows"
      :low-stock-items="lowStockItems"
    />  </v-container>
</template>

