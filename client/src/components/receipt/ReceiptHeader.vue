<script setup>
/**
 * ReceiptHeader.vue
 *
 * Store branding header section for the 80mm thermal receipt slip.
 * Displays business name, tagline/subtitle, store address, and contact telephone.
 */
import { displaySettings } from '../../utils/format.js';

const props = defineProps({
  storeName: {
    type: String,
    default: '',
  },
  storeTagline: {
    type: String,
    default: '',
  },
  storeAddress: {
    type: String,
    default: '',
  },
  storePhone: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <div class="receipt-header text-center mb-3">
    <h2 class="text-h6 font-weight-bold letter-spacing-1">
      {{ (props.storeName || displaySettings.store_name || 'MICROLEDGER').toUpperCase() }}
    </h2>
    <div
      v-if="props.storeTagline || displaySettings.store_tagline"
      class="text-caption font-weight-bold text-medium-emphasis"
    >
      {{ (props.storeTagline || displaySettings.store_tagline).toUpperCase() }}
    </div>
    <div
      v-if="props.storeAddress || displaySettings.store_address"
      class="text-caption text-medium-emphasis"
    >
      {{ props.storeAddress || displaySettings.store_address }}
    </div>
    <div
      v-if="props.storePhone || displaySettings.store_phone"
      class="text-caption text-medium-emphasis"
    >
      Tel: {{ props.storePhone || displaySettings.store_phone }}
    </div>
  </div>
</template>

<style scoped>
.letter-spacing-1 {
  letter-spacing: 1px;
}
</style>
