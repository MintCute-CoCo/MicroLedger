<script setup>
const props = defineProps({
  open: Boolean,
  busy: Boolean,
  error: {
    type: String,
    default: '',
  },
  fieldErrors: {
    type: Object,
    required: true,
  },
  selected: {
    type: Object,
    default: null,
  },
  change: {
    type: Object,
    required: true,
  },
  suppliers: {
    type: Array,
    default: () => [],
  },
  availableTransitions: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits([
  'update:open',
  'submit',
]);

const resolutionOptions = [
  { title: 'Repaired', value: 'repaired' },
  { title: 'Replaced', value: 'replaced' },
  { title: 'Cannot repair', value: 'cannot_repair' },
  { title: 'Other', value: 'other' },
];
</script>

<template>
  <v-dialog
    :model-value="props.open"
    max-width="560"
    @update:model-value="emit('update:open', $event)"
  >
    <v-card rounded="xl" class="pa-5">
      <div class="d-flex align-center justify-space-between ga-2 mb-3">
        <h2 class="text-h6 font-weight-bold">Update {{ props.selected?.claim_no }}</h2>
        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Close status form"
          @click="emit('update:open', false)"
        />
      </div>

      <v-alert v-if="props.error" type="error" variant="tonal" class="mb-3">
        {{ props.error }}
      </v-alert>

      <v-select
        v-model="props.change.status"
        :items="props.availableTransitions(props.selected || {})"
        label="New status"
        :error-messages="props.fieldErrors.status"
        variant="outlined"
      />

      <v-select
        v-if="props.change.status === 'With Supplier'"
        v-model="props.change.supplierId"
        :items="props.suppliers"
        item-title="name"
        item-value="id"
        label="Supplier"
        :error-messages="props.fieldErrors.supplierId"
        variant="outlined"
        @update:model-value="props.fieldErrors.supplierId = undefined"
      />
      <v-text-field
        v-if="props.change.status === 'With Supplier'"
        v-model="props.change.sentDate"
        type="date"
        label="Sent date"
        :error-messages="props.fieldErrors.sentDate"
        variant="outlined"
        @update:model-value="props.fieldErrors.sentDate = undefined"
      />
      <v-text-field
        v-if="props.change.status === 'With Supplier'"
        v-model="props.change.expectedReturnDate"
        type="date"
        label="Expected return date"
        :error-messages="props.fieldErrors.expectedReturnDate"
        variant="outlined"
        @update:model-value="props.fieldErrors.expectedReturnDate = undefined"
      />
      <v-text-field
        v-if="props.change.status === 'Returned'"
        v-model="props.change.actualReturnDate"
        type="date"
        label="Actual return date"
        :error-messages="props.fieldErrors.actualReturnDate"
        variant="outlined"
        @update:model-value="props.fieldErrors.actualReturnDate = undefined"
      />
      <v-select
        v-if="['Returned', 'Ready for Customer'].includes(props.change.status)"
        v-model="props.change.resolution"
        :items="resolutionOptions"
        label="Resolution"
        :error-messages="props.fieldErrors.resolution"
        variant="outlined"
        @update:model-value="props.fieldErrors.resolution = undefined"
      />
      <v-text-field
        v-if="props.change.status === 'Completed'"
        v-model="props.change.collectedDate"
        type="date"
        label="Collection date"
        :error-messages="props.fieldErrors.collectedDate"
        variant="outlined"
        @update:model-value="props.fieldErrors.collectedDate = undefined"
      />
      <v-textarea
        v-if="['Rejected', 'Cancelled'].includes(props.change.status)"
        v-model="props.change.reason"
        label="Reason *"
        maxlength="255"
        :error-messages="props.fieldErrors.reason"
        variant="outlined"
        @update:model-value="props.fieldErrors.reason = undefined"
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
          color="primary"
          rounded="lg"
          class="w-100 w-sm-auto"
          :disabled="!props.change.status"
          :loading="props.busy"
          @click="emit('submit')"
        >
          Save status
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
