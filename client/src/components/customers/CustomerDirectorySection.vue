<script setup>
import ResponsiveTable from '../ResponsiveTable.vue';
import { formatMoney } from '../../utils/format.js';

const props = defineProps({
  count: {
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
  'edit',
]);
</script>

<template>
  <v-row>
    <v-col cols="12">
      <v-card rounded="xl" variant="outlined" class="pa-4">
        <div class="d-flex align-center ga-3">
          <v-avatar color="primary" variant="tonal" rounded="lg" size="40">
            <v-icon icon="mdi-account-group-outline" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Customers in your list</div>
            <div class="text-h6 font-weight-bold">{{ props.count }}</div>
          </div>
        </div>
      </v-card>
    </v-col>

    <v-col cols="12">
      <v-card rounded="xl" variant="outlined">
        <v-card-text>
          <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between ga-3">
            <div>
              <h2 class="text-h6 font-weight-bold">Customer directory</h2>
              <p class="text-caption text-medium-emphasis mb-0">
                Search by name or phone number
              </p>
            </div>
            <v-text-field
              :model-value="props.search"
              placeholder="Find a customer"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              @update:model-value="emit('update:search', $event)"
            />
          </div>
        </v-card-text>

        <ResponsiveTable
          :headers="props.headers"
          :items="props.items"
          :server="true"
          :items-length="props.count"
          :page="props.page"
          :items-per-page="props.pageSize"
          :items-per-page-options="[8, 16, 32]"
          :loading="props.loading"
          @update:options="emit('options', $event)"
        >
          <template #item.name="{ item }">
            <div class="d-flex align-center ga-2">
              <v-avatar color="primary" variant="tonal" size="36">
                {{ item.initials }}
              </v-avatar>
              <div>
                <div class="text-body-2 font-weight-medium">{{ item.name }}</div>
                <div class="text-caption text-medium-emphasis">
                  Customer since {{ item.createdAt ? new Date(item.createdAt).getFullYear() : 2026 }}
                </div>
              </div>
            </div>
          </template>
          <template #item.phone="{ item }">
            <span class="text-body-2 text-medium-emphasis">{{ item.phone }}</span>
          </template>
          <template #item.visits="{ item }">
            <strong class="text-body-2">{{ item.visits }}</strong>
          </template>
          <template #item.spent="{ item }">
            <strong class="text-body-2 font-weight-bold">
              {{ formatMoney(item.spent) }}
            </strong>
          </template>
          <template #item.actions="{ item }">
            <v-btn
              icon="mdi-pencil-outline"
              variant="text"
              size="small"
              :aria-label="`Edit ${item.name}`"
              @click="emit('edit', item)"
            />
          </template>
          <template #no-data>
            <v-empty-state
              icon="mdi-account-search-outline"
              title="No customers found"
              text="Try another search."
            />
          </template>
        </ResponsiveTable>
      </v-card>
    </v-col>
  </v-row>
</template>
