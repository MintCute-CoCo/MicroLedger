<script setup>
import AuditRegisterSection from '../components/audit/AuditRegisterSection.vue';
import { useAudit } from '../composables/audit/useAudit.js';

const {
  rows,
  error,
  busy,
  action,
  entity,
  tableHeaders,
  load,
} = useAudit();
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6">
    <div class="page-heading">
      <div>
        <div class="text-overline text-medium-emphasis">ADMINISTRATION</div>
        <h1 class="text-h5 font-weight-bold">Audit log</h1>
        <p class="text-body-2 text-medium-emphasis">
          Review recorded changes and account activity.
        </p>
      </div>
    </div>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="comfortable"
      class="mb-4"
    >
      {{ error }}
    </v-alert>

    <AuditRegisterSection
      v-model:action="action"
      v-model:entity="entity"
      :rows="rows"
      :busy="busy"
      :headers="tableHeaders"
      @filter="load"
    />
  </v-container>
</template>
