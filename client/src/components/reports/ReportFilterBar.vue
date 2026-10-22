<script setup>
import { computed } from 'vue';

/**
 * ============================================================================
 * Component: ReportFilterBar.vue
 * ============================================================================
 *
 * PURPOSE:
 * Provides interactive query filter controls for the Sales Report, including
 * calendar date interval bounds (From / To), grouping dimension selectors,
 * payment method filters, and category/staff dropdowns.
 *
 * PROPS:
 * - from: Current start boundary date string (YYYY-MM-DD).
 * - to: Current end boundary date string (YYYY-MM-DD).
 * - group: Active grouping dimension ('day', 'product', 'category', 'user', 'payment').
 * - paymentMethod: Selected payment method filter.
 * - categoryId: Selected category filter ID.
 * - userId: Selected user/staff filter ID.
 * - categories: Available store product categories for filtering.
 * - users: Available store team users for cashier filtering.
 * - busy: Whether an active report fetch request is in flight.
 */
const props = defineProps({
  from: {
    type: String,
    required: true,
  },
  to: {
    type: String,
    required: true,
  },
  group: {
    type: String,
    default: 'day',
  },
  paymentMethod: {
    type: String,
    default: '',
  },
  categoryId: {
    type: String,
    default: '',
  },
  userId: {
    type: String,
    default: '',
  },
  categories: {
    type: Array,
    default: () => [],
  },
  users: {
    type: Array,
    default: () => [],
  },
  groupCount: {
    type: Number,
    default: 0,
  },
  busy: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'update:from',
  'update:to',
  'update:group',
  'update:paymentMethod',
  'update:categoryId',
  'update:userId',
  'submit',
  'reset',
  'preset',
]);

/**
 * Grouping dimension options for the aggregation dropdown.
 */
const groupingOptions = [
  { title: 'Day', value: 'day' },
  { title: 'Product', value: 'product' },
  { title: 'Category', value: 'category' },
  { title: 'Staff', value: 'user' },
  { title: 'Payment', value: 'payment' },
];

/**
 * Payment method filtering options.
 */
const paymentOptions = [
  { title: 'All payments', value: '' },
  { title: 'Cash', value: 'cash' },
  { title: 'Card', value: 'card' },
  { title: 'Bank transfer', value: 'bank_transfer' },
];

/**
 * Quick date presets options for inline dropdown.
 */
const presetOptions = [
  { title: 'Today', value: 'today' },
  { title: 'Last 7 Days', value: '7days' },
  { title: 'This Month', value: 'month' },
  { title: 'Last 30 Days', value: '30days' },
];

/**
 * Formats the categories list for the dropdown selector.
 */
const categoryDropdownOptions = computed(() => {
  const defaultOption = { title: 'All categories', value: '' };

  const mappedCategories = props.categories.map((cat) => {
    return {
      title: cat.name,
      value: String(cat.id),
    };
  });

  return [defaultOption, ...mappedCategories];
});

/**
 * Formats the user list for the cashier dropdown selector.
 */
const userDropdownOptions = computed(() => {
  const defaultOption = { title: 'All staff', value: '' };

  const mappedUsers = props.users.map((u) => {
    return {
      title: u.full_name || u.fullName,
      value: String(u.id),
    };
  });

  return [defaultOption, ...mappedUsers];
});

/**
 * Emits submission event to trigger API report fetch.
 */
function handleApply() {
  emit('submit');
}

/**
 * Emits reset event to restore default filters.
 */
function handleReset() {
  emit('reset');
}

/**
 * Emits preset range selection (e.g., 'today', '7days', '30days', 'month').
 *
 * @param {string} presetCode - Preset identifier.
 */
function handlePreset(presetCode) {
  if (presetCode) {
    emit('preset', presetCode);
  }
}
</script>

<template>
  <div class="pa-4 pb-2">
    <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between ga-2 mb-3">
      <div>
        <h2 class="text-h6 font-weight-bold mb-1">Grouped sales breakdown</h2>
        <p class="text-caption text-medium-emphasis mb-0">{{ groupCount }} groups match filters · Aggregated by {{ group }}</p>
      </div>
    </div>

    <v-row dense>
      <v-col cols="12" sm="6" md="4">
        <v-select
          :items="presetOptions"
          placeholder="Preset"
          label="Preset"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="handlePreset"
        />
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-text-field
          :model-value="from"
          type="date"
          label="From date"
          variant="outlined"
          density="compact"
          hide-details
          :max="to || undefined"
          @update:model-value="emit('update:from', $event)"
        />
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-text-field
          :model-value="to"
          type="date"
          label="To date"
          variant="outlined"
          density="compact"
          hide-details
          :min="from || undefined"
          @update:model-value="emit('update:to', $event)"
        />
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-select
          :model-value="group"
          :items="groupingOptions"
          label="Group by"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="emit('update:group', $event)"
        />
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-select
          :model-value="paymentMethod"
          :items="paymentOptions"
          label="Payment"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="emit('update:paymentMethod', $event)"
        />
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-select
          :model-value="categoryId"
          :items="categoryDropdownOptions"
          label="Category"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="emit('update:categoryId', $event)"
        />
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-select
          :model-value="userId"
          :items="userDropdownOptions"
          label="Staff"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="emit('update:userId', $event)"
        />
      </v-col>

      <v-col cols="12" md="auto" class="d-flex align-center">
        <div class="d-flex ga-2 w-100">
          <v-btn
            variant="outlined"
            rounded="lg"
            class="flex-grow-1 flex-md-grow-0"
            :disabled="busy"
            @click="handleReset"
          >
            Reset
          </v-btn>

          <v-btn
            color="primary"
            rounded="lg"
            class="flex-grow-1 flex-md-grow-0"
            :loading="busy"
            @click="handleApply"
          >
            Run
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
</style>

