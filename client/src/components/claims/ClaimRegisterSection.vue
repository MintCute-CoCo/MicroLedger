<script setup>
import ResponsiveTable from '../ResponsiveTable.vue';
import { formatDate } from '../../utils/format.js';

const props = defineProps({
  rows: {
    type: Array,
    default: () => [],
  },
  total: {
    type: Number,
    default: 0,
  },
  activeCount: {
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
  busy: Boolean,
  filters: {
    type: Object,
    required: true,
  },
  statuses: {
    type: Array,
    default: () => [],
  },
  suppliers: {
    type: Array,
    default: () => [],
  },
  headers: {
    type: Array,
    default: () => [],
  },
  availableTransitions: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits([
  'options',
  'show-detail',
  'start-transition',
]);
</script>

<template>
  <v-row>
    <v-col cols="12" sm="6">
      <v-card rounded="xl" variant="outlined" class="pa-4">
        <div class="d-flex align-center ga-3">
          <v-avatar color="primary" variant="tonal" rounded="lg">
            <v-icon icon="mdi-clipboard-text-outline" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Total claims</div>
            <div class="text-h6 font-weight-bold">{{ props.total }}</div>
          </div>
        </div>
      </v-card>
    </v-col>
    <v-col cols="12" sm="6">
      <v-card rounded="xl" variant="outlined" class="pa-4">
        <div class="d-flex align-center ga-3">
          <v-avatar color="warning" variant="tonal" rounded="lg">
            <v-icon icon="mdi-clock-alert-outline" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Active cases</div>
            <div class="text-h6 font-weight-bold">{{ props.activeCount }}</div>
          </div>
        </div>
      </v-card>
    </v-col>

    <v-col cols="12">
      <v-card rounded="xl" variant="outlined">
        <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-2">
          <div>
            <div class="text-h6 font-weight-bold">Warranty claims</div>
            <div class="text-caption text-medium-emphasis">
              {{ props.total }} recorded claims · track lifecycle through collection
            </div>
          </div>
          <v-chip color="primary" variant="tonal" size="small">
            {{ props.total }} Claims
          </v-chip>
        </v-card-title>

        <v-card-text>
          <v-row dense>
            <v-col cols="12" sm="6" md="4">
              <v-select
                v-model="props.filters.status"
                :items="[
                  { title: 'All statuses', value: 'all' },
                  ...props.statuses.map((status) => ({ title: status, value: status }))
                ]"
                label="Status"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-select
                v-model="props.filters.supplierId"
                :items="[
                  { title: 'All suppliers', value: null },
                  ...props.suppliers.map((supplier) => ({
                    title: supplier.name,
                    value: supplier.id
                  }))
                ]"
                label="Supplier"
                variant="outlined"
                density="compact"
                hide-details
                clearable
              />
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="props.filters.phone"
                label="Customer phone"
                placeholder="Search phone"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="props.filters.from"
                type="date"
                label="From claim date"
                :max="props.filters.to || undefined"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="props.filters.to"
                type="date"
                label="To claim date"
                :min="props.filters.from || undefined"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="12" sm="6" md="4">
              <v-checkbox
                v-model="props.filters.overdue"
                label="Overdue only"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>
        </v-card-text>

        <ResponsiveTable
          :headers="props.headers"
          :items="props.rows"
          :server="true"
          :items-length="props.total"
          :page="props.page"
          :items-per-page="props.pageSize"
          :loading="props.busy"
          @update:options="emit('options', $event)"
        >
          <template #item.claim_no="{ item }">
            <v-btn
              variant="text"
              color="primary"
              class="text-none"
              @click="emit('show-detail', item)"
            >
              {{ item.claim_no }}
            </v-btn>
          </template>
          <template #item.claim_date="{ item }">
            <span class="text-body-2">{{ formatDate(item.claim_date) }}</span>
          </template>
          <template #item.due="{ item }">
            <v-chip
              v-if="item.overdue"
              color="error"
              variant="tonal"
              size="small"
            >
              Overdue · {{ item.daysOverdue }}d
            </v-chip>
            <span
              v-else-if="item.status === 'With Supplier' && item.sent_date && !item.actual_return_date"
              class="text-body-2 text-medium-emphasis"
            >
              {{ item.daysAway }}d away
            </span>
          </template>
          <template #item.actions="{ item }">
            <v-btn
              icon="mdi-eye-outline"
              variant="text"
              aria-label="View claim history"
              @click="emit('show-detail', item)"
            />
            <v-btn
              v-if="props.availableTransitions(item).length"
              icon="mdi-arrow-right-circle-outline"
              variant="text"
              aria-label="Update claim status"
              @click="emit('start-transition', item)"
            />
          </template>
          <template #no-data>
            <v-empty-state
              icon="mdi-clipboard-text-search-outline"
              title="No claims match these filters"
            />
          </template>
        </ResponsiveTable>
      </v-card>
    </v-col>
  </v-row>
</template>
