<script setup>
const props = defineProps({
  isAdmin: Boolean,
  reportType: {
    type: String,
    default: 'sales',
  },
  from: {
    type: String,
    default: '',
  },
  to: {
    type: String,
    default: '',
  },
  group: {
    type: String,
    default: 'day',
  },
  reportTypeOptions: {
    type: Array,
    default: () => [],
  },
  salesGroupingOptions: {
    type: Array,
    default: () => [],
  },
  error: {
    type: String,
    default: '',
  },
  busy: Boolean,
});

const emit = defineEmits([
  'update:reportType',
  'update:from',
  'update:to',
  'update:group',
  'load',
]);
</script>

<template>
  <v-card rounded="xl" class="mb-4">
    <v-card-title class="text-h6">Report parameters</v-card-title>
    <v-card-subtitle>Select reporting criteria and date boundaries</v-card-subtitle>
    <v-card-text>
      <v-alert
        v-if="props.error"
        type="error"
        variant="tonal"
        class="mb-4"
      >
        {{ props.error }}
      </v-alert>

      <v-row>
        <v-col v-if="props.isAdmin" cols="12" md="4">
          <v-select
            :model-value="props.reportType"
            :items="props.reportTypeOptions"
            label="Report"
            variant="outlined"
            density="compact"
            @update:model-value="emit('update:reportType', $event)"
          />
        </v-col>
        <template v-if="props.reportType !== 'warranty'">
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              :model-value="props.from"
              type="date"
              label="From date"
              :max="props.to || undefined"
              variant="outlined"
              density="compact"
              @update:model-value="emit('update:from', $event)"
            />
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              :model-value="props.to"
              type="date"
              label="To date"
              :min="props.from || undefined"
              variant="outlined"
              density="compact"
              @update:model-value="emit('update:to', $event)"
            />
          </v-col>
        </template>
        <v-col
          v-if="props.reportType === 'sales' && props.isAdmin"
          cols="12"
          md="4"
        >
          <v-select
            :model-value="props.group"
            :items="props.salesGroupingOptions"
            label="Group sales"
            variant="outlined"
            density="compact"
            @update:model-value="emit('update:group', $event)"
          />
        </v-col>
        <v-col cols="12">
          <v-btn
            color="primary"
            rounded="lg"
            class="w-100 w-sm-auto"
            :loading="props.busy"
            prepend-icon="mdi-chart-box-outline"
            @click="emit('load')"
          >
            Load report
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>
