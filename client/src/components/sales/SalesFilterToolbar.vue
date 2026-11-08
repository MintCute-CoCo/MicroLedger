<script setup>
/**
 * SalesFilterToolbar.vue
 *
 * Multidimensional filter toolbar for sales history:
 * search input, staff select, customer search/autocomplete,
 * payment method dropdown, status filter, date range, and monetary range.
 */
const props = defineProps({
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
]);
</script>

<template>
  <div class="sales-filter-toolbar">
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
      <v-col cols="12" sm="6" md="4">
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
      <v-col cols="12" sm="6" md="4">
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
      <v-col cols="12" sm="6" md="3">
        <v-select
          :model-value="props.payment"
          :items="[
            { title: 'All payments', value: '' },
            ...props.payments.map((p) => ({ title: p, value: p }))
          ]"
          label="Payment method"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="emit('update:payment', $event)"
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select
          :model-value="props.status"
          :items="[
            { title: 'All statuses', value: '' },
            ...props.statuses.map((s) => ({ title: s.title, value: s.value }))
          ]"
          label="Status"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="emit('update:status', $event)"
        />
      </v-col>
      <v-col cols="6" sm="3" md="3">
        <v-text-field
          :model-value="props.fromDate"
          type="date"
          label="From date"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="emit('update:fromDate', $event)"
        />
      </v-col>
      <v-col cols="6" sm="3" md="3">
        <v-text-field
          :model-value="props.toDate"
          type="date"
          label="To date"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="emit('update:toDate', $event)"
        />
      </v-col>
      <v-col cols="6" sm="6" md="3">
        <v-text-field
          :model-value="props.minTotal"
          type="number"
          label="Min total"
          placeholder="0.00"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="emit('update:minTotal', $event)"
        />
      </v-col>
      <v-col cols="6" sm="6" md="3">
        <v-text-field
          :model-value="props.maxTotal"
          type="number"
          label="Max total"
          placeholder="No max"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="emit('update:maxTotal', $event)"
        />
      </v-col>
    </v-row>
  </div>
</template>
