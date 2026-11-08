<script setup>
/**
 * SalesRegisterCard.vue
 *
 * Coordinator component assembling the sales register:
 * - SalesFilterToolbar: Multidimensional search, user, customer, status, date and total filters.
 * - SalesTable: Paginated data table with responsive customer, staff, and status chips.
 */
import SalesFilterToolbar from './SalesFilterToolbar.vue';
import SalesTable from './SalesTable.vue';

const props = defineProps({
  totalCount: {
    type: Number,
    default: 0,
  },
  search: {
    type: String,
    default: '',
  },
  selectedUserId: {
    type: [String, Number],
    default: null,
  },
  users: {
    type: Array,
    default: () => [],
  },
  selectedCustomerId: {
    type: [String, Number],
    default: null,
  },
  customerSearch: {
    type: String,
    default: '',
  },
  customerOptions: {
    type: Array,
    default: () => [],
  },
  payment: {
    type: String,
    default: '',
  },
  payments: {
    type: Array,
    default: () => [],
  },
  status: {
    type: String,
    default: '',
  },
  statuses: {
    type: Array,
    default: () => [],
  },
  fromDate: {
    type: String,
    default: '',
  },
  toDate: {
    type: String,
    default: '',
  },
  minTotal: {
    type: [String, Number],
    default: '',
  },
  maxTotal: {
    type: [String, Number],
    default: '',
  },
  headers: {
    type: Array,
    default: () => [],
  },
  items: {
    type: Array,
    default: () => [],
  },
  page: {
    type: Number,
    default: 1,
  },
  pageSize: {
    type: Number,
    default: 25,
  },
  loading: Boolean,
  error: {
    type: String,
    default: '',
  },
});

const emit = defineEmits([
  'update:search',
  'update:selectedUserId',
  'update:selectedCustomerId',
  'update:customerSearch',
  'update:payment',
  'update:status',
  'update:fromDate',
  'update:toDate',
  'update:minTotal',
  'update:maxTotal',
  'options',
  'show-sale',
]);
</script>

<template>
  <v-card rounded="xl" variant="outlined">
    <v-card-text>
      <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between ga-2 mb-3">
        <div>
          <h2 class="text-h6 font-weight-bold">All transactions</h2>
          <p class="text-caption text-medium-emphasis mb-0">
            {{ props.totalCount }} sales match filters
          </p>
        </div>
      </div>

      <!-- Section 1: Multidimensional Filters -->
      <SalesFilterToolbar
        :search="props.search"
        :selected-user-id="props.selectedUserId"
        :users="props.users"
        :selected-customer-id="props.selectedCustomerId"
        :customer-search="props.customerSearch"
        :customer-options="props.customerOptions"
        :payment="props.payment"
        :payments="props.payments"
        :status="props.status"
        :statuses="props.statuses"
        :from-date="props.fromDate"
        :to-date="props.toDate"
        :min-total="props.minTotal"
        :max-total="props.maxTotal"
        @update:search="emit('update:search', $event)"
        @update:selected-user-id="emit('update:selectedUserId', $event)"
        @update:selected-customer-id="emit('update:selectedCustomerId', $event)"
        @update:customer-search="emit('update:customerSearch', $event)"
        @update:payment="emit('update:payment', $event)"
        @update:status="emit('update:status', $event)"
        @update:from-date="emit('update:fromDate', $event)"
        @update:to-date="emit('update:toDate', $event)"
        @update:min-total="emit('update:minTotal', $event)"
        @update:max-total="emit('update:maxTotal', $event)"
      />

      <v-divider class="my-3" />

      <!-- Feedback Error Banner -->
      <v-alert
        v-if="props.error"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        {{ props.error }}
      </v-alert>

      <!-- Section 2: Data Table -->
      <SalesTable
        :headers="props.headers"
        :items="props.items"
        :loading="props.loading"
        :page="props.page"
        :page-size="props.pageSize"
        :total-count="props.totalCount"
        @options="emit('options', $event)"
        @show-sale="emit('show-sale', $event)"
      />
    </v-card-text>
  </v-card>
</template>
