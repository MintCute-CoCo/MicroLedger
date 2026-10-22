import { computed, ref } from 'vue';

/**
 * Parses user-entered monetary string into integer cents.
 *
 * @param {string|number} value - Form input string (e.g., "$12.50").
 * @returns {number|null} Amount in cents or null if invalid.
 */
export function parseCents(value) {
  const cleaned = String(value || '').trim().replace(/[$,\s]/g, '');

  if (!/^\d*(\.\d{0,2})?$/.test(cleaned)) {
    return null;
  }

  const [whole = '0', fraction = ''] = cleaned.split('.');
  const wholeCents = Number(whole || 0) * 100;
  const fractionCents = Number(fraction.padEnd(2, '0') || 0);

  return wholeCents + fractionCents;
}

/**
 * Parses a raw serial number input string into an array of unique, non-empty serial numbers.
 *
 * Follows strict academic evaluation requirements:
 * 1. Splits input by commas (',') or newlines ('\n').
 * 2. Trims leading and trailing whitespace from each token.
 * 3. Filters out blank or empty strings.
 * 4. Deduplicates the tokens to ensure all returned serial numbers are unique.
 *
 * @param {string} rawInput - Multi-line or comma-separated serial number text.
 * @returns {Array<string>} Array of unique, cleaned serial number strings.
 */
export function parseSerialNumbers(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    return [];
  }

  // Split raw input on commas or newline characters
  const rawTokens = rawInput.split(/[,\n]/);
  const trimmedTokens = [];

  // Trim whitespace and discard empty entries
  for (const token of rawTokens) {
    const cleaned = token.trim();

    if (cleaned.length > 0) {
      trimmedTokens.push(cleaned);
    }
  }

  // Deduplicate to guarantee unique serial numbers
  const uniqueSerials = [];
  const seenSerials = new Set();

  for (const serial of trimmedTokens) {
    if (!seenSerials.has(serial)) {
      seenSerials.add(serial);
      uniqueSerials.push(serial);
    }
  }

  return uniqueSerials;
}

/**
 * Validates that a cart line's serial numbers match its quantity exactly.
 *
 * If the line quantity is 2, the array of parsed unique serial numbers
 * must have a length of exactly 2.
 *
 * @param {Object} cartLine - Cart line item.
 * @param {boolean} [cartLine.tracksSerial] - Whether product tracks serials.
 * @param {number} cartLine.quantity - Desired quantity in cart.
 * @param {string} [cartLine.serialNumbers] - Raw serial number input string.
 * @returns {{ valid: boolean, error: string | null, parsedSerials: Array<string> }} Validation result.
 */
export function validateLineSerialNumbers(cartLine) {
  if (!cartLine || !cartLine.tracksSerial) {
    return {
      valid: true,
      error: null,
      parsedSerials: [],
    };
  }

  const expectedCount = Number(cartLine.quantity) || 1;
  const parsedSerials = parseSerialNumbers(cartLine.serialNumbers);
  const actualCount = parsedSerials.length;

  if (actualCount !== expectedCount) {
    const itemNoun = expectedCount === 1 ? 'serial number' : 'serial numbers';
    const errorMessage = `Expected ${expectedCount} unique ${itemNoun}, but found ${actualCount}.`;

    return {
      valid: false,
      error: errorMessage,
      parsedSerials,
    };
  }

  return {
    valid: true,
    error: null,
    parsedSerials,
  };
}

/**
 * Validates serial numbers for all serialized items across the entire cart.
 *
 * @param {Array<Object>} cartLines - Active cart line items.
 * @returns {{ valid: boolean, error: string | null }} Validation outcome.
 */
export function validateCartSerialNumbers(cartLines) {
  if (!Array.isArray(cartLines) || cartLines.length === 0) {
    return {
      valid: true,
      error: null,
    };
  }

  for (const line of cartLines) {
    if (line.tracksSerial) {
      const result = validateLineSerialNumbers(line);

      if (!result.valid) {
        return {
          valid: false,
          error: result.error,
        };
      }
    }
  }

  return {
    valid: true,
    error: null,
  };
}

/**
 * Composable managing POS shopping cart line items, quantity adjustment
 * with inventory bounds checks, discount application, and financial subtotals.
 *
 * @param {Object} options - Configuration options.
 * @param {import('vue').Ref<Array>} options.remoteProducts - Reference to loaded remote products.
 * @returns {Object} Cart state, quantity modifiers, price totals, and serial validation helpers.
 */
export function usePosCart({ remoteProducts } = {}) {
  /**
   * Mobile slide-up cart sheet visibility toggle.
   */
  const cartSheetOpen = ref(false);

  /**
   * Cart operation error message (e.g. out of stock bounds).
   */
  const cartError = ref('');

  /**
   * Reactive cart line items array.
   */
  const cart = ref([]);

  /**
   * Cart-level discount in cents.
   */
  const discountCents = ref(0);

  /**
   * Financial subtotal (before discount) in cents.
   */
  const cartSubtotal = computed(() => {
    return cart.value.reduce((accumulator, line) => {
      return accumulator + Number(line.price || 0) * Number(line.quantity || 0);
    }, 0);
  });

  const subtotal = computed(() => cartSubtotal.value);

  /**
   * Final total payable after deducting discount, clamped to >= 0.
   */
  const total = computed(() => {
    const discountedTotal = cartSubtotal.value - discountCents.value;
    return Math.max(0, discountedTotal);
  });

  /**
   * Adds a product to the cart or increments its quantity if already present.
   *
   * @param {Object} product - Product catalog item to add.
   */
  function addToCart(product) {
    cartError.value = '';
    const productId = String(product.id);
    const existing = cart.value.find((line) => String(line.productId) === productId);
    const maxStock = product.stock ?? 999999;

    if (existing) {
      if (existing.quantity >= maxStock) {
        cartError.value = `Only ${maxStock} available for ${product.name}.`;
        return;
      }
      existing.quantity += 1;
      existing.stock = maxStock;
    } else {
      if (maxStock < 1) {
        cartError.value = `${product.name} is out of stock.`;
        return;
      }
      cart.value.push({
        productId,
        name: product.name,
        price: Number(product.price || 0),
        quantity: 1,
        stock: maxStock,
        tracksSerial: Boolean(product.tracksSerial),
        serialNumbers: '',
        sku: product.sku || '',
      });
    }
  }

  /**
   * Modifies line item quantity in the cart with stock bounds validation.
   *
   * @param {string|number} productId - Target product identifier.
   * @param {number} change - Positive or negative delta (+1, -1).
   */
  function changeQuantity(productId, change) {
    cartError.value = '';
    const line = cart.value.find((item) => {
      return String(item.productId) === String(productId);
    });

    if (!line) {
      return;
    }

    const product = remoteProducts?.value?.find((item) => {
      return String(item.id) === String(productId);
    });

    const maxStock = product?.stock ?? line.stock ?? 999999;
    const nextQuantity = line.quantity + change;

    if (nextQuantity < 1) {
      cart.value = cart.value.filter((item) => {
        return String(item.productId) !== String(productId);
      });
    } else if (nextQuantity > maxStock) {
      cartError.value = `Only ${maxStock} available for ${line.name}.`;
    } else {
      line.quantity = nextQuantity;
      if (product) {
        line.stock = product.stock;
      }
    }
  }

  /**
   * Sets serial numbers string on a cart line item.
   *
   * @param {string|number} productId - Product identifier.
   * @param {string} value - Serial numbers text.
   */
  function setSerialNumbers(productId, value) {
    const line = cart.value.find((item) => String(item.productId) === String(productId));
    if (line) {
      line.serialNumbers = value;
    }
  }

  /**
   * Updates the discount amount, ensuring it does not exceed the subtotal.
   *
   * @param {string|number} value - Discount input value.
   */
  function updateDiscount(value) {
    const cents = parseCents(value);
    if (cents === null) {
      return;
    }

    discountCents.value = Math.min(cents, cartSubtotal.value);
  }

  /**
   * Clears all items and discounts currently in the cart.
   */
  function clearCart() {
    cart.value = [];
    discountCents.value = 0;
    cartError.value = '';
  }

  /**
   * Removes a single line item from the cart by its product identifier.
   *
   * @param {string|number} productId - Product identifier to remove.
   */
  function removeCartItem(productId) {
    cart.value = cart.value.filter((item) => {
      return String(item.productId) !== String(productId);
    });
  }

  return {
    cartSheetOpen,
    cartError,
    cart,
    discountCents,
    cartSubtotal,
    subtotal,
    total,
    addToCart,
    changeQuantity,
    setSerialNumbers,
    updateDiscount,
    clearCart,
    removeCartItem,
    parseCents,
    parseSerialNumbers,
    validateLineSerialNumbers,
    validateCartSerialNumbers,
  };
}
