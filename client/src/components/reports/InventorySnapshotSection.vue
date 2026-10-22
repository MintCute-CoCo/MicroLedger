<script setup>
import ResponsiveTable from '../ResponsiveTable.vue';
import { formatDateTime, formatMoney } from '../../utils/format.js';

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  headers: {
    type: Array,
    default: () => [],
  },
  movementHeaders: {
    type: Array,
    default: () => [],
  },
  toCents: {
    type: Function,
    required: true,
  },
});
</script>

<template>
  <v-card rounded="xl" class="mb-4">
    <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-2">
      <div>
        <div class="text-h6 font-weight-bold">Inventory snapshot</div>
        <div class="text-caption text-medium-emphasis">
          {{ props.data.current.length }} products
        </div>
      </div>
      <strong
        v-if="props.data.stockValue !== undefined"
        class="text-body-2"
      >
        Stock at cost {{ formatMoney(props.toCents(props.data.stockValue)) }}
      </strong>
    </v-card-title>

    <ResponsiveTable
      :headers="props.headers"
      :items="props.data.current"
      :items-per-page="10"
      density="comfortable"
    >
      <template #item.cost_price="{ item }">
        {{ formatMoney(props.toCents(item.cost_price)) }}
      </template>
    </ResponsiveTable>

    <v-card-text v-if="props.data.movements?.length">
      <h3 class="text-subtitle-1 font-weight-bold">Stock movements</h3>
      <ResponsiveTable
        :headers="props.movementHeaders"
        :items="props.data.movements"
        :items-per-page="10"
        density="comfortable"
      >
        <template #item.created_at="{ item }">
          {{ formatDateTime(item.created_at) }}
        </template>
      </ResponsiveTable>
    </v-card-text>
  </v-card>
</template>
