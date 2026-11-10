<script setup>
/**
 * Category Creation & Modification Modal Dialog
 *
 * PURPOSE:
 * Provides an accessible form dialog for creating new product taxonomy categories
 * or renaming existing categories with field validation error reporting.
 */
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
  'update:draft',
  'clear-error',
  'save',
]);

/**
 * Emits updated draft state and clears field errors through composables.
 *
 * @param {string} field - Field property name.
 * @param {*} value - New field value.
 */
function updateField(field, value) {
  emit('update:draft', { ...props.draft, [field]: value });
  emit('clear-error', field);
}
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
          :model-value="props.draft.name"
          label="Category name"
          maxlength="100"
          :error-messages="props.fieldErrors.name"
          variant="outlined"
          autofocus
          @update:model-value="updateField('name', $event)"
        />

        <v-textarea
          :model-value="props.draft.description"
          label="Description (optional)"
          maxlength="255"
          rows="2"
          auto-grow
          :error-messages="props.fieldErrors.description"
          variant="outlined"
          @update:model-value="updateField('description', $event)"
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
