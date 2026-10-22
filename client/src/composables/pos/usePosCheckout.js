import { computed, onMounted, ref } from 'vue';
import { apiRequest } from '../../api/client.js';
import { useNotificationsStore } from '../../stores/notifications.js';
import { parseSerialNumbers, validateCartSerialNumbers } from './usePosCart.js';

/**
 * Static payment method options accepted by the POS checkout interface.
 */
export const POS_PAYMENT_METHODS = ['Cash', 'Card', 'Bank transfer'];

/**
 * Creates a UUID v4 for sale idempotency.
 *
 * `crypto.randomUUID()` is unavailable on insecure LAN origins in some browsers,
 * while `crypto.getRandomValues()` remains available there.
 *
 * @returns {string} UUID v4 value.
 */
function createIdempotencyKey() {
  const browserCrypto = globalThis.crypto;

  if (typeof browserCrypto?.randomUUID === 'function') {
    return browserCrypto.randomUUID();
  }

  if (typeof browserCrypto?.getRandomValues !== 'function') {
    throw new Error('Secure random number generation is unavailable in this browser.');
  }

  const bytes = new Uint8Array(16);
  browserCrypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hexParts = [];
  for (const byte of bytes) {
    hexParts.push(byte.toString(16).padStart(2, '0'));
  }

  const hex = hexParts.join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Returns a contextual Material Design icon for each payment method.
 *
 * @param {string} method - Payment method name.
 * @returns {string} MDI icon identifier.
 */
export function getPaymentIcon(method) {
  switch (method) {
    case 'Cash':
      return 'mdi-cash';
    case 'Card':
      return 'mdi-credit-card-outline';
    case 'Bank transfer':
      return 'mdi-bank-outline';
    default:
      return 'mdi-credit-card-outline';
  }
}

/**
 * Composable managing customer selection, payment method choices,
 * serial number validation, idempotency protection, and final sale order submission.
 *
 * @param {Object} options - Configuration options.
 * @param {import('vue').Ref<Array>} options.cart - Active cart lines reference.
 * @param {import('vue').Ref<number>} options.discountCents - Active cart discount in cents.
 * @param {Function} options.clearCart - Callback to clear cart upon successful sale.
 * @param {Function} options.onCheckoutSuccess - Callback invoked after a successful sale.
 * @returns {Object} Checkout state, customer pickers, and checkout submission handler.
 */
export function usePosCheckout({ cart, discountCents, clearCart, onCheckoutSuccess } = {}) {
  const notifications = useNotificationsStore();

  /**
   * Remote customer directory dataset.
   */
  const remoteCustomers = ref([]);

  /**
   * Selected customer ID for the active order.
   */
  const selectedCustomerId = ref(null);

  /**
   * Selected payment method for the active order.
   */
  const paymentMethod = ref('Card');

  /**
   * Customer directory loading error shown in the POS workspace.
   */
  const customerLoadError = ref('');

  /**
   * Customer search autocomplete text.
   */
  const customerSearch = ref('');

  /**
   * Checkout network in-flight indicator.
   */
  const busy = ref(false);

  /**
   * Retains the request key after an uncertain network result so an unchanged
   * cart can safely retry the same sale without creating a duplicate.
   */
  let pendingCheckout = null;

  /**
   * Checkout error message banner.
   */
  const checkoutError = ref('');

  /**
   * Resolves the active customer collection.
   */
  const customers = computed(() => {
    return remoteCustomers.value;
  });

  /**
   * Filters customers for the walk-in customer autocomplete picker (up to 8 matches).
   */
  const matchingCustomers = computed(() => {
    const query = customerSearch.value.toLowerCase().trim();

    const matches = customers.value.filter((cust) => {
      const customerName = (cust.name || '').toLowerCase();
      const nameMatch = customerName.includes(query);

      const customerPhone = cust.phone || '';
      const phoneMatch = customerPhone.includes(query);

      return nameMatch || phoneMatch;
    });

    return matches.slice(0, 8);
  });

  /**
   * Resolves the currently selected customer object from ID.
   */
  const selectedCustomer = computed(() => {
    const customerId = selectedCustomerId.value;
    if (!customerId) {
      return null;
    }

    const match = customers.value.find((customer) => {
      return String(customer.id) === String(customerId);
    });

    return match || null;
  });

  /**
   * Loads initial customer records from API.
   */
  async function loadCustomers() {
    customerLoadError.value = '';

    try {
      const customersResult = await apiRequest('/customers?page_size=100');
      remoteCustomers.value = customersResult.items || [];
    } catch (error) {
      customerLoadError.value = error.message;
    }
  }

  /**
   * Submits the current cart order to create an immutable sale transaction.
   * Validates serial numbers for all tracked items and provides idempotency protection.
   */
  async function checkout() {
    if (!cart?.value?.length || busy.value) {
      return;
    }

    checkoutError.value = '';

    // Step 1: Validate serial numbers across all serialized cart lines
    const serialValidation = validateCartSerialNumbers(cart.value);

    if (!serialValidation.valid) {
      checkoutError.value = serialValidation.error;
      return;
    }

    busy.value = true;
    let saleCompleted = false;

    try {
      const paymentMethodMap = {
        Cash: 'cash',
        Card: 'card',
        'Bank transfer': 'bank_transfer',
      };

      // Format cart lines for the API payload
      const formattedItems = cart.value.map((line) => {
        const itemPayload = {
          productId: line.productId,
          quantity: line.quantity,
        };

        if (line.tracksSerial) {
          const parsedSerials = parseSerialNumbers(line.serialNumbers);
          itemPayload.serialNumbers = parsedSerials;
        }

        return itemPayload;
      });

      const currentDiscount = discountCents?.value || 0;
      const discountFormatted = (currentDiscount / 100).toFixed(2);
      const chosenPayment = paymentMethodMap[paymentMethod.value] || 'card';
      const requestBody = {
        items: formattedItems,
        paymentMethod: chosenPayment,
        discountAmount: discountFormatted,
        customerId: selectedCustomerId.value || null,
      };
      const requestFingerprint = JSON.stringify(requestBody);

      if (pendingCheckout?.fingerprint !== requestFingerprint) {
        pendingCheckout = {
          fingerprint: requestFingerprint,
          key: createIdempotencyKey(),
        };
      }

      await apiRequest('/sales', {
        method: 'POST',
        headers: {
          'Idempotency-Key': pendingCheckout.key,
        },
        body: requestBody,
      });

      pendingCheckout = null;
      // Reset cart and checkout states upon successful transaction
      if (typeof clearCart === 'function') {
        clearCart();
      }
      selectedCustomerId.value = null;
      notifications.notify('Sale completed and inventory updated.');
      saleCompleted = true;
    } catch (error) {
      checkoutError.value = error.message;
    } finally {
      busy.value = false;
    }

    if (saleCompleted && typeof onCheckoutSuccess === 'function') {
      try {
        await onCheckoutSuccess();
      } catch {
        checkoutError.value = 'Sale completed, but the POS data could not be refreshed.';
      }
    }
  }

  onMounted(() => {
    loadCustomers();
  });

  return {
    selectedCustomerId,
    paymentMethod,
    remoteCustomers,
    customerLoadError,
    customerSearch,
    busy,
    checkoutError,
    paymentMethods: POS_PAYMENT_METHODS,
    customers,
    matchingCustomers,
    selectedCustomer,
    checkout,
    loadCustomers,
    getPaymentIcon,
  };
}
