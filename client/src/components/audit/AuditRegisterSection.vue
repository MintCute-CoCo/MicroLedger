<script setup>
import ResponsiveTable from '../ResponsiveTable.vue';
import { formatDateTime } from '../../utils/format.js';

const props = defineProps({
  rows: { type: Array, default: () => [] },
  busy: Boolean,
  action: { type: String, default: '' },
  entity: { type: String, default: '' },
  headers: { type: Array, default: () => [] },
});

const emit = defineEmits([
  'update:action',
  'update:entity',
  'filter',
]);

/**
 * Updates the action filter and requests refreshed audit records.
 *
 * @param {string} value - New action search text.
 * @returns {void} Emits the new filter and refresh events.
 */
function updateAction(value) {
  emit('update:action', value);
  emit('filter');
}

/**
 * Updates the entity filter and requests refreshed audit records.
 *
 * @param {string} value - New entity search text.
 * @returns {void} Emits the new filter and refresh events.
 */
function updateEntity(value) {
  emit('update:entity', value);
  emit('filter');
}
</script>

<template>
  <v-card rounded="xl" variant="outlined">
    <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-2">
      <div>
        <div class="text-h6 font-weight-bold">Audit trail</div>
        <div class="text-caption text-medium-emphasis">
          {{ props.rows.length }} immutable security and mutation records
        </div>
      </div>
      <v-chip color="primary" variant="tonal" size="small">
        {{ props.rows.length }} Events
      </v-chip>
    </v-card-title>

    <v-card-text>
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            :model-value="props.action"
            label="Action contains"
            density="compact"
            variant="outlined"
            hide-details
            @update:model-value="updateAction"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            :model-value="props.entity"
            label="Entity type"
            density="compact"
            variant="outlined"
            hide-details
            @update:model-value="updateEntity"
          />
        </v-col>
      </v-row>
    </v-card-text>

    <ResponsiveTable
      :headers="props.headers"
      :items="props.rows"
      :loading="props.busy"
      :items-per-page="25"
    >
      <template #item.created_at="{ item }">
        {{ formatDateTime(item.created_at) }}
      </template>
      <template #item.details="{ item }">
        <span class="text-caption text-break">
          {{ JSON.stringify(item.details || {}) }}
        </span>
      </template>
    </ResponsiveTable>
  </v-card>
</template>
