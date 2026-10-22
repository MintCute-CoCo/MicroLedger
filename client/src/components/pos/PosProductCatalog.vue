<script setup>
import { formatMoney } from '../../utils/format.js';

const props = defineProps({
  search: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    default: 'All',
  },
  categories: {
    type: Array,
    default: () => [],
  },
  products: {
    type: Array,
    default: () => [],
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
  'add-product',
]);
</script>

<template>
  <v-card rounded="xl" variant="outlined" class="pa-3 pos-catalog-panel">
    <v-text-field
      :model-value="props.search"
      prepend-inner-icon="mdi-magnify"
      placeholder="Search products or scan SKU"
      variant="outlined"
      density="compact"
      hide-details
      rounded="lg"
      @update:model-value="emit('update:search', $event)"
    />

    <v-chip-group
      :model-value="props.category"
      selected-class="text-primary"
      class="mt-1"
      @update:model-value="emit('update:category', $event)"
    >
      <v-chip
        v-for="item in props.categories"
        :key="item"
        :value="item"
        filter
      >
        {{ item }}
      </v-chip>
    </v-chip-group>

    <div class="d-flex align-end justify-space-between ga-2 mt-2 mb-1">
      <div class="text-h6 font-weight-bold">
        Products
        <v-chip size="x-small" variant="tonal">{{ props.products.length }}</v-chip>
      </div>
      <span class="text-caption text-medium-emphasis">Price · available stock</span>
    </div>

    <v-progress-linear
      v-if="props.loading"
      indeterminate
      color="primary"
      class="mb-3"
    />

    <div class="pos-product-list min-h-0">
      <v-row dense>
        <v-col
          v-for="product in props.products"
          :key="product.id"
          cols="12"
          sm="6"
          lg="4"
        >
          <v-btn
            block
            variant="text"
            class="h-auto pa-0 text-none pos-product-button"
            :disabled="props.loading || product.stock === 0"
            :aria-label="`Add ${product.name} to cart`"
            @click="emit('add-product', product)"
          >
            <v-card rounded="lg" variant="outlined" class="pa-2 w-100 text-left">
              <div class="d-flex align-center ga-2">
                <v-avatar color="primary" variant="tonal" rounded="lg" size="40">
                  <v-icon :icon="props.categoryIcon(product.category)" size="large" />
                </v-avatar>
                <div class="flex-grow-1 min-w-0 text-left">
                  <div class="text-caption text-truncate">{{ product.sku }}</div>
                  <div class="text-body-2 font-weight-bold text-truncate">
                    {{ product.name }}
                  </div>
                </div>
                <v-icon icon="mdi-plus-circle-outline" color="primary" />
              </div>
              <div class="d-flex align-center justify-space-between flex-wrap ga-1 mt-2">
                <strong class="text-body-2">{{ formatMoney(product.price) }}</strong>
                <v-chip
                  v-if="product.stock <= product.reorder && product.stock > 0"
                  color="warning"
                  size="x-small"
                  variant="tonal"
                >
                  Low stock
                </v-chip>
                <v-chip
                  v-else-if="product.stock === 0"
                  color="error"
                  size="x-small"
                  variant="tonal"
                >
                  Out of stock
                </v-chip>
                <span v-else class="text-caption text-medium-emphasis">
                  {{ product.stock }} available
                </span>
              </div>
            </v-card>
          </v-btn>
        </v-col>
      </v-row>

      <v-empty-state
        v-if="!props.loading && !props.products.length"
        icon="mdi-package-variant"
        title="No products found"
        text="Try another name or category."
      />
    </div>
  </v-card>
</template>
