<script setup>
import ResponsiveTable from '../ResponsiveTable.vue';
import { formatMoney } from '../../utils/format.js';

const props = defineProps({
  canEdit: Boolean,
  categories: {
    type: Array,
    default: () => [],
  },
  statuses: {
    type: Array,
    default: () => [],
  },
  search: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    default: '',
  },
  statusFilter: {
    type: String,
    default: '',
  },
  lowStockOnly: Boolean,
  advancedOpen: Boolean,
  minStock: {
    type: [String, Number],
    default: '',
  },
  maxStock: {
    type: [String, Number],
    default: '',
  },
  minPrice: {
    type: [String, Number],
    default: '',
  },
  maxPrice: {
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
  itemsLength: {
    type: Number,
    default: 0,
  },
  page: {
    type: Number,
    default: 1,
  },
  loading: Boolean,
  categoryIcon: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits([
  'update:search',
  'update:category',
  'update:statusFilter',
  'update:lowStockOnly',
  'update:advancedOpen',
  'update:minStock',
  'update:maxStock',
  'update:minPrice',
  'update:maxPrice',
  'options',
  'edit',
  'toggle-status',
]);
</script>

<template>
  <v-card rounded="xl" variant="outlined">
    <v-card-text>
      <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between ga-2 mb-3">
        <div>
          <h2 class="text-h6 font-weight-bold">All products</h2>
          <p class="text-caption text-medium-emphasis mb-0">
            {{ props.apiMode ? props.itemsLength : props.items.length }} products found
          </p>
        </div>
        <div class="d-flex align-center flex-wrap ga-2">
          <v-checkbox
            :model-value="props.lowStockOnly"
            label="Low stock"
            density="compact"
            hide-details
            @update:model-value="emit('update:lowStockOnly', $event)"
          />
          <v-btn
            :variant="props.advancedOpen ? 'tonal' : 'text'"
            size="small"
            prepend-icon="mdi-tune-variant"
            class="w-100 w-sm-auto"
            @click="emit('update:advancedOpen', !props.advancedOpen)"
          >
            Advanced
          </v-btn>
        </div>
      </div>

      <v-row dense>
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            :model-value="props.search"
            placeholder="Search SKU or name"
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
            :model-value="props.category"
            :items="props.categories"
            label="Category"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:category', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-select
            :model-value="props.statusFilter"
            :items="props.statuses"
            label="Status"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:statusFilter', $event)"
          />
        </v-col>
      </v-row>

      <v-row v-if="props.advancedOpen" dense>
        <v-col cols="12" sm="6" md="3">
          <v-text-field
            :model-value="props.minStock"
            type="number"
            min="0"
            label="Min stock"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:minStock', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-text-field
            :model-value="props.maxStock"
            type="number"
            min="0"
            label="Max stock"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:maxStock', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-text-field
            :model-value="props.minPrice"
            type="number"
            min="0"
            step="0.01"
            label="Min price"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:minPrice', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-text-field
            :model-value="props.maxPrice"
            type="number"
            min="0"
            step="0.01"
            label="Max price"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:maxPrice', $event)"
          />
        </v-col>
      </v-row>
    </v-card-text>

    <ResponsiveTable
      :headers="props.headers"
      :items="props.items"
      :server="true"
      :items-length="props.itemsLength"
      :items-per-page="8"
      :page="props.page"
      :loading="props.loading"
      hover
      @update:options="emit('options', $event)"
    >
      <template #item.name="{ item }">
        <div class="d-flex align-center ga-2">
          <v-avatar color="primary" variant="tonal" rounded="lg" size="36">
            <v-icon :icon="props.categoryIcon(item.category)" />
          </v-avatar>
          <span class="text-body-2 font-weight-medium">{{ item.name }}</span>
        </div>
      </template>
      <template #item.sku="{ item }">
        <span class="text-caption">{{ item.sku }}</span>
      </template>
      <template #item.price="{ item }">
        <strong class="text-body-2">{{ formatMoney(item.price) }}</strong>
      </template>
      <template #item.stock="{ item }">
        <span class="text-body-2">
          {{ item.stock }} / {{ item.reorder }} min
        </span>
      </template>
      <template #item.status="{ item }">
        <v-chip
          :color="item.status === 'inactive' ? 'error' : 'success'"
          variant="tonal"
          size="small"
        >
          {{ item.status || 'active' }}
        </v-chip>
      </template>
      <template #item.actions="{ item }">
        <v-menu v-if="props.canEdit">
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              icon="mdi-dots-horizontal"
              variant="text"
              size="small"
              :aria-label="`Actions for ${item.name}`"
            />
          </template>
          <v-list density="compact">
            <v-list-item
              title="Edit product"
              prepend-icon="mdi-pencil-outline"
              @click="emit('edit', item)"
            />
            <v-list-item
              :title="item.status === 'active' ? 'Deactivate' : 'Reactivate'"
              :prepend-icon="item.status === 'active'
                ? 'mdi-archive-arrow-down-outline'
                : 'mdi-archive-arrow-up-outline'"
              @click="emit('toggle-status', item)"
            />
          </v-list>
        </v-menu>
        <span v-else class="text-medium-emphasis">—</span>
      </template>
      <template #no-data>
        <v-empty-state
          icon="mdi-package-variant"
          title="No matching products"
          text="Change the search or category filter."
        />
      </template>
    </ResponsiveTable>
  </v-card>
</template>
