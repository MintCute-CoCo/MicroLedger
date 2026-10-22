<script setup>
import { ref } from 'vue';

const props = defineProps({
  open: Boolean,
  editingCustomer: {
    type: Object,
    default: null,
  },
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
  'submit',
]);

const formRef = ref(null);

/**
 * Validates the customer form before asking the page to save the draft.
 *
 * @returns {Promise<void>} Resolves after validation and event dispatch.
 */
async function submitForm() {
  const validationResult = await formRef.value?.validate();

  if (!validationResult?.valid) {
    return;
  }

  emit('submit');
}
</script>

<template>
  <v-dialog
    :model-value="props.open"
    max-width="440"
    persistent
    @update:model-value="emit('update:open', $event)"
  >
    <v-card rounded="xl" class="pa-5">
      <div class="d-flex align-start justify-space-between ga-3 mb-4">
        <div>
          <h2 class="text-h6 font-weight-bold">
            {{ props.editingCustomer ? 'Edit customer' : 'Add customer' }}
          </h2>
          <p class="text-body-2 text-medium-emphasis mb-0">
            'Save customer details to the store directory.'
          </p>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Close dialog"
          @click="emit('update:open', false)"
        />
      </div>

      <v-form
        ref="formRef"
        @submit.prevent="submitForm"
      >
        <v-alert
          v-if="props.error"
          type="error"
          variant="tonal"
          class="mb-3"
        >
          {{ props.error }}
        </v-alert>

        <v-text-field
          v-model="props.draft.name"
          label="Full name *"
          placeholder="Customer name"
          :rules="[(value) => Boolean(String(value ?? '').trim()) || 'Enter a customer name.']"
          :error-messages="props.fieldErrors.name"
          variant="outlined"
          @update:model-value="props.fieldErrors.name = undefined"
        />

        <v-text-field
          v-model="props.draft.phone"
          label="Phone number"
          placeholder="Optional"
          hint="5–30 characters; digits and common phone punctuation."
          persistent-hint
          :error-messages="props.fieldErrors.phone"
          variant="outlined"
          @update:model-value="props.fieldErrors.phone = undefined"
        />

        <div class="d-flex flex-wrap justify-end ga-2 mt-4">
          <v-btn
            variant="outlined"
            rounded="lg"
            class="w-100 w-sm-auto"
            @click="emit('update:open', false)"
          >
            Cancel
          </v-btn>
          <v-btn
            type="submit"
            color="primary"
            rounded="lg"
            class="w-100 w-sm-auto"
            :loading="props.saving"
          >
            {{ props.editingCustomer ? 'Save changes' : 'Add customer' }}
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-dialog>
</template>
