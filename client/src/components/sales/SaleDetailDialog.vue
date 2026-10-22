<script setup>
import { formatDateTime, formatMoney } from '../../utils/format.js';

const props = defineProps({
  open: Boolean,
  sale: {
    type: Object,
    default: null,
  },
  apiMode: Boolean,
  isAdmin: Boolean,
  voidReason: {
    type: String,
    default: '',
  },
});

const emit = defineEmits([
  'update:open',
  'update:voidReason',
  'void',
  'print',
  'close',
]);

/**
 * Closes the dialog and informs the parent that the selected sale should clear.
 *
 * @returns {void} Emits the close state and clear-selection event.
 */
function closeDialog() {
  emit('update:open', false);
  emit('close');
}

/**
 * Synchronizes Vuetify's dialog state and clears the selected sale on dismissal.
 *
 * @param {boolean} isOpen - Whether the dialog should remain open.
 * @returns {void} Emits state changes to the parent.
 */
function updateOpen(isOpen) {
  emit('update:open', isOpen);

  if (!isOpen) {
    emit('close');
  }
}

/**
 * Updates the void reason through the parent-owned composable state.
 *
 * @param {string} value - New void reason.
 * @returns {void} Emits the updated reason.
 */
function updateVoidReason(value) {
  emit('update:voidReason', value);
}
</script>

<template>
  <v-dialog
    :model-value="props.open"
    max-width="490"
    @update:model-value="updateOpen"
  >
    <v-card
      v-if="props.sale"
      rounded="xl"
      class="pa-5"
    >
      <div class="dialog-heading">
        <div>
          <span class="text-overline text-medium-emphasis">TRANSACTION DETAIL</span>
          <h2 class="text-h6 font-weight-bold">{{ props.sale.number }}</h2>
        </div>

        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Close details"
          @click="closeDialog"
        />
      </div>

      <v-chip
        :color="props.sale.status === 'Voided' ? 'error' : 'success'"
        variant="tonal"
        size="small"
        class="my-3"
      >
        {{ props.sale.status }}
      </v-chip>

      <v-row class="py-2">
        <v-col cols="12" sm="6">
          <div class="text-caption text-medium-emphasis">Customer</div>
          <div class="text-body-2">{{ props.sale.customer }}</div>
        </v-col>
        <v-col cols="12" sm="6">
          <div class="text-caption text-medium-emphasis">Date & time</div>
          <div class="text-body-2">{{ formatDateTime(props.sale.createdAt) }}</div>
        </v-col>
        <v-col cols="12" sm="6">
          <div class="text-caption text-medium-emphasis">Cashier</div>
          <div class="text-body-2">{{ props.sale.staff }}</div>
        </v-col>
        <v-col cols="12" sm="6">
          <div class="text-caption text-medium-emphasis">Payment method</div>
          <div class="text-body-2">{{ props.sale.payment }}</div>
        </v-col>
      </v-row>

      <div class="d-flex align-center justify-space-between py-3">
        <span class="text-body-2 text-medium-emphasis">Total</span>
        <strong class="text-h6">{{ formatMoney(props.sale.total) }}</strong>
      </div>

      <div
        v-if="props.sale.items?.length"
        class="sale-items"
      >
        <v-list
          density="compact"
          class="py-0"
        >
          <v-list-item
          v-for="line in props.sale.items"
          :key="line.id"
            :title="`${line.quantity} × ${line.name}`"
            :subtitle="formatMoney(line.lineTotal)"
          />
        </v-list>
      </div>

      <div
        v-if="props.isAdmin && props.sale.status === 'Completed'"
        class="mt-3"
      >
        <v-text-field
          :model-value="props.voidReason"
          label="Reason for voiding"
          maxlength="255"
          variant="outlined"
          density="compact"
          @update:model-value="updateVoidReason"
        />
        <v-btn
          color="error"
          variant="outlined"
          :disabled="!props.voidReason.trim()"
          @click="emit('void')"
        >
          Void sale and restore stock
        </v-btn>
      </div>

      

      <div class="d-flex flex-wrap justify-end ga-2 mt-4">
        
        <v-btn
          color="primary"
          rounded="lg"
          @click="closeDialog"
        >
          Done
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
