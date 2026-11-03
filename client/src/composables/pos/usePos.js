import { computed, ref } from 'vue';
import { useAuthStore } from '../../stores/auth.js';
import {
  usePosCatalog,
  usePosCart,
  usePosCheckout,
  getCategoryIcon,
  getPaymentIcon,
} from './index.js';

/**
 * Top-level Point of Sale (POS) Composable aggregating specialized sub-composables:
 * - `usePosCatalog`: Product catalog lookup, categories, debounced SKU search.
 * - `usePosCart`: Cart line items, quantity bounds checking, discount calculations, SN validation.
 * - `usePosCheckout`: Customer selection, payment method choices, order submission.
 *
 * Implements strict separation of concerns for university FYP evaluation.
 *
 * @returns {Object} Unified POS register state and handler methods.
 */
export function usePos() {
  const auth = useAuthStore();
  const apiMode = computed(() => true);

  /**
   * Sale object passed to ReceiptDialog upon successful checkout.
   */
  const receiptDialogSale = ref(null);

  /**
   * Visibility flag for completed transaction receipt modal.
   */
  const receiptDialogOpen = ref(false);

  /**
   * Product catalog sub-composable.
   */
  const catalog = usePosCatalog();

  /**
   * Shopping cart sub-composable.
   */
  const cart = usePosCart({
    remoteProducts: catalog.remoteProducts,
  });

  /**
   * Checkout & customer sub-composable.
   */
  const checkout = usePosCheckout({
    cart: cart.cart,
    discountCents: cart.discountCents,
    clearCart: cart.clearCart,
    onCheckoutSuccess: async (createdSale) => {
      await catalog.loadCatalog();
      await checkout.loadCustomers();
      if (createdSale) {
        receiptDialogSale.value = createdSale;
        receiptDialogOpen.value = true;
      }
    },
  });

  /**
   * Combined error message from catalog, cart, or checkout.
   */
  const errorMessage = computed(() => {
    return (
      catalog.catalogError.value ||
      cart.cartError.value ||
      checkout.customerLoadError.value ||
      checkout.checkoutError.value ||
      ''
    );
  });

  /**
   * Combined register loading indicator.
   */
  const registerLoading = computed(() => {
    return catalog.registerLoading.value;
  });

  return {
    auth,
    apiMode,
    errorMessage,
    registerLoading,

    // Catalog state & methods
    remoteProducts: catalog.remoteProducts,
    remoteCategories: catalog.remoteCategories,
    search: catalog.search,
    category: catalog.category,
    products: catalog.products,
    categories: catalog.categories,
    filteredProducts: catalog.filteredProducts,
    adaptProducts: catalog.adaptProducts,
    loadRegister: catalog.loadCatalog,
    getCategoryIcon,

    // Cart state & methods
    cartSheetOpen: cart.cartSheetOpen,
    cart: cart.cart,
    discountCents: cart.discountCents,
    cartSubtotal: cart.cartSubtotal,
    subtotal: cart.subtotal,
    total: cart.total,
    addToCart: cart.addToCart,
    changeQuantity: cart.changeQuantity,
    setSerialNumbers: cart.setSerialNumbers,
    updateDiscount: cart.updateDiscount,
    clearCart: cart.clearCart,
    removeCartItem: cart.removeCartItem,
    parseCents: cart.parseCents,
    parseSerialNumbers: cart.parseSerialNumbers,
    validateLineSerialNumbers: cart.validateLineSerialNumbers,
    validateCartSerialNumbers: cart.validateCartSerialNumbers,

    // Checkout state & methods
    selectedCustomerId: checkout.selectedCustomerId,
    paymentMethod: checkout.paymentMethod,
    busy: checkout.busy,
    remoteCustomers: checkout.remoteCustomers,
    customerLoadError: checkout.customerLoadError,
    customerSearch: checkout.customerSearch,
    paymentMethods: checkout.paymentMethods,
    customers: checkout.customers,
    matchingCustomers: checkout.matchingCustomers,
    selectedCustomer: checkout.selectedCustomer,
    checkout: checkout.checkout,
    getPaymentIcon,

    // Printable receipt state
    receiptDialogSale,
    receiptDialogOpen,
  };
}
