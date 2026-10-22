<script setup>
import ResponsiveTable from '../ResponsiveTable.vue';

const props = defineProps({
  categories: {
    type: Array,
    default: () => [],
  },
  activeCount: {
    type: Number,
    default: 0,
  },
  headers: {
    type: Array,
    default: () => [],
  },
  loading: Boolean,
});

const emit = defineEmits([
  'reload',
  'edit',
  'toggle-status',
]);
</script>

<template>
  <v-row>
    <v-col cols="12" sm="6">
      <v-card rounded="xl" variant="outlined" class="pa-4">
        <div class="d-flex align-center ga-3">
          <v-avatar color="primary" variant="tonal" rounded="lg">
            <v-icon icon="mdi-shape-outline" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Total categories</div>
            <div class="text-h6 font-weight-bold">{{ props.categories.length }}</div>
          </div>
        </div>
      </v-card>
    </v-col>
    <v-col cols="12" sm="6">
      <v-card rounded="xl" variant="outlined" class="pa-4">
        <div class="d-flex align-center ga-3">
          <v-avatar color="success" variant="tonal" rounded="lg">
            <v-icon icon="mdi-check-circle-outline" />
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis">Active categories</div>
            <div class="text-h6 font-weight-bold">{{ props.activeCount }}</div>
          </div>
        </div>
      </v-card>
    </v-col>

    <v-col cols="12">
      <v-card rounded="xl" variant="outlined">
        <v-card-title class="d-flex align-center justify-space-between ga-2">
          <div>
            <div class="text-h6 font-weight-bold">Product categories</div>
            <div class="text-caption text-medium-emphasis">
              {{ props.categories.length }} categories
            </div>
          </div>
          <v-btn
            icon="mdi-refresh"
            variant="outlined"
            aria-label="Reload categories"
            :loading="props.loading"
            @click="emit('reload')"
          />
        </v-card-title>

        <ResponsiveTable
          :headers="props.headers"
          :items="props.categories"
          :loading="props.loading"
          :items-per-page="10"
        >
          <template #item.name="{ item }">
            <strong class="text-body-2">{{ item.name }}</strong>
          </template>
          <template #item.description="{ item }">
            <span class="text-body-2 text-medium-emphasis">
              {{ item.description || '—' }}
            </span>
          </template>
          <template #item.status="{ item }">
            <v-chip
              :color="item.status === 'active' ? 'success' : 'error'"
              variant="tonal"
              size="small"
            >
              {{ item.status }}
            </v-chip>
          </template>
          <template #item.actions="{ item }">
            <v-btn
              icon="mdi-pencil-outline"
              variant="text"
              size="small"
              :aria-label="`Edit ${item.name}`"
              @click="emit('edit', item)"
            />
            <v-btn
              :icon="item.status === 'active'
                ? 'mdi-archive-arrow-down-outline'
                : 'mdi-archive-arrow-up-outline'"
              variant="text"
              size="small"
              :disabled="item.status === 'active' && item.activeProductCount > 0"
              :aria-label="item.status === 'active'
                ? `Deactivate ${item.name}`
                : `Reactivate ${item.name}`"
              @click="emit('toggle-status', item)"
            />
          </template>
        </ResponsiveTable>
      </v-card>
    </v-col>
  </v-row>
</template>
