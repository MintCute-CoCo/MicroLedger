<script setup>
const props = defineProps({
  open: Boolean,
  editing: Boolean,
  draft: {
    type: Object,
    required: true,
  },
  fieldErrors: {
    type: Object,
    required: true,
  },
  error: {
    type: String,
    default: '',
  },
  saving: Boolean,
});

const emit = defineEmits([
  'update:open',
  'save',
]);
</script>

<template>
  <v-dialog
    :model-value="props.open"
    max-width="480"
    @update:model-value="emit('update:open', $event)"
  >
    <v-card rounded="xl">
      <v-card-title class="text-h6 font-weight-bold">
        {{ props.editing ? 'Edit category' : 'New category' }}
      </v-card-title>

      <v-card-text>
        <v-alert
          v-if="props.error"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ props.error }}
        </v-alert>

        <v-text-field
          v-model="props.draft.name"
          label="Category name"
          maxlength="100"
          :error-messages="props.fieldErrors.name"
          variant="outlined"
          autofocus
          @update:model-value="props.fieldErrors.name = undefined"
        />

        <v-textarea
          v-model="props.draft.description"
          label="Description (optional)"
          maxlength="255"
          rows="2"
          auto-grow
          :error-messages="props.fieldErrors.description"
          variant="outlined"
          @update:model-value="props.fieldErrors.description = undefined"
        />
      </v-card-text>

      <v-card-actions class="d-flex flex-wrap ga-2 justify-end pa-4">
        <v-spacer class="d-none d-sm-block" />
        <v-btn
          variant="outlined"
          rounded="lg"
          class="w-100 w-sm-auto"
          @click="emit('update:open', false)"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          rounded="lg"
          class="w-100 w-sm-auto"
          :loading="props.saving"
          :disabled="!props.draft.name.trim()"
          @click="emit('save')"
        >
          {{ props.editing ? 'Save changes' : 'Create category' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
