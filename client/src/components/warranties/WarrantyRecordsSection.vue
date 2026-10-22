<script setup>
import ResponsiveTable from '../ResponsiveTable.vue';
import { formatDate } from '../../utils/format.js';

const props = defineProps({
  total: {
    type: Number,
    default: 0,
  },
  search: {
    type: String,
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
});

const emit = defineEmits([
  'update:search',
  'options',
  'refresh',
  'attach',
]);
</script>

<template>
  <v-row>
    <v-col cols="12">
      <v-card rounded="xl" variant="outlined" class="pa-4">
        <div class="d-flex align-center ga-3">
          <v-avatar color="primary" variant="tonal" rounded="lg">
            <v-icon icon="mdi-shield-check-outline" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Total warranties</div>
            <div class="text-h6 font-weight-bold">{{ props.total }}</div>
          </div>
        </div>
      </v-card>
    </v-col>

    <v-col cols="12">
      <v-card rounded="xl" variant="outlined">
        <v-card-text>
          <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between ga-3">
            <div>
              <h2 class="text-h6 font-weight-bold">Warranty records</h2>
              <p class="text-caption text-medium-emphasis mb-0">
                Search product coverage and attach customer details
              </p>
            </div>
            <v-chip color="primary" variant="tonal" size="small">
              {{ props.total }} Records
            </v-chip>
          </div>
          <v-row align="center" class="mt-2">
            <v-col>
              <v-text-field
                :model-value="props.search"
                label="Search sale, phone, serial, SKU, or product"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                hide-details
                @update:model-value="emit('update:search', $event)"
              />
            </v-col>
            <v-col cols="auto">
              <v-btn
                icon="mdi-refresh"
                variant="text"
                aria-label="Refresh warranties"
                @click="emit('refresh')"
              />
            </v-col>
          </v-row>
        </v-card-text>

        <ResponsiveTable
          :headers="props.headers"
          :items="props.items"
          :server="true"
          :items-length="props.total"
          :page="props.page"
          :items-per-page="props.pageSize"
          :items-per-page-options="[10, 25, 50]"
          :loading="props.loading"
          @update:options="emit('options', $event)"
        >
          <template #item.expiry_date="{ item }">
            <span class="text-body-2">{{ formatDate(item.expiry_date) }}</span>
          </template>
          <template #item.actions="{ item }">
            <v-btn
              v-if="!item.customer_id"
              icon="mdi-account-plus-outline"
              variant="text"
              aria-label="Attach customer"
              @click="emit('attach', item)"
            />
          </template>
        </ResponsiveTable>
      </v-card>
    </v-col>
  </v-row>
</template>
