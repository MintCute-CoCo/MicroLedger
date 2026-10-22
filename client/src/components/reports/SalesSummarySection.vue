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
  voidedHeaders: {
    type: Array,
    default: () => [],
  },
  totals: {
    type: Object,
    required: true,
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
        <div class="text-h6 font-weight-bold">Sales summary</div>
        <div class="text-caption text-medium-emphasis">
          {{ props.data.groups.length }} groups · completed sales only
        </div>
      </div>
      <strong class="text-h6">
        {{ formatMoney(props.toCents(props.totals.total)) }}
      </strong>
    </v-card-title>

    <v-row class="pa-4">
      <v-col cols="12" sm="6" lg="3">
        <v-card variant="tonal" color="primary" class="pa-3 h-100">
          <div class="text-caption">Units sold</div>
          <strong class="text-body-2">{{ props.totals.quantity.toLocaleString() }}</strong>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <v-card variant="tonal" color="deep-purple" class="pa-3 h-100">
          <div class="text-caption">Subtotal</div>
          <strong class="text-body-2">
            {{ formatMoney(props.toCents(props.totals.subtotal)) }}
          </strong>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <v-card variant="tonal" color="error" class="pa-3 h-100">
          <div class="text-caption">Discounts</div>
          <strong class="text-body-2">
            {{ formatMoney(props.toCents(props.totals.discount)) }}
          </strong>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <v-card variant="tonal" color="success" class="pa-3 h-100">
          <div class="text-caption">Net sales</div>
          <strong class="text-body-2">
            {{ formatMoney(props.toCents(props.totals.total)) }}
          </strong>
        </v-card>
      </v-col>
    </v-row>

    <ResponsiveTable
      :headers="props.headers"
      :items="props.data.groups"
      :items-per-page="10"
      density="comfortable"
    >
      <template #item.total="{ item }">
        <strong>{{ formatMoney(props.toCents(item.total)) }}</strong>
      </template>
      <template #item.subtotal="{ item }">
        {{ formatMoney(props.toCents(item.subtotal)) }}
      </template>
      <template #item.discount="{ item }">
        {{ formatMoney(props.toCents(item.discount)) }}
      </template>
    </ResponsiveTable>

    <v-card-text v-if="props.data.voided?.length">
      <h3 class="text-subtitle-1 font-weight-bold">Voided sales</h3>
      <ResponsiveTable
        :headers="props.voidedHeaders"
        :items="props.data.voided"
        :items-per-page="5"
        density="comfortable"
      >
        <template #item.sold_at="{ item }">
          {{ formatDateTime(item.sold_at) }}
        </template>
        <template #item.total="{ item }">
          {{ formatMoney(props.toCents(item.total)) }}
        </template>
      </ResponsiveTable>
    </v-card-text>
  </v-card>
</template>
