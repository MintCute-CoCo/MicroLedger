<script setup>
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

const currentPage = computed(() => {
  if (props.server) {
    return props.page;
  }
  return localPage.value;
});

const currentItemsPerPage = computed(() => {
  if (props.server) {
    return props.itemsPerPage;
  }
  return localItemsPerPage.value;
});

/**
 * Filters out internal table control headers (e.g. selection or expander chevrons)
 * for the mobile card presentation.
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
    class="responsive-table-desktop"
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

  <div
    class="responsive-table-mobile"
    :aria-busy="loading"
  >
    <div
      v-if="loading && mobileItems.length"
      class="mobile-table-state"
      role="status"
    >
      Updating…
    </div>

    <div
      v-if="loading && !mobileItems.length"
      class="mobile-table-state"
    >
      Loading…
    </div>

    <div
      v-else-if="!mobileItems.length"
      class="mobile-table-state"
    >
      No records to show.
    </div>

    <article
      v-for="(item, index) in mobileItems"
      :key="valueAt(item, itemKey) ?? index"
      class="mobile-record-card"
    >
      <div
        v-for="header in visibleHeaders"
        :key="header.key"
        class="mobile-record-field"
      >
        <span class="mobile-record-label">
          {{ header.title || 'Actions' }}
        </span>

        <div class="mobile-record-value">
          <slot
            :name="`item.${header.key}`"
            :item="item"
            :value="valueAt(item, header.key)"
          >
            {{ display(valueAt(item, header.key)) }}
          </slot>
        </div>
      </div>
    </article>

    <v-pagination
      v-if="mobilePageCount > 1"
      :model-value="currentPage"
      :length="mobilePageCount"
      density="comfortable"
      class="mobile-record-pagination"
      @update:model-value="updateMobilePage"
    />
  </div>
</template>

<style scoped>
.responsive-table-mobile {
  display: none;
}

@media (max-width: 599px) {
  .responsive-table-desktop {
    display: none;
  }

  .responsive-table-mobile {
    display: grid;
    gap: 10px;
    padding: 10px 12px;
  }

  .mobile-record-card {
    min-width: 0;
    padding: 9px 12px;
    border: 1px solid #e8ecf2;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 2px 8px rgb(32 42 61 / 4%);
  }

  .mobile-record-field {
    display: grid;
    grid-template-columns: minmax(86px, 0.8fr) minmax(0, 1.4fr);
    align-items: start;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid #f0f2f6;
  }

  .mobile-record-field:last-child {
    border-bottom: 0;
  }

  .mobile-record-label {
    color: #8a95a7;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.35px;
    text-transform: uppercase;
  }

  .mobile-record-value {
    min-width: 0;
    color: #3e4b61;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .mobile-record-value :deep(.v-btn--icon) {
    width: 44px;
    height: 44px;
  }

  .mobile-table-state {
    padding: 24px 12px;
    color: #8994a6;
    font-size: 13px;
    text-align: center;
  }

  .mobile-record-pagination {
    justify-self: center;
    margin-top: 2px;
  }
}
</style>
