<script setup>
/**
 * Inventory Stock-In & Stock Adjustment Modal Dialog
 *
 * PURPOSE:
 * Captures inbound supplier shipments (Stock-In) or physical inventory write-downs
 * (Adjustment with mandatory reason documentation).
 */
import { ref } from 'vue';

const props = defineProps({
  open: Boolean,
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
  productOptions: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits([
  'update:open',
  'update:draft',
  'clear-error',
  'submit',
]);

const formRef = ref(null);

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

/**
 * Validates the inventory movement before dispatching it to the page.
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
    max-width="470"
    persistent
    @update:model-value="emit('update:open', $event)"
  >
    <v-card rounded="xl" class="pa-5">
      <div class="d-flex align-start justify-space-between ga-3 mb-4">
        <div>
          <h2 class="text-h6 font-weight-bold">
            {{ props.draft.type === 'Stock in' ? 'Receive stock' : 'Adjust inventory' }}
          </h2>
          <p class="text-body-2 text-medium-emphasis mb-0">
            {{ props.draft.type === 'Stock in'
              ? 'Record newly received inventory.'
              : 'Record a correction with a reason.' }}
          </p>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Close dialog"
          @click="emit('update:open', false)"
        />
      </div>

      <v-form ref="formRef" @submit.prevent="submitForm">
        <v-alert
          v-if="props.error"
          type="error"
          variant="tonal"
          class="mb-3"
        >
          {{ props.error }}
        </v-alert>

        <v-select
          :model-value="props.draft.productId"
          label="Product *"
          :items="props.productOptions"
          item-title="name"
          item-value="id"
          :rules="[(value) => Boolean(value) || 'Choose a product.']"
          :error-messages="props.fieldErrors.productId"
          variant="outlined"
          @update:model-value="updateField('productId', $event)"
        />

        <v-text-field
          :model-value="props.draft.quantity"
          :label="props.draft.type === 'Stock in'
            ? 'Quantity received *'
            : 'Change in quantity *'"
          type="number"
          :min="props.draft.type === 'Stock in' ? 1 : undefined"
          hint="For adjustments, use a minus sign to remove stock."
          persistent-hint
          :rules="[
            (value) =>
              (Number.isInteger(Number(value)) && Number(value) !== 0)
              || 'Enter a whole number other than zero.'
          ]"
          :error-messages="props.fieldErrors.quantity"
          variant="outlined"
          @update:model-value="updateField('quantity', $event)"
        />

        <v-text-field
          :model-value="props.draft.reason"
          :label="props.draft.type === 'Adjustment' ? 'Reason *' : 'Note (optional)'"
          placeholder="e.g. Supplier delivery"
          :rules="props.draft.type === 'Adjustment'
            ? [(value) => Boolean(String(value ?? '').trim()) || 'A reason is required.']
            : []"
          :error-messages="props.fieldErrors.reason || props.fieldErrors.note"
          variant="outlined"
          @update:model-value="updateField('reason', $event)"
        />

        <div class="d-flex flex-wrap justify-end ga-2 mt-3">
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
            Save movement
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-dialog>
</template>
