<script setup>
const props = defineProps({
  type: {
    type: String,
    default: '',
  },
  format: {
    type: String,
    default: '',
  },
  dataOptions: {
    type: Array,
    default: () => [],
  },
  formatOptions: {
    type: Array,
    default: () => [],
  },
  busy: Boolean,
});

const emit = defineEmits([
  'update:type',
  'update:format',
  'download',
]);
</script>

<template>
  <v-card rounded="xl" class="mb-4">
    <v-card-title class="text-h6">Export data and reports</v-card-title>
    <v-card-subtitle>
      Report exports use the same date range and grouping as the displayed report.
    </v-card-subtitle>
    <v-card-text>
      <v-row align="center">
        <v-col cols="12" sm="6" md="4">
          <v-select
            :model-value="props.type"
            :items="props.dataOptions"
            label="Data"
            variant="outlined"
            density="compact"
            @update:model-value="emit('update:type', $event)"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-select
            :model-value="props.format"
            :items="props.formatOptions"
            label="Format"
            variant="outlined"
            density="compact"
            @update:model-value="emit('update:format', $event)"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-btn
            color="primary"
            rounded="lg"
            class="w-100"
            :loading="props.busy"
            prepend-icon="mdi-download"
            @click="emit('download')"
          >
            Download export
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>
