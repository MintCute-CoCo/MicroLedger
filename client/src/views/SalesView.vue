<script setup>
import SaleDetailDialog from '../components/sales/SaleDetailDialog.vue';
import SalesRegisterCard from '../components/sales/SalesRegisterCard.vue';
import { formatMoney } from '../utils/format.js';
import { useSales } from '../composables/sales/useSales.js';


/**
 * Extract sales state and methods from dedicated composable.
 */
const {
  apiError,
  apiMode,
  apiPage,
  apiSales,
  apiTotal,
  completedTotal,
  customerOptions,
  customerSearch,
  detailOpen,
  exportFilteredSales,
  fromDate,
  isAdmin,
  loading,
  maxTotal,
  minTotal,
  onTableOptions,
  pageSize,
  payment,
  payments,
  search,
  selectedCustomerId,
  selectedSale,
  selectedUserId,
  showSale,
  status,
  statuses,
  toDate,
  users,
  visibleSales,
  voidReason,
  voidSelectedSale,
} = useSales();

/**
 * Table header definitions for the sales history view.
 */
const headers = [
  { title: 'SALE', key: 'number', sortable: false },
  { title: 'CUSTOMER', key: 'customer', sortable: false },
  { title: 'DATE & TIME', key: 'createdAt', sortable: false },
  { title: 'CASHIER', key: 'staff', sortable: false },
  { title: 'PAYMENT', key: 'payment', sortable: false },
  { title: 'TOTAL', key: 'total', align: 'end', sortable: false },
  { title: 'STATUS', key: 'status', sortable: false },
  { title: '', key: 'actions', align: 'end', sortable: false },
];

</script>

<template>
  <v-container fluid class="pa-4 pa-md-6 sales-page">
    <!-- Header Section with actions -->
    <div class="page-heading">
      <div>
        <div class="text-overline text-medium-emphasis">TRANSACTIONS</div>
        <h1 class="text-h5 font-weight-bold">Sales</h1>
        <p class="text-body-2 text-medium-emphasis">Review completed and voided transactions.</p>
      </div>

      <div class="d-flex flex-wrap ga-2">
        <v-btn
          v-if="isAdmin && apiMode"
          variant="outlined"
          rounded="lg"
          class="w-100 w-sm-auto"
          prepend-icon="mdi-download"
          @click="exportFilteredSales"
        >
          Export filtered
        </v-btn>

        <v-btn
          to="/pos"
          color="primary"
          rounded="lg"
          class="w-100 w-sm-auto"
          prepend-icon="mdi-plus"
        >
          New sale
        </v-btn>
      </div>
    </div>

    <!-- Summary Metrics -->
    <div class="summary-cards-row">
      <div class="summary-card">
        <span class="summary-icon icon-blue">
          <v-icon
            icon="mdi-cash-multiple"
            size="18"
          />
        </span>
        <div>
          <span class="text-caption text-medium-emphasis">Completed sales {{ apiMode ? 'on page' : '' }}</span>
          <strong class="text-h6 font-weight-bold">
            {{
              (apiMode ? apiSales : store.sales).filter((sale) => sale.status === 'Completed').length
            }}
          </strong>
        </div>
      </div>

      <div class="summary-card">
        <span class="summary-icon icon-green">
          <v-icon
            icon="mdi-finance"
            size="18"
          />
        </span>
        <div>
          <span class="text-caption text-medium-emphasis">Revenue {{ apiMode ? 'on page' : '' }}</span>
          <strong class="text-h6 font-weight-bold">{{ formatMoney(completedTotal) }}</strong>
        </div>
      </div>

      <div class="summary-card">
        <span class="summary-icon icon-rose">
          <v-icon
            icon="mdi-cancel"
            size="18"
          />
        </span>
        <div>
          <span class="text-caption text-medium-emphasis">Voided {{ apiMode ? 'on page' : '' }}</span>
          <strong class="text-h6 font-weight-bold">
            {{
              (apiMode ? apiSales : store.sales).filter((sale) => sale.status === 'Voided').length
            }}
          </strong>
        </div>
      </div>
    </div>

    <SalesRegisterCard
      v-model:search="search"
      v-model:selected-user-id="selectedUserId"
      v-model:selected-customer-id="selectedCustomerId"
      v-model:customer-search="customerSearch"
      v-model:payment="payment"
      v-model:status="status"
      v-model:from-date="fromDate"
      v-model:to-date="toDate"
      v-model:min-total="minTotal"
      v-model:max-total="maxTotal"
      :api-mode="apiMode"
      :total-count="apiTotal"
      :users="users"
      :customer-options="customerOptions"
      :payments="payments"
      :statuses="statuses"
      :headers="headers"
      :items="visibleSales"
      :page="apiPage"
      :page-size="pageSize"
      :loading="loading"
      :error="apiError"
      @options="onTableOptions"
      @show-sale="showSale"
    />
    <SaleDetailDialog
      v-model:open="detailOpen"
      v-model:void-reason="voidReason"
      :sale="selectedSale"
      :api-mode="apiMode"
      :is-admin="isAdmin"
      @close="selectedSale = null"
      @void="voidSelectedSale"
    />
  </v-container>
</template>

