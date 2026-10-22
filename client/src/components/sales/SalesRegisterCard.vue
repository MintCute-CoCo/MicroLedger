<script setup>
import ResponsiveTable from '../ResponsiveTable.vue';
import { formatDateTime, formatMoney } from '../../utils/format.js';

const props = defineProps({
  apiMode: Boolean,
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

/**
 * Resolves a payment label to the icon displayed in the sales register.
 *
 * @param {string} method - Payment method label.
 * @returns {string} Material Design icon name.
 */
function getPaymentIcon(method) {
  if (method === 'Cash') {
    return 'mdi-cash';
  }

  if (method === 'Card') {
    return 'mdi-credit-card-outline';
  }

  return 'mdi-bank-outline';
}

/**
 * Creates compact initials for a customer table row.
 *
 * @param {string} customer - Customer's display name.
 * @returns {string} Customer initials or the walk-in marker.
 */
function getCustomerInitials(customer) {
  if (customer === 'Walk-in') {
    return 'W';
  }

  const nameParts = (customer || '').split(' ').filter(Boolean);
  const initials = nameParts.map((part) => part[0]).join('').toUpperCase();

  return initials || '?';
}
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

      <v-row dense>
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            :model-value="props.search"
            placeholder="Search sale, customer or staff"
            label="Search"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:search', $event)"
          />
        </v-col>
        <v-col v-if="props.apiMode" cols="12" sm="6" md="4">
          <v-select
            :model-value="props.selectedUserId"
            :items="[
              { title: 'All staff', value: null },
              ...props.users.map((user) => ({ title: user.fullName, value: user.id }))
            ]"
            label="Staff"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:selectedUserId', $event)"
          />
        </v-col>
        <v-col v-if="props.apiMode" cols="12" sm="6" md="4">
          <v-autocomplete
            :model-value="props.selectedCustomerId"
            :search="props.customerSearch"
            :items="[
              { id: null, name: 'All customers' },
              ...props.customerOptions
            ]"
            item-title="name"
            item-value="id"
            label="Customer"
            no-filter
            clearable
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:selectedCustomerId', $event)"
            @update:search="emit('update:customerSearch', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-select
            :model-value="props.payment"
            :items="props.payments"
            label="Payment"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:payment', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-select
            :model-value="props.status"
            :items="props.statuses"
            label="Status"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:status', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            :model-value="props.fromDate"
            type="date"
            label="From date"
            :max="props.toDate || undefined"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:fromDate', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            :model-value="props.toDate"
            type="date"
            label="To date"
            :min="props.fromDate || undefined"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:toDate', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            :model-value="props.minTotal"
            type="number"
            min="0"
            step="0.01"
            label="Min total"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:minTotal', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            :model-value="props.maxTotal"
            type="number"
            min="0"
            step="0.01"
            label="Max total"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:maxTotal', $event)"
          />
        </v-col>
      </v-row>
    </v-card-text>

    <v-alert
      v-if="props.error"
      type="error"
      variant="tonal"
      density="compact"
      class="mx-4"
    >
      {{ props.error }}
    </v-alert>

    <ResponsiveTable
      :headers="props.headers"
      :items="props.items"
      :server="props.apiMode"
      :items-length="props.totalCount"
      :page="props.page"
      :items-per-page="props.pageSize"
      :loading="props.loading"
      @update:options="emit('options', $event)"
    >
      <template #item.number="{ item }">
        <strong class="text-body-2 font-weight-bold">{{ item.number }}</strong>
      </template>
      <template #item.customer="{ item }">
        <div class="d-flex align-center ga-2">
          <v-avatar color="primary" variant="tonal" size="32">
            <span class="text-caption">{{ getCustomerInitials(item.customer) }}</span>
          </v-avatar>
          <span class="text-body-2">{{ item.customer }}</span>
        </div>
      </template>
      <template #item.createdAt="{ item }">
        <span class="text-body-2 text-medium-emphasis">{{ formatDateTime(item.createdAt) }}</span>
      </template>
      <template #item.staff="{ item }">
        <span class="text-body-2 text-medium-emphasis">{{ item.staff }}</span>
      </template>
      <template #item.payment="{ item }">
        <span class="d-flex align-center ga-1 text-body-2">
          <v-icon :icon="getPaymentIcon(item.payment)" size="small" />
          {{ item.payment }}
        </span>
      </template>
      <template #item.total="{ item }">
        <strong class="text-body-2 font-weight-bold">{{ formatMoney(item.total) }}</strong>
      </template>
      <template #item.status="{ item }">
        <v-chip
          :color="item.status === 'Voided' ? 'error' : 'success'"
          variant="tonal"
          size="small"
        >
          {{ item.status }}
        </v-chip>
      </template>
      <template #item.actions="{ item }">
        <v-btn
          icon="mdi-chevron-right"
          variant="text"
          size="small"
          aria-label="View sale details"
          @click="emit('show-sale', item)"
        />
      </template>
      <template #no-data>
        <v-empty-state
          icon="mdi-receipt-text-remove-outline"
          title="No sales match those filters"
          text="Try a different search or status."
        />
      </template>
    </ResponsiveTable>
  </v-card>
</template>
