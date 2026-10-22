<script setup>
const props = defineProps({
  open: Boolean,
  busy: Boolean,
  selected: {
    type: Object,
    default: null,
  },
  change: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits([
  'update:open',
  'confirm',
]);
</script>

<template>
  <v-dialog
    :model-value="props.open"
    max-width="440"
    @update:model-value="emit('update:open', $event)"
  >
    <v-card rounded="xl" class="pa-5">
      <h2 class="text-h6 font-weight-bold mb-2">
        {{ props.change.status }} {{ props.selected?.claim_no }}?
      </h2>
      <p class="text-body-2 text-medium-emphasis">
        This action is final. The claim cannot be changed after it is
        {{ props.change.status?.toLowerCase() }}.
      </p>
      <p class="text-body-2 mt-2">
        <strong>Reason:</strong>
        {{ props.change.reason || 'A reason is required.' }}
      </p>

      <div class="d-flex flex-wrap justify-end ga-2 mt-3">
        <v-btn
          variant="outlined"
          rounded="lg"
          class="w-100 w-sm-auto"
          :disabled="props.busy"
          @click="emit('update:open', false)"
        >
          Go back
        </v-btn>
        <v-btn
          color="error"
          rounded="lg"
          class="w-100 w-sm-auto"
          :disabled="!props.change.reason.trim()"
          :loading="props.busy"
          @click="emit('confirm')"
        >
          Confirm {{ props.change.status?.toLowerCase() }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
