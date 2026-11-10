<script setup>
/**
 * Warranty Claims Management View (Phase 2)
 *
 * PURPOSE:
 * Implements the 7-stage warranty claim lifecycle state machine:
 * Submitted -> With Supplier -> Returned -> Ready for Customer -> Completed
 * (with Admin-only terminal states: Rejected, Cancelled).
 * Features dynamic overdue tracking relative to the store operating time.
 */
import ClaimCreateDialog from '../components/claims/ClaimCreateDialog.vue';
import ClaimDetailDialog from '../components/claims/ClaimDetailDialog.vue';
import ClaimFinalConfirmDialog from '../components/claims/ClaimFinalConfirmDialog.vue';
import ClaimRegisterSection from '../components/claims/ClaimRegisterSection.vue';
import ClaimTransitionDialog from '../components/claims/ClaimTransitionDialog.vue';
import { useClaims } from '../composables/claims/useClaims.js';

const {
  isAdmin,
  rows,
  total,
  activeCount,
  page,
  pageSize,
  suppliers,
  warrantySearch,
  customerSearch,
  error,
  fieldErrors,
  busy,
  detailBusy,
  createOpen,
  transitionOpen,
  finalConfirmOpen,
  detailOpen,
  selected,
  selectedClaim,
  detail,
  filters,
  form,
  change,
  selectedWarranty,
  warrantyOptions,
  customerOptions,
  statuses,
  headers,
  onTableOptions,
  availableTransitions,
  create,
  openCreateClaim,
  updateForm,
  clearCreateError,
  startTransition,
  transition,
  requestTransition,
  updateChange,
  clearTransitionError,
  showDetail,
  exportFilteredClaims,
} = useClaims();
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6">
    <div class="page-heading">
      <div>
        <div class="text-overline text-medium-emphasis">WARRANTY</div>
        <h1 class="text-h5 font-weight-bold">Claims</h1>
        <p class="text-body-2 text-medium-emphasis">
          Filter cases and track each status change through collection.
        </p>
      </div>

      <div class="d-flex flex-wrap ga-2">
        <v-btn
          v-if="isAdmin"
          variant="outlined"
          rounded="lg"
          class="w-100 w-sm-auto"
          prepend-icon="mdi-download"
          @click="exportFilteredClaims"
        >
          Export filtered
        </v-btn>
        <v-btn
          color="primary"
          rounded="lg"
          class="w-100 w-sm-auto"
          prepend-icon="mdi-plus"
          @click="openCreateClaim"
        >
          New claim
        </v-btn>
      </div>
    </div>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      {{ error }}
    </v-alert>

    <ClaimRegisterSection
      :rows="rows"
      :total="total"
      :active-count="activeCount"
      :page="page"
      :page-size="pageSize"
      :busy="busy"
      :filters="filters"
      :statuses="statuses"
      :suppliers="suppliers"
      :headers="headers"
      :available-transitions="availableTransitions"
      @options="onTableOptions"
      @show-detail="showDetail"
      @start-transition="startTransition"
    />

    <ClaimCreateDialog
      v-model:open="createOpen"
      v-model:warranty-search="warrantySearch"
      v-model:customer-search="customerSearch"
      :busy="busy"
      :is-admin="isAdmin"
      :error="error"
      :field-errors="fieldErrors"
      :form="form"
      :selected-warranty="selectedWarranty"
      :warranty-options="warrantyOptions"
      :customer-options="customerOptions"
      @update:form="updateForm"
      @clear-error="clearCreateError"
      @create="create"
    />

    <ClaimTransitionDialog
      v-model:open="transitionOpen"
      :busy="busy"
      :error="error"
      :field-errors="fieldErrors"
      :selected="selectedClaim"
      :change="change"
      :suppliers="suppliers"
      :available-transitions="availableTransitions"
      @update:change="updateChange"
      @clear-error="clearTransitionError"
      @submit="requestTransition"
    />

    <ClaimFinalConfirmDialog
      v-model:open="finalConfirmOpen"
      :busy="busy"
      :selected="selectedClaim"
      :change="change"
      @confirm="transition"
    />

    <ClaimDetailDialog
      v-model:open="detailOpen"
      :busy="detailBusy"
      :selected="selected"
      :detail="detail"
    />
  </v-container>
</template>
