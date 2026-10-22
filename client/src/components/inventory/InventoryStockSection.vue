<script setup>
import ResponsiveTable from '../ResponsiveTable.vue';

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
  search: {
    type: String,
    default: '',
  },
  category: {
    type: [String, Number],
    default: 'all',
  },
  lowStockOnly: Boolean,
  categories: {
    type: Array,
    default: () => [],
  },
  canAdjust: Boolean,
});

const emit = defineEmits([
  'update:search',
  'update:category',
  'update:lowStockOnly',
  'options',
  'stock-in',
  'adjust',
]);
</script>

<template>
  <v-card rounded="xl" variant="outlined">
    <v-card-text>
      <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between ga-2 mb-3">
        <div>
          <h2 class="text-h6 font-weight-bold">Stock overview</h2>
          <p class="text-caption text-medium-emphasis mb-0">
            {{ props.itemsLength }} products match this view
          </p>
        </div>
        <v-switch
          :model-value="props.lowStockOnly"
          label="Low stock only"
          color="primary"
          density="compact"
          hide-details
          @update:model-value="emit('update:lowStockOnly', $event)"
        />
      </div>

      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            :model-value="props.search"
            placeholder="Search product or SKU"
            label="Search"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emit('update:search', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6">
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
      </v-row>
    </v-card-text>

    <ResponsiveTable
      :headers="props.headers"
      :items="props.items"
      :server="props.apiMode"
      :items-length="props.itemsLength"
      :page="props.page"
      :items-per-page="props.pageSize"
      :items-per-page-options="[7, 14, 28]"
      :loading="props.loading"
      @update:options="emit('options', $event)"
    >
      <template #item.name="{ item }">
        <div class="d-flex align-center ga-2">
          <v-avatar color="primary" variant="tonal" rounded="lg" size="36">
            <v-icon icon="mdi-package-variant-closed" />
          </v-avatar>
          <div>
            <div class="text-body-2 font-weight-medium">{{ item.name }}</div>
            <div class="text-caption text-medium-emphasis">{{ item.category }}</div>
          </div>
        </div>
      </template>
      <template #item.stock="{ item }">
        <strong class="text-body-2">{{ item.stock }}</strong>
      </template>
      <template #item.status="{ item }">
        <v-chip
          :color="item.stock <= item.reorder ? 'warning' : 'success'"
          variant="tonal"
          size="small"
        >
          {{ item.stock <= item.reorder ? 'Low stock' : 'In stock' }}
        </v-chip>
      </template>
      <template #item.actions="{ item }">
        <v-btn
          size="small"
          variant="text"
          color="primary"
          @click="emit('stock-in', item.id)"
        >
          Add stock
        </v-btn>
        <v-btn
          v-if="props.canAdjust"
          size="small"
          variant="text"
          @click="emit('adjust', item.id)"
        >
          Adjust
        </v-btn>
      </template>
      <template #no-data>
        <v-empty-state
          icon="mdi-package-variant"
          title="No products match this search"
        />
      </template>
    </ResponsiveTable>
  </v-card>
</template>
