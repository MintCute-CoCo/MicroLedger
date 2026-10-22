<script setup>
import { ref } from 'vue';

const props = defineProps({
  open: Boolean,
  editingProduct: {
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
  activeCategoryOptions: {
    type: Array,
    default: () => [],
  },
  productCategoryOptions: {
    type: Array,
    default: () => [],
  },
  currencyCode: {
    type: String,
    default: '',
  },
  requiredRule: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits([
  'update:open',
  'submit',
]);

const formRef = ref(null);

/**
 * Validates the product form before asking the page to save the draft.
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
    max-width="570"
    persistent
    @update:model-value="emit('update:open', $event)"
  >
    <v-card rounded="xl" class="pa-5">
      <div class="d-flex align-start justify-space-between ga-3 mb-4">
        <div>
          <h2 class="text-h6 font-weight-bold">
            {{ props.editingProduct ? 'Edit product' : 'New product' }}
          </h2>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Manage the store catalog.
          </p>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Close dialog"
          @click="emit('update:open', false)"
        />
      </div>

      <v-alert
        v-if="props.error"
        type="error"
        variant="tonal"
        density="comfortable"
        class="mb-3"
      >
        {{ props.error }}
      </v-alert>

      <v-form ref="formRef" @submit.prevent="submitForm">
        <v-row>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="props.draft.sku"
              label="SKU *"
              placeholder="e.g. L-042"
              :rules="props.requiredRule"
              :error-messages="props.fieldErrors.sku"
              :disabled="Boolean(props.editingProduct)"
              variant="outlined"
              density="comfortable"
              @update:model-value="props.fieldErrors.sku = undefined"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="props.draft.name"
              label="Product name *"
              placeholder="Product name"
              :rules="props.requiredRule"
              :error-messages="props.fieldErrors.name"
              variant="outlined"
              density="comfortable"
              @update:model-value="props.fieldErrors.name = undefined"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-select
              v-model="props.draft.category"
              label="Category *"
              :items="props.editingProduct
                ? props.productCategoryOptions
                : props.activeCategoryOptions"
              :rules="props.requiredRule"
              :error-messages="props.fieldErrors.category"
              variant="outlined"
              density="comfortable"
              @update:model-value="props.fieldErrors.category = undefined"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="props.draft.unit"
              label="Unit"
              placeholder="pcs"
              :error-messages="props.fieldErrors.unit"
              variant="outlined"
              density="comfortable"
              @update:model-value="props.fieldErrors.unit = undefined"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="props.draft.cost"
              label="Cost price"
              :prefix="props.currencyCode"
              placeholder="0.00"
              :error-messages="props.fieldErrors.cost"
              variant="outlined"
              density="comfortable"
              @update:model-value="props.fieldErrors.cost = undefined"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="props.draft.price"
              label="Selling price *"
              :prefix="props.currencyCode"
              placeholder="0.00"
              :rules="props.requiredRule"
              :error-messages="props.fieldErrors.price"
              variant="outlined"
              density="comfortable"
              @update:model-value="props.fieldErrors.price = undefined"
            />
          </v-col>
          <v-col v-if="!props.editingProduct" cols="12" sm="6">
            <v-text-field
              v-model="props.draft.stock"
              label="Opening stock"
              type="number"
              min="0"
              :error-messages="props.fieldErrors.stock"
              variant="outlined"
              density="comfortable"
              @update:model-value="props.fieldErrors.stock = undefined"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="props.draft.reorder"
              label="Reorder level"
              type="number"
              min="0"
              :error-messages="props.fieldErrors.reorder"
              variant="outlined"
              density="comfortable"
              @update:model-value="props.fieldErrors.reorder = undefined"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="props.draft.warranty"
              label="Warranty (months)"
              type="number"
              min="0"
              max="120"
              :error-messages="props.fieldErrors.warranty"
              variant="outlined"
              density="comfortable"
              @update:model-value="props.fieldErrors.warranty = undefined"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-checkbox
              v-model="props.draft.tracksSerial"
              label="Track serial numbers"
              hide-details
              density="compact"
            />
          </v-col>
        </v-row>

        <v-alert type="info" variant="tonal" density="compact" class="mb-3">
          Stock changes are recorded in the inventory ledger.
        </v-alert>

        <div class="d-flex flex-wrap justify-end ga-2">
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
            {{ props.editingProduct ? 'Save changes' : 'Add product' }}
          </v-btn>
        </div>
      </v-form>
    </v-card>
  </v-dialog>
</template>
