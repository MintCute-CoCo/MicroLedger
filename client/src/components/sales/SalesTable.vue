<script setup>
/**
 * SalesTable.vue
 *
 * Renders the transactional sales data table:
 * sale sequence numbers, customer avatar, formatted timestamps in store timezone,
 * cashier name, payment badge chips, status indicators, and action triggers.
 */
import ResponsiveTable from '../ResponsiveTable.vue';
import { formatDateTime, formatMoney } from '../../utils/format.js';

const props = defineProps({
  headers: {
    type: Array,
    default: () => [],
  },
  items: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  page: {
    type: Number,
    default: 1,
  },
  pageSize: {
    type: Number,
    default: 25,
  },
  totalCount: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits([
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
  <div class="sales-table-container">
    <ResponsiveTable
      :headers="props.headers"
      :items="props.items"
      :items-length="props.totalCount"
      :loading="props.loading"
      :page="props.page"
      :items-per-page="props.pageSize"
      item-key="id"
      hover
      density="comfortable"
      @update:options="emit('options', $event)"
    >
      <template #item.number="{ item }">
        <span class="font-weight-bold text-primary cursor-pointer" @click="emit('show-sale', item)">
          {{ item.number }}
        </span>
      </template>

      <template #item.customer="{ item }">
        <div class="d-flex align-center ga-2">
          <v-avatar
            size="28"
            :color="item.customer === 'Walk-in' ? 'grey-lighten-3' : 'primary-lighten-4'"
            class="text-caption font-weight-bold"
          >
            {{ getCustomerInitials(item.customer) }}
          </v-avatar>
          <span class="text-body-2 font-weight-medium">{{ item.customer }}</span>
        </div>
      </template>

      <template #item.createdAt="{ item }">
        <span class="text-caption text-medium-emphasis">
          {{ formatDateTime(item.createdAt) }}
        </span>
      </template>

      <template #item.staff="{ item }">
        <span class="text-body-2">{{ item.staff }}</span>
      </template>

      <template #item.payment="{ item }">
        <v-chip size="small" variant="tonal" class="text-caption">
          <v-icon :icon="getPaymentIcon(item.payment)" start size="14" />
          {{ item.payment }}
        </v-chip>
      </template>

      <template #item.total="{ item }">
        <span class="text-body-2 font-weight-bold">
          {{ formatMoney(item.total) }}
        </span>
      </template>

      <template #item.status="{ item }">
        <v-chip
          size="small"
          :color="item.status === 'completed' ? 'success' : 'error'"
          variant="tonal"
          class="text-caption font-weight-medium"
        >
          {{ item.status === 'completed' ? 'Completed' : 'Voided' }}
        </v-chip>
      </template>

      <template #item.actions="{ item }">
        <v-btn
          icon="mdi-eye-outline"
          variant="text"
          size="small"
          aria-label="View invoice"
          @click="emit('show-sale', item)"
        />
      </template>
    </ResponsiveTable>
  </div>
</template>
