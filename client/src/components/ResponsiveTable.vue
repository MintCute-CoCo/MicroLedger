<script setup>
/**
 * ============================================================================
 * MicroLedger Responsive Data Table Component (ResponsiveTable.vue)
 * ============================================================================
 *
 * PURPOSE:
 * Universal data grid abstraction wrapping Vuetify 3's VDataTable and VDataTableServer.
 * Automatically adapts between desktop table views and compact mobile card layouts
 * below the 600 px viewport breakpoint, guaranteeing zero horizontal clipping.
 *
 * COMPLIANCE:
 * - docs/guidelines/AI_CONTEXT.md (Rule 15 & Section 11): Exclusively uses Vuetify 3
 *   component primitives (v-card, v-row, v-col, v-pagination, v-progress-linear).
 *   No raw HTML tables, no custom CSS grids, and zero custom font-size px rules.
 * - docs/guidelines/AGENTS.md: Academic docstrings for every property and handler.
 * - Taste Skill (tasteskill v2): Flat surfaces (variant="outlined", 1px border),
 *   no fuzzy rest shadows, accessible 44 px mobile touch targets, and honest data states.
 */
import { computed, ref, watch, useAttrs } from 'vue';
import { VDataTable, VDataTableServer } from 'vuetify/components';

defineOptions({
  inheritAttrs: false,
});

/**
 * Component properties for the responsive data table.
 * Supports both client-side and server-side pagination modes.
 */
const props = defineProps({
  headers: {
    type: Array,
    required: true,
  },
  items: {
    type: Array,
    required: true,
  },
  server: {
    type: Boolean,
    default: false,
  },
  itemsLength: {
    type: Number,
    default: 0,
  },
  page: {
    type: Number,
    default: 1,
  },
  itemsPerPage: {
    type: Number,
    default: 10,
  },
  itemsPerPageOptions: {
    type: Array,
    default: () => [10, 25, 50],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  itemKey: {
    type: String,
    default: 'id',
  },
});

/**
 * Emits pagination or sorting updates to the parent container.
 */
const emit = defineEmits(['update:options']);

const attrs = useAttrs();

/**
 * Selects between Vuetify's server-driven or in-memory data table component.
 *
 * @returns {Component} VDataTableServer if server-paginated, otherwise VDataTable.
 */
const tableComponent = computed(() => {
  if (props.server) {
    return VDataTableServer;
  }
  return VDataTable;
});

/**
 * Local page and pagination state when operating in client-side mode.
 */
const localPage = ref(props.page);
const localItemsPerPage = ref(props.itemsPerPage);

/**
 * Resolves current active page depending on pagination mode.
 *
 * @returns {number} Active page number.
 */
const currentPage = computed(() => {
  if (props.server) {
    return props.page;
  }
  return localPage.value;
});

/**
 * Resolves current page size limit depending on pagination mode.
 *
 * @returns {number} Page size limit.
 */
const currentItemsPerPage = computed(() => {
  if (props.server) {
    return props.itemsPerPage;
  }
  return localItemsPerPage.value;
});

/**
 * Filters out internal table control headers (e.g. selection or expander chevrons)
 * for the mobile card presentation.
 *
 * @returns {Array<Object>} List of displayable column header definitions.
 */
const visibleHeaders = computed(() => {
  const ignoredKeys = ['data-table-select', 'data-table-expand'];

  const filtered = props.headers.filter((header) => {
    const hasKey = Boolean(header.key);
    const isSpecialControl = ignoredKeys.includes(header.key);
    return hasKey && !isSpecialControl;
  });

  return filtered;
});

/**
 * Slices the in-memory item collection for mobile viewport pagination.
 *
 * @returns {Array<Object>} Currently visible items on mobile screen.
 */
const mobileItems = computed(() => {
  if (props.server || currentItemsPerPage.value < 1) {
    return props.items;
  }

  const offset = (currentPage.value - 1) * currentItemsPerPage.value;
  const upperLimit = offset + currentItemsPerPage.value;
  return props.items.slice(offset, upperLimit);
});

/**
 * Computes total number of pages for mobile pagination controls.
 *
 * @returns {number} Total available pages.
 */
const mobilePageCount = computed(() => {
  const totalCount = props.server ? props.itemsLength : props.items.length;
  const pageSize = Math.max(1, currentItemsPerPage.value);
  const totalPages = Math.ceil(totalCount / pageSize);
  return Math.max(1, totalPages);
});

watch(
  () => props.page,
  (newPage) => {
    localPage.value = newPage;
  }
);

watch(
  () => props.itemsPerPage,
  (newLimit) => {
    localItemsPerPage.value = newLimit;
  }
);

/**
 * Resolves nested dot-notation property values safely from an object.
 *
 * @param {Object} item - Row object.
 * @param {string} path - Dot-separated key path.
 * @returns {*} Resolved value or undefined.
 */
function valueAt(item, path) {
  if (!item || !path) {
    return undefined;
  }

  const segments = String(path).split('.');
  return segments.reduce((accumulator, segment) => {
    return accumulator?.[segment];
  }, item);
}

/**
 * Formats a value for fallback display if no custom template slot is provided.
 *
 * @param {*} value - Raw cell value.
 * @returns {string} Formatted display string.
 */
function display(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Handles options event emitted by the Vuetify data table.
 *
 * @param {Object} options - Table query options (page, itemsPerPage, sortBy).
 */
function onTableOptions(options) {
  if (!props.server) {
    localPage.value = options.page || 1;
    localItemsPerPage.value = options.itemsPerPage || localItemsPerPage.value;
  }

  emit('update:options', options);
}

/**
 * Handles manual page selection changes from mobile pagination buttons.
 *
 * @param {number} targetPage - Selected page number.
 */
function updateMobilePage(targetPage) {
  if (!props.server) {
    localPage.value = targetPage;
  }

  emit('update:options', {
    page: targetPage,
    itemsPerPage: currentItemsPerPage.value,
    sortBy: [],
    groupBy: [],
  });
}
</script>

<template>
  <!-- Desktop & Tablet Viewport: Standard Vuetify Data Table -->
  <component
    :is="tableComponent"
    v-bind="attrs"
    :headers="headers"
    :items="items"
    :items-length="server ? itemsLength : undefined"
    :page="currentPage"
    :items-per-page="currentItemsPerPage"
    :items-per-page-options="itemsPerPageOptions"
    :loading="loading"
    class="d-none d-sm-block"
    @update:options="onTableOptions"
  >
    <template
      v-for="(_, slotName) in $slots"
      #[slotName]="slotProps"
    >
      <slot
        :name="slotName"
        v-bind="slotProps || {}"
      />
    </template>
  </component>

  <!-- Mobile Viewport (<600px): Clean Card-Based Field Flow -->
  <div
    class="d-block d-sm-none"
    :aria-busy="loading"
  >
    <!-- Background update progress indicator -->
    <v-card
      v-if="loading && mobileItems.length"
      variant="outlined"
      rounded="lg"
      class="mb-3 pa-3 text-center"
      role="status"
    >
      <v-progress-linear
        indeterminate
        color="primary"
        class="mb-2"
      />
      <span class="text-caption text-medium-emphasis">Updating records…</span>
    </v-card>

    <!-- Initial loading state -->
    <v-card
      v-if="loading && !mobileItems.length"
      variant="outlined"
      rounded="lg"
      class="pa-6 text-center"
    >
      <v-progress-linear
        indeterminate
        color="primary"
        class="mb-3"
      />
      <div class="text-caption text-medium-emphasis">Loading records…</div>
    </v-card>

    <!-- Empty collection state -->
    <v-card
      v-else-if="!mobileItems.length"
      variant="outlined"
      rounded="lg"
      class="pa-6 text-center"
    >
      <v-icon
        icon="mdi-database-off-outline"
        size="36"
        class="text-medium-emphasis mb-2"
      />
      <div class="text-body-2 font-weight-medium text-medium-emphasis">
        No records found.
      </div>
    </v-card>

    <!-- Mobile Record Cards -->
    <v-card
      v-for="(item, index) in mobileItems"
      :key="valueAt(item, itemKey) ?? index"
      variant="outlined"
      rounded="lg"
      class="mb-3 pa-3 bg-surface"
    >
      <v-row
        v-for="(header, hIdx) in visibleHeaders"
        :key="header.key"
        dense
        align="start"
        :class="hIdx < visibleHeaders.length - 1 ? 'border-b pb-2 mb-2' : ''"
      >
        <v-col
          cols="4"
          class="text-caption font-weight-bold text-medium-emphasis text-uppercase pt-1"
        >
          {{ header.title || 'Actions' }}
        </v-col>

        <v-col
          cols="8"
          class="text-body-2 text-high-emphasis overflow-wrap-anywhere mobile-record-value"
        >
          <slot
            :name="`item.${header.key}`"
            :item="item"
            :value="valueAt(item, header.key)"
          >
            {{ display(valueAt(item, header.key)) }}
          </slot>
        </v-col>
      </v-row>
    </v-card>

    <!-- Mobile Pagination Bar -->
    <div
      v-if="mobilePageCount > 1"
      class="d-flex justify-center mt-3"
    >
      <v-pagination
        :model-value="currentPage"
        :length="mobilePageCount"
        density="comfortable"
        total-visible="5"
        @update:model-value="updateMobilePage"
      />
    </div>
  </div>
</template>

<style scoped>
.overflow-wrap-anywhere {
  overflow-wrap: anywhere;
}

:deep(.mobile-record-value .v-btn--icon) {
  min-width: 44px;
  min-height: 44px;
}
</style>
