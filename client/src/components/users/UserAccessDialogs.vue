<script setup>
const props = defineProps({
  createOpen: Boolean,
  resetOpen: Boolean,
  activeUser: {
    type: Object,
    default: null,
  },
  draft: {
    type: Object,
    required: true,
  },
  resetPassword: {
    type: String,
    default: '',
  },
  fieldErrors: {
    type: Object,
    required: true,
  },
  errorMessage: {
    type: String,
    default: '',
  },
  saving: Boolean,
});

const emit = defineEmits([
  'update:createOpen',
  'update:resetOpen',
  'update:resetPassword',
  'create',
  'reset',
]);
</script>

<template>
  <v-dialog
    :model-value="props.createOpen"
    max-width="500"
    @update:model-value="emit('update:createOpen', $event)"
  >
    <v-card rounded="xl">
      <v-card-title class="text-h6 font-weight-bold">Create user</v-card-title>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis">
          The user will need to change this temporary password at first sign-in.
        </p>
        <v-text-field
          v-model="props.draft.fullName"
          label="Full name"
          :error-messages="props.fieldErrors.fullName"
          variant="outlined"
          @update:model-value="props.fieldErrors.fullName = undefined"
        />
        <v-text-field
          v-model="props.draft.username"
          label="Username"
          hint="3–50 letters, numbers, dots, underscores or hyphens"
          persistent-hint
          :error-messages="props.fieldErrors.username"
          variant="outlined"
          @update:model-value="props.fieldErrors.username = undefined"
        />
        <v-select
          v-model="props.draft.role"
          label="Role"
          :items="[
            { title: 'Staff', value: 'staff' },
            { title: 'Admin', value: 'admin' }
          ]"
          :error-messages="props.fieldErrors.role"
          variant="outlined"
          @update:model-value="props.fieldErrors.role = undefined"
        />
        <v-text-field
          v-model="props.draft.password"
          label="Temporary password"
          type="password"
          autocomplete="new-password"
          hint="8–128 characters and different from username"
          persistent-hint
          :error-messages="props.fieldErrors.password"
          variant="outlined"
          @update:model-value="props.fieldErrors.password = undefined"
        />
        <v-alert v-if="props.errorMessage" type="error" variant="tonal">
          {{ props.errorMessage }}
        </v-alert>
      </v-card-text>
      <v-card-actions class="d-flex flex-wrap justify-end ga-2 pa-4">
        <v-btn
          variant="outlined"
          class="w-100 w-sm-auto"
          @click="emit('update:createOpen', false)"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          class="w-100 w-sm-auto"
          :loading="props.saving"
          :disabled="props.saving || !props.draft.fullName || !props.draft.username || props.draft.password.length < 8"
          @click="emit('create')"
        >
          Create user
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog
    :model-value="props.resetOpen"
    max-width="460"
    @update:model-value="emit('update:resetOpen', $event)"
  >
    <v-card rounded="xl">
      <v-card-title class="text-h6 font-weight-bold">Reset password</v-card-title>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis">
          Enter a temporary password for {{ props.activeUser?.fullName }}.
          Their existing sessions will be revoked.
        </p>
        <v-text-field
          :model-value="props.resetPassword"
          label="Temporary password"
          type="password"
          autocomplete="new-password"
          hint="8–128 characters and different from username"
          persistent-hint
          :error-messages="props.fieldErrors.temporaryPassword"
          variant="outlined"
          @update:model-value="emit('update:resetPassword', $event)"
        />
        <v-alert v-if="props.errorMessage" type="error" variant="tonal">
          {{ props.errorMessage }}
        </v-alert>
      </v-card-text>
      <v-card-actions class="d-flex flex-wrap justify-end ga-2 pa-4">
        <v-btn
          variant="outlined"
          class="w-100 w-sm-auto"
          @click="emit('update:resetOpen', false)"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          class="w-100 w-sm-auto"
          :loading="props.saving"
          :disabled="props.saving || props.resetPassword.length < 8"
          @click="emit('reset')"
        >
          Reset password
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
