<script setup>
import ResponsiveTable from '../ResponsiveTable.vue';
import { formatDateTime } from '../../utils/format.js';

const props = defineProps({
  apiMode: Boolean,
  items: {
    type: Array,
    default: () => [],
  },
  itemsLength: {
    type: Number,
    default: 0,
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
  headers: {
    type: Array,
    default: () => [],
  },
  type: {
    type: String,
    default: 'all',
  },
  from: {
    type: String,
    default: '',
  },
  to: {
    type: String,
    default: '',
  },
});

const emit = defineEmits([
  'update:type',
  'update:from',
  'update:to',
  'options',
]);

const movementTypes = [
  { title: 'All movements', value: 'all' },
  { title: 'Stock in', value: 'stock_in' },
  { title: 'Adjustment', value: 'adjustment' },
  { title: 'Sale', value: 'sale' },
  { title: 'Opening stock', value: 'opening' },
  { title: 'Void reversal', value: 'void_reversal' },
];

/**
 * Adds a plus sign to positive stock changes for clear ledger display.
 *
 * @param {number} value - Signed stock quantity change.
 * @returns {string} Quantity change with a sign when positive.
 */
function formatChange(value) {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value}`;
}
</script>

<template>
  <v-card id="movement-history" rounded="xl" variant="outlined">
    <v-card-text>
      <div class="mb-3">
        <h2 class="text-h6 font-weight-bold">Movement history</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          {{ props.itemsLength }} movements match these filters
        </p>
      </div>

      <v-row dense>
        <v-col cols="12" sm="6" md="4">
          <v-select
            :model-value="props.type"
            :items="movementTypes"
            label="Movement type"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:type', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            :model-value="props.from"
            type="date"
            label="From date"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:from', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            :model-value="props.to"
            type="date"
            label="To date"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:to', $event)"
          />
        </v-col>
      </v-row>
    </v-card-text>

    <ResponsiveTable
      :headers="props.headers"
      :items="props.items"
      :server="props.apiMode"
      :items-length="props.itemsLength"
      :page="props.page"
      :items-per-page="props.pageSize"
      :items-per-page-options="[5, 10, 25]"
      :loading="props.loading"
      @update:options="emit('options', $event)"
    >
      <template #item.time="{ item }">
        <span class="text-body-2 text-medium-emphasis">{{ formatDateTime(item.time) }}</span>
      </template>
      <template #item.product="{ item }">
        <div>
          <div class="text-body-2 font-weight-medium">{{ item.product }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.sku }}</div>
        </div>
      </template>
      <template #item.change="{ item }">
        <strong
          class="text-body-2"
          :class="item.change > 0 ? 'text-success' : 'text-error'"
        >
          {{ formatChange(item.change) }}
        </strong>
      </template>
      <template #item.balance="{ item }">
        <strong class="text-body-2">{{ item.balance }}</strong>
      </template>
      <template #item.reason="{ item }">
        <span class="text-body-2 text-medium-emphasis">{{ item.reason || '—' }}</span>
      </template>
      <template #no-data>
        <v-empty-state
          icon="mdi-history"
          title="No movements match this filter"
        />
      </template>
    </ResponsiveTable>
  </v-card>
</template>
