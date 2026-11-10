<script setup>
/**
 * Detailed Claim & Timeline History Modal Dialog
 *
 * PURPOSE:
 * Displays full claim diagnostic metadata, tracking numbers, customer info,
 * and immutable status audit logs.
 */
import { formatDate, formatDateTime } from '../../utils/format.js';
import { formatResolution, getResolutionColor } from '../../composables/claims/index.js';

const props = defineProps({
  open: Boolean,
  busy: Boolean,
  selected: {
    type: Object,
    default: null,
  },
  detail: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:open']);
</script>

<template>
  <v-dialog
    :model-value="props.open"
    max-width="680"
    @update:model-value="emit('update:open', $event)"
  >
    <v-card rounded="xl" class="pa-5">
      <template v-if="props.detail">
        <div class="d-flex align-start justify-space-between ga-2 mb-3">
          <div>
            <div class="text-overline text-medium-emphasis">CLAIM HISTORY</div>
            <h2 class="text-h5 font-weight-bold">{{ props.detail.claim_no }}</h2>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            aria-label="Close claim details"
            @click="emit('update:open', false)"
          />
        </div>

        <v-progress-linear v-if="props.busy" indeterminate class="mb-3" />

        <v-row dense class="py-3">
          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">Product</div>
            <div class="text-body-2 font-weight-medium">
              {{ props.detail.product_name || props.selected?.product_name }}
            </div>
          </v-col>
          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">Customer</div>
            <div class="text-body-2 font-weight-medium">
              {{ props.detail.customer_name || props.selected?.customer_name }}
            </div>
          </v-col>
          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">Status</div>
            <div class="text-body-2 font-weight-medium">{{ props.detail.status }}</div>
          </v-col>
          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">Claim date</div>
            <div class="text-body-2 font-weight-medium">{{ formatDate(props.detail.claim_date) }}</div>
          </v-col>
          <v-col cols="12" sm="6">
            <div class="text-caption text-medium-emphasis">Resolution</div>
            <div class="text-body-2 font-weight-medium mt-1">
              <v-chip
                v-if="props.detail.resolution || props.selected?.resolution"
                :color="getResolutionColor(props.detail.resolution || props.selected?.resolution)"
                variant="tonal"
                size="small"
              >
                {{ formatResolution(props.detail.resolution || props.selected?.resolution) }}
              </v-chip>
              <span v-else class="text-medium-emphasis">Pending resolution</span>
            </div>
          </v-col>
          <v-col
            v-if="props.detail.supplier_name || props.selected?.supplier_name"
            cols="12"
            sm="6"
          >
            <div class="text-caption text-medium-emphasis">Supplier</div>
            <div class="text-body-2 font-weight-medium">
              {{ props.detail.supplier_name || props.selected?.supplier_name }}
            </div>
          </v-col>
        </v-row>

        <v-divider />
        <div class="text-caption text-medium-emphasis mt-3">Problem description</div>
        <p class="text-body-2 py-1 text-pre-wrap">{{ props.detail.problem }}</p>
        <h3 class="text-h6 font-weight-bold my-2">Status changes</h3>
        <v-timeline density="compact" side="end">
          <v-timeline-item
            v-for="(entry, index) in props.detail.history"
            :key="entry.id || index"
            dot-color="primary"
            size="small"
          >
            <div class="text-body-2 font-weight-medium">{{ entry.to_status }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ formatDateTime(entry.created_at) }} · {{ entry.user_name }}
            </div>
            <p v-if="entry.note" class="text-body-2 mb-0">{{ entry.note }}</p>
          </v-timeline-item>
        </v-timeline>
      </template>

      <div v-else class="py-4">
        <v-progress-linear indeterminate class="mb-3" />
        <span class="text-body-2 text-medium-emphasis">Loading claim history…</span>
      </div>
    </v-card>
  </v-dialog>
</template>
