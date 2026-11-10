<script setup>
/**
 * Sales History & Invoicing Register View (/sales)
 *
 * PURPOSE:
 * Displays historical sales transactions with comprehensive customer, cashier,
 * payment method, and date filters. Supports sale details inspection, printable receipts,
 * and Admin-only transactional void operations with inventory rollbacks.
 */
import SaleDetailDialog from '../components/sales/SaleDetailDialog.vue';
import ReceiptDialog from '../components/pos/ReceiptDialog.vue';
import SalesRegisterCard from '../components/sales/SalesRegisterCard.vue';
import SalesSummaryCards from '../components/sales/SalesSummaryCards.vue';
import { formatMoney } from '../utils/format.js';
import { useSales } from '../composables/sales/useSales.js';


/**
 * Extract sales state and methods from dedicated composable.
 */
const {
  apiError,
  apiPage,
  apiSales,
  apiTotal,
  completedTotal,
  completedCount,
  voidedCount,
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
  receiptDialogOpen,
  openReceipt,
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
          v-if="isAdmin"
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
    <SalesSummaryCards
      :completed-count="completedCount"
      :completed-total="completedTotal"
      :voided-count="voidedCount"
    />

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
      :is-admin="isAdmin"
      @close="selectedSale = null"
      @void="voidSelectedSale"
      @print="openReceipt"
    />
    <ReceiptDialog
      v-model="receiptDialogOpen"
      :sale="selectedSale"
    />
  </v-container>
</template>

