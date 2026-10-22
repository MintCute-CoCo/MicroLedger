<script setup>
const props = defineProps({
  file: { type: [File, Array, null], default: null },
  busy: Boolean,
  error: { type: String, default: '' },
  done: { type: String, default: '' },
});

const emit = defineEmits(['update:file', 'download-template', 'upload']);
</script>

<template>
  <v-row>
    <v-col cols="12" md="6">
      <v-card rounded="xl" variant="outlined" class="h-100">
        <v-card-title class="text-h6 font-weight-bold">Start with the template</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis">
            CSV and Excel templates include supported columns and an example row.
          </p>
          <div class="d-flex flex-wrap ga-2">
            <v-btn
              variant="outlined"
              rounded="lg"
              class="w-100 w-sm-auto"
              prepend-icon="mdi-download"
              @click="emit('download-template', 'csv')"
            >
              Download CSV
            </v-btn>
            <v-btn
              variant="outlined"
              rounded="lg"
              class="w-100 w-sm-auto"
              prepend-icon="mdi-download"
              @click="emit('download-template', 'xlsx')"
            >
              Download XLSX
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" md="6">
      <v-card rounded="xl" variant="outlined" class="h-100">
        <v-card-title class="text-h6 font-weight-bold">Upload spreadsheet</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis">
            Select a .csv or .xlsx file to validate and preview rows before importing.
          </p>
          <v-file-input
            :model-value="props.file"
            label="Product file (.xlsx or .csv)"
            accept=".xlsx,.csv"
            variant="outlined"
            density="compact"
            prepend-icon="mdi-file-upload-outline"
            @update:model-value="emit('update:file', $event)"
          />
          <v-btn
            color="primary"
            rounded="lg"
            class="w-100 w-sm-auto"
            :loading="props.busy"
            :disabled="!props.file"
            @click="emit('upload')"
          >
            Validate and preview
          </v-btn>
          <v-alert v-if="props.error" type="error" variant="tonal" class="mt-4">
            {{ props.error }}
          </v-alert>
          <v-alert v-if="props.done" type="success" variant="tonal" class="mt-4">
            {{ props.done }}
          </v-alert>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>
