<script setup>
import ResponsiveTable from '../ResponsiveTable.vue';

const props = defineProps({
  preview: { type: Object, default: null },
  mode: { type: String, default: 'all' },
  busy: Boolean,
  headers: { type: Array, default: () => [] },
  totalPages: { type: Number, default: 1 },
  formatIssues: { type: Function, required: true },
});

const emit = defineEmits([
  'update:mode',
  'page',
  'download-errors',
  'commit',
]);

const countLabels = [
  { key: 'total', label: 'Total rows' },
  { key: 'new', label: 'New products' },
  { key: 'update', label: 'Updates' },
  { key: 'error', label: 'Errors' },
  { key: 'warning', label: 'Warnings' },
];
</script>

<template>
  <v-card v-if="props.preview" rounded="xl" variant="outlined">
    <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-2">
      <div>
        <div class="text-h6 font-weight-bold">{{ props.preview.filename }}</div>
        <div class="text-caption text-medium-emphasis">
          Preview expires {{ props.preview.expiresAt }}
        </div>
      </div>
      <v-btn
        v-if="props.preview.counts.error"
        variant="outlined"
        rounded="lg"
        class="w-100 w-sm-auto"
        prepend-icon="mdi-download"
        @click="emit('download-errors')"
      >
        Download errors CSV
      </v-btn>
    </v-card-title>

    <v-card-text>
      <v-row dense>
        <v-col
          v-for="count in countLabels"
          :key="count.key"
          cols="6"
          sm="4"
          md="auto"
        >
          <v-card variant="tonal" class="pa-3 h-100">
            <div class="text-caption text-medium-emphasis">{{ count.label }}</div>
            <div class="text-h6 font-weight-bold">
              {{ props.preview.counts[count.key] }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-radio-group
        :model-value="props.mode"
        inline
        @update:model-value="emit('update:mode', $event)"
      >
        <v-radio label="All rows: cancel if any row fails" value="all" />
        <v-radio label="Valid rows only: skip errors" value="valid_only" />
      </v-radio-group>
    </v-card-text>

    <ResponsiveTable
      :headers="props.headers"
      :items="props.preview.rows"
      :items-per-page="25"
      hide-default-footer
    >
      <template #item.issues="{ item }">
        {{ props.formatIssues(item) }}
      </template>
    </ResponsiveTable>

    <v-card-actions class="flex-wrap justify-end ga-2 pa-4">
      <v-pagination
        v-if="props.preview.counts.total > 25"
        :model-value="props.preview.page"
        :length="props.totalPages"
        density="compact"
        @update:model-value="emit('page', $event)"
      />
      <v-btn
        color="primary"
        rounded="lg"
        class="w-100 w-sm-auto"
        :loading="props.busy"
        :disabled="props.busy || (props.mode === 'all' && props.preview.counts.error > 0)"
        @click="emit('commit')"
      >
        Commit import
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
