<script setup>
const props = defineProps({
  open: Boolean,
  busy: Boolean,
  editing: { type: Object, default: null },
  error: { type: String, default: '' },
  fieldErrors: { type: Object, required: true },
  form: { type: Object, required: true },
});

const emit = defineEmits(['update:open', 'save']);
</script>

<template>
  <v-dialog
    :model-value="props.open"
    max-width="560"
    @update:model-value="emit('update:open', $event)"
  >
    <v-card rounded="xl" class="pa-5">
      <div class="d-flex align-center justify-space-between ga-2 mb-3">
        <h2 class="text-h6 font-weight-bold">
          {{ props.editing ? 'Edit supplier' : 'New supplier' }}
        </h2>
        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Close supplier form"
          @click="emit('update:open', false)"
        />
      </div>

      <v-alert v-if="props.error" type="error" variant="tonal" class="mb-3">
        {{ props.error }}
      </v-alert>

      <v-text-field
        v-model="props.form.name"
        label="Supplier name"
        maxlength="150"
        :error-messages="props.fieldErrors.name"
        variant="outlined"
        @update:model-value="props.fieldErrors.name = undefined"
      />
      <v-text-field
        v-model="props.form.contact_person"
        label="Contact person"
        :error-messages="props.fieldErrors.contact_person"
        variant="outlined"
        @update:model-value="props.fieldErrors.contact_person = undefined"
      />

      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="props.form.phone"
            label="Phone"
            :error-messages="props.fieldErrors.phone"
            variant="outlined"
            @update:model-value="props.fieldErrors.phone = undefined"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="props.form.email"
            label="Email"
            :error-messages="props.fieldErrors.email"
            variant="outlined"
            @update:model-value="props.fieldErrors.email = undefined"
          />
        </v-col>
      </v-row>

      <v-textarea
        v-model="props.form.notes"
        label="Notes"
        :error-messages="props.fieldErrors.notes"
        variant="outlined"
        @update:model-value="props.fieldErrors.notes = undefined"
      />

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
          color="primary"
          rounded="lg"
          class="w-100 w-sm-auto"
          :loading="props.busy"
          @click="emit('save')"
        >
          Save supplier
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
