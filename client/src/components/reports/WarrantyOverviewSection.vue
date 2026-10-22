<script setup>
import ResponsiveTable from '../ResponsiveTable.vue';
import { formatDateTime } from '../../utils/format.js';

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  statusHeaders: {
    type: Array,
    default: () => [],
  },
  overdueHeaders: {
    type: Array,
    default: () => [],
  },
  supplierHeaders: {
    type: Array,
    default: () => [],
  },
});
</script>

<template>
  <v-card rounded="xl" class="mb-4">
    <v-card-title>
      <div class="text-h6 font-weight-bold">Warranty overview</div>
      <div class="text-caption text-medium-emphasis">
        Current claim status and overdue supplier returns
      </div>
    </v-card-title>

    <ResponsiveTable
      :headers="props.statusHeaders"
      :items="props.data.statuses"
      :items-per-page="10"
      density="comfortable"
    />

    <v-card-text v-if="props.data.overdue?.length">
      <h3 class="text-subtitle-1 font-weight-bold">Overdue claims</h3>
      <ResponsiveTable
        :headers="props.overdueHeaders"
        :items="props.data.overdue"
        :items-per-page="10"
        density="comfortable"
      >
        <template #item.created_at="{ item }">
          {{ formatDateTime(item.created_at) }}
        </template>
      </ResponsiveTable>
    </v-card-text>

    <v-card-text v-if="props.data.bySupplier?.length">
      <h3 class="text-subtitle-1 font-weight-bold">Claims by supplier</h3>
      <ResponsiveTable
        :headers="props.supplierHeaders"
        :items="props.data.bySupplier"
        :items-per-page="10"
        density="comfortable"
      />
    </v-card-text>

    <v-card-text
      v-if="!props.data.statuses.length && !props.data.overdue.length"
      class="text-body-2 text-medium-emphasis"
    >
      No warranty claims have been recorded.
    </v-card-text>
  </v-card>
</template>
