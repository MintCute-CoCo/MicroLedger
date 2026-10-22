<script setup>
import { onMounted } from 'vue';
import { displaySettings } from '../utils/format.js';
import PosProductCatalog from '../components/pos/PosProductCatalog.vue';
import PosCheckoutPanel from '../components/pos/PosCheckoutPanel.vue';
import { usePos } from '../composables/pos/usePos.js';

/**
 * Point of Sale (POS) View.
 *
 * Provides a responsive retail cash register layout, supporting fast barcode/SKU scanning,
 * category filtering, real-time cart manipulation, customer assignment, and instant checkout.
 */
const {
  apiMode,
  busy,
  registerLoading,
  errorMessage,
  search,
  category,
  customerSearch,
  paymentMethods,
  customers,
  cart,
  selectedCustomerId,
  paymentMethod,
  discountCents,
  cartSubtotal,
  subtotal,
  total,
  categories,
  filteredProducts,
  matchingCustomers,
  selectedCustomer,
  addToCart,
  changeQuantity,
  setSerialNumbers,
  checkout,
  updateDiscount,
  clearCart,
  removeCartItem,
  parseSerialNumbers,
} = usePos();

/**
 * Returns a contextual Material Design icon based on product category.
 *
 * @param {string} categoryName - Category title.
 * @returns {string} MDI icon identifier.
 */
function getCategoryIcon(categoryName) {
  switch (categoryName) {
    case 'Lighting':
      return 'mdi-lamp-outline';
    case 'Electrical':
      return 'mdi-power-plug-outline';
    case 'Hardware':
      return 'mdi-tools';
    default:
      return 'mdi-flower-outline';
  }
}

onMounted(() => {
  // Ensure no stale 'Other' payment option persists
  if (paymentMethod.value === 'Other') {
    paymentMethod.value = 'Card';
  }
});
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6 pos-page">
    <!-- Header Section with register live status -->
    <div class="page-heading">
      <div>
        <div class="text-overline text-medium-emphasis">
          SALES
        </div>
        <h1 class="text-h5 font-weight-bold">Point of sale</h1>
        <p class="text-body-2 text-medium-emphasis">Build a cart and check out your customer.</p>
      </div>

      <v-chip color="success" variant="tonal" prepend-icon="mdi-circle-medium">
        Register open
      </v-chip>
    </div>

    <!-- API / Operation Error Alert -->
    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-3 pos-error-alert"
    >
      {{ errorMessage }}
    </v-alert>

    <v-row class="pos-workspace">
      <v-col cols="12" lg="8">
        <PosProductCatalog
          v-model:search="search"
          v-model:category="category"
          :categories="categories"
          :products="filteredProducts"
          :loading="registerLoading"
          :category-icon="getCategoryIcon"
          @add-product="addToCart"
        />
      </v-col>
      <v-col cols="12" lg="4">
        <PosCheckoutPanel
          :cart="cart"
          :selected-customer-id="selectedCustomerId"
          :selected-customer="selectedCustomer"
          :customer-search="customerSearch"
          :customers="customers"
          :matching-customers="matchingCustomers"
          :payment-method="paymentMethod"
          :payment-methods="paymentMethods"
          :discount-cents="discountCents"
          :cart-subtotal="cartSubtotal"
          :subtotal="subtotal"
          :total="total"
          :currency-code="displaySettings.currency_code"
          :currency-decimals="displaySettings.currency_decimals"
          :api-mode="apiMode"
          :busy="busy"
          :parse-serial-numbers="parseSerialNumbers"
          @update:selected-customer-id="selectedCustomerId = $event"
          @update:customer-search="customerSearch = $event"
          @update:payment-method="paymentMethod = $event"
          @update:discount="updateDiscount"
          @quantity-change="changeQuantity($event.productId, $event.delta)"
          @serial-change="setSerialNumbers($event.productId, $event.value)"
          @remove-item="removeCartItem"
          @clear-cart="clearCart"
          @checkout="checkout"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

