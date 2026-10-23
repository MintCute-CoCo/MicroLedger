import { createInitialDemoState } from './demoData.js';

const STORAGE_KEY = 'microledger_demo_state_v1';

/**
 * Loads current in-browser demo state from localStorage or initializes default PC hardware dataset.
 */
function getDemoState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Could not read demo state from localStorage, using initial dataset.', err);
  }
  const initial = createInitialDemoState();
  saveDemoState(initial);
  return initial;
}

/**
 * Persists demo state to localStorage.
 */
function saveDemoState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Could not persist demo state to localStorage.', err);
  }
}

/**
 * Simulates a realistic network response delay (50ms - 150ms) to preserve UI loading transitions.
 */
function delay(ms = 80) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Formats standard API error object.
 */
function createError(status, code, message, details = null) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.details = details;
  return err;
}

/**
 * Main mock request router handling all API endpoints in client demo mode.
 */
export async function handleDemoRequest(path, { method = 'GET', body, headers = {} } = {}) {
  await delay(60);
  const state = getDemoState();
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const [endpoint, queryString] = cleanPath.split('?');
  const query = new URLSearchParams(queryString || '');
  const currentUser = state.currentUser;

  // --------------------------------------------------------------------------
  // AUTHENTICATION
  // --------------------------------------------------------------------------
  if (endpoint === 'auth/login' && method === 'POST') {
    const { username, password } = body || {};
    const validUsers = [
      { username: 'admin', password: 'adminpassword123', id: 1 },
      { username: 'manager_duc', password: 'managerpassword123', id: 2 },
      { username: 'minhanh', password: 'staffpassword123', id: 3 },
      { username: 'cashier_lan', password: 'staffpassword123', id: 4 },
    ];

    const match = validUsers.find((u) => u.username === username && u.password === password);
    if (!match) {
      throw createError(401, 'AUTH_INVALID_CREDENTIALS', 'Username or password is incorrect.');
    }

    const matchedUser = state.users.find((u) => u.id === match.id) || state.users[0];
    matchedUser.lastLoginAt = new Date().toISOString();
    state.currentUser = matchedUser;
    saveDemoState(state);

    return {
      accessToken: `demo-bearer-token-${matchedUser.id}`,
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: matchedUser,
    };
  }

  if (endpoint === 'auth/refresh') {
    if (!currentUser) {
      // Default to admin for seamless evaluation if no active user session
      const defaultAdmin = state.users[0];
      state.currentUser = defaultAdmin;
      saveDemoState(state);
      return {
        accessToken: `demo-bearer-token-${defaultAdmin.id}`,
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: defaultAdmin,
      };
    }
    return {
      accessToken: `demo-bearer-token-${currentUser.id}`,
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: currentUser,
    };
  }

  if (endpoint === 'auth/logout') {
    state.currentUser = null;
    saveDemoState(state);
    return {};
  }

  if (endpoint === 'auth/change-password') {
    if (state.currentUser) {
      state.currentUser.mustChangePassword = false;
      saveDemoState(state);
    }
    return { success: true };
  }

  // --------------------------------------------------------------------------
  // SYSTEM SETTINGS
  // --------------------------------------------------------------------------
  if (endpoint === 'settings') {
    if (method === 'PATCH' || method === 'PUT') {
      state.settings = { ...state.settings, ...body };
      saveDemoState(state);
      return state.settings;
    }
    return state.settings;
  }

  // --------------------------------------------------------------------------
  // CATEGORIES
  // --------------------------------------------------------------------------
  if (endpoint === 'categories') {
    if (method === 'POST') {
      const newCategory = {
        id: state.categories.length + 1,
        name: body.name,
        slug: body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: body.description || '',
        status: 'active',
        activeProductCount: 0,
      };
      state.categories.push(newCategory);
      saveDemoState(state);
      return newCategory;
    }

    const statusParam = query.get('status') || 'active';
    let filtered = state.categories;
    if (statusParam !== 'all') {
      filtered = filtered.filter((c) => c.status === statusParam);
    }
    return { items: filtered, total: filtered.length };
  }

  if (endpoint.startsWith('categories/')) {
    const catId = Number(endpoint.split('/')[1]);
    const cat = state.categories.find((c) => c.id === catId);
    if (!cat) throw createError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');

    if (method === 'PUT' || method === 'PATCH') {
      Object.assign(cat, body);
      saveDemoState(state);
      return cat;
    }
    return cat;
  }

  // --------------------------------------------------------------------------
  // PRODUCTS
  // --------------------------------------------------------------------------
  if (endpoint === 'products') {
    if (method === 'POST') {
      const cat = state.categories.find((c) => c.id === Number(body.categoryId || body.category_id));
      const newProduct = {
        id: state.products.length + 1,
        sku: String(body.sku).trim().toUpperCase(),
        name: String(body.name).trim(),
        categoryId: cat ? cat.id : 1,
        categoryName: cat ? cat.name : 'General',
        unit: body.unit || 'piece',
        sellingPrice: Number(body.sellingPrice || body.selling_price || 0).toFixed(2),
        costPrice: Number(body.costPrice || body.cost_price || 0).toFixed(2),
        stockQty: Number(body.stockQty || body.stock_qty || 0),
        lowStockThreshold: Number(body.lowStockThreshold || body.low_stock_threshold || 5),
        reorderLevel: Number(body.reorderLevel || body.lowStockThreshold || 5),
        warrantyMonths: Number(body.warrantyMonths || body.warranty_months || 0),
        isSerialRequired: Boolean(body.isSerialRequired || body.is_serial_required),
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      state.products.push(newProduct);
      if (newProduct.stockQty > 0) {
        state.movements.unshift({
          id: state.movements.length + 1,
          productId: newProduct.id,
          productName: newProduct.name,
          sku: newProduct.sku,
          type: 'opening',
          quantityChange: newProduct.stockQty,
          quantity_change: newProduct.stockQty,
          balanceAfter: newProduct.stockQty,
          balance_after: newProduct.stockQty,
          referenceType: 'initial_stock',
          referenceId: 'OPENING',
          notes: 'Opening stock for newly registered item',
          createdAt: new Date().toISOString(),
          userName: currentUser?.fullName || 'System Admin',
        });
      }
      saveDemoState(state);
      return newProduct;
    }

    // Product search, filtering, and role-based staff redaction
    const q = (query.get('q') || '').toLowerCase().trim();
    const catId = query.get('category_id');
    const status = query.get('status') || 'active';
    const lowStock = query.get('low_stock') === 'true';
    const page = Number(query.get('page') || 1);
    const pageSize = Number(query.get('page_size') || 10);

    let filtered = state.products.filter((p) => {
      if (status !== 'all' && p.status !== status) return false;
      if (catId && catId !== 'all' && String(p.categoryId) !== String(catId)) return false;
      if (lowStock && p.stockQty > p.lowStockThreshold) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      return true;
    });

    const isStaff = currentUser?.role === 'staff';
    const mappedItems = filtered.map((p) => {
      const copy = { ...p };
      if (isStaff) {
        delete copy.costPrice;
        delete copy.cost_price;
      }
      return copy;
    });

    const start = (page - 1) * pageSize;
    const paginated = mappedItems.slice(start, start + pageSize);

    return {
      items: paginated,
      total: filtered.length,
      page,
      pageSize,
    };
  }

  if (endpoint.startsWith('products/')) {
    const prodId = Number(endpoint.split('/')[1]);
    const prod = state.products.find((p) => p.id === prodId);
    if (!prod) throw createError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');

    if (method === 'PUT' || method === 'PATCH') {
      if (body.name) prod.name = body.name;
      if (body.sku) prod.sku = body.sku;
      if (body.sellingPrice !== undefined) prod.sellingPrice = Number(body.sellingPrice).toFixed(2);
      if (body.costPrice !== undefined) prod.costPrice = Number(body.costPrice).toFixed(2);
      if (body.lowStockThreshold !== undefined) {
        prod.lowStockThreshold = Number(body.lowStockThreshold);
        prod.reorderLevel = Number(body.lowStockThreshold);
      }
      if (body.warrantyMonths !== undefined) prod.warrantyMonths = Number(body.warrantyMonths);
      if (body.isSerialRequired !== undefined) prod.isSerialRequired = Boolean(body.isSerialRequired);
      if (body.status !== undefined) prod.status = body.status;
      if (body.categoryId) {
        const cat = state.categories.find((c) => c.id === Number(body.categoryId));
        if (cat) {
          prod.categoryId = cat.id;
          prod.categoryName = cat.name;
        }
      }
      saveDemoState(state);
      return prod;
    }

    const copy = { ...prod };
    if (currentUser?.role === 'staff') {
      delete copy.costPrice;
      delete copy.cost_price;
    }
    return copy;
  }

  // --------------------------------------------------------------------------
  // INVENTORY & LEDGER
  // --------------------------------------------------------------------------
  if (endpoint === 'inventory') {
    const page = Number(query.get('page') || 1);
    const pageSize = Number(query.get('page_size') || 10);
    const totalUnits = state.products.reduce((acc, p) => acc + (p.stockQty || 0), 0);
    const lowStockCount = state.products.filter((p) => p.stockQty <= p.lowStockThreshold).length;

    const start = (page - 1) * pageSize;
    const paginated = state.products.slice(start, start + pageSize);

    return {
      items: paginated,
      total: state.products.length,
      totalUnits,
      lowStockCount,
      page,
      pageSize,
    };
  }

  if (endpoint === 'inventory/movements') {
    const type = query.get('type');
    let movements = state.movements;
    if (type && type !== 'all') {
      movements = movements.filter((m) => m.type === type);
    }
    return { items: movements, total: movements.length };
  }

  if (endpoint === 'inventory/stock-in' && method === 'POST') {
    const prod = state.products.find((p) => p.id === Number(body.productId));
    if (!prod) throw createError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');

    const qty = Number(body.quantity || 0);
    if (qty <= 0) throw createError(400, 'INVALID_QUANTITY', 'Quantity must be greater than zero.');

    prod.stockQty += qty;
    state.movements.unshift({
      id: state.movements.length + 1,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      type: 'stock_in',
      quantityChange: qty,
      quantity_change: qty,
      balanceAfter: prod.stockQty,
      balance_after: prod.stockQty,
      referenceType: 'purchase_receipt',
      referenceId: body.referenceId || 'RECEIPT',
      notes: body.notes || 'Stock-in replenishment',
      createdAt: new Date().toISOString(),
      userName: currentUser?.fullName || 'Staff User',
    });

    state.auditLogs.unshift({
      id: state.auditLogs.length + 1,
      userId: currentUser?.id || 1,
      userName: currentUser?.fullName || 'Staff User',
      action: 'STOCK_IN',
      entityType: 'inventory',
      entityId: String(prod.id),
      details: `Stock-in +${qty} units for SKU ${prod.sku}. New balance: ${prod.stockQty}`,
      createdAt: new Date().toISOString(),
    });

    saveDemoState(state);
    return { success: true };
  }

  if (endpoint === 'inventory/adjustments' && method === 'POST') {
    const prod = state.products.find((p) => p.id === Number(body.productId));
    if (!prod) throw createError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');

    const delta = Number(body.quantityChange || 0);
    if (prod.stockQty + delta < 0) {
      throw createError(409, 'NEGATIVE_STOCK_PREVENTED', 'Adjustment would result in negative stock.');
    }

    prod.stockQty += delta;
    state.movements.unshift({
      id: state.movements.length + 1,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      type: 'adjustment',
      quantityChange: delta,
      quantity_change: delta,
      balanceAfter: prod.stockQty,
      balance_after: prod.stockQty,
      referenceType: 'manual_adjustment',
      referenceId: body.reason || 'DAMAGE_OR_CORRECTION',
      notes: body.notes || 'Manual stock adjustment',
      createdAt: new Date().toISOString(),
      userName: currentUser?.fullName || 'Store Manager',
    });

    state.auditLogs.unshift({
      id: state.auditLogs.length + 1,
      userId: currentUser?.id || 1,
      userName: currentUser?.fullName || 'Store Manager',
      action: 'STOCK_ADJUSTMENT',
      entityType: 'inventory',
      entityId: String(prod.id),
      details: `Adjusted ${delta >= 0 ? `+${delta}` : delta} units for SKU ${prod.sku}. Reason: ${body.reason}`,
      createdAt: new Date().toISOString(),
    });

    saveDemoState(state);
    return { success: true };
  }

  // --------------------------------------------------------------------------
  // SALES (POS & ORDERS)
  // --------------------------------------------------------------------------
  if (endpoint === 'sales') {
    if (method === 'POST') {
      const { items = [], paymentMethod = 'card', discountAmount = 0, customerId = null } = body || {};
      if (!items.length) throw createError(400, 'EMPTY_SALE', 'Cart cannot be empty.');

      // Check stock availability
      for (const item of items) {
        const prod = state.products.find((p) => p.id === Number(item.productId));
        if (!prod) throw createError(404, 'PRODUCT_NOT_FOUND', `Product ID ${item.productId} not found.`);
        if (prod.status !== 'active') throw createError(409, 'PRODUCT_INACTIVE', `Product ${prod.name} is inactive.`);
        if (prod.stockQty < Number(item.quantity)) {
          throw createError(409, 'INSUFFICIENT_STOCK', `Insufficient stock for ${prod.name}. Available: ${prod.stockQty}`);
        }
      }

      // Decrement stock and assemble line items
      let subtotal = 0;
      const saleId = state.sales.length + 1;
      const saleNo = `S-${String(saleId).padStart(6, '0')}`;
      const saleItems = [];
      const customer = customerId ? state.customers.find((c) => c.id === Number(customerId)) : null;

      for (const item of items) {
        const prod = state.products.find((p) => p.id === Number(item.productId));
        const qty = Number(item.quantity);
        prod.stockQty -= qty;

        const lineTotal = Number(prod.sellingPrice) * qty;
        subtotal += lineTotal;

        saleItems.push({
          id: saleItems.length + 1,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          quantity: qty,
          unitPrice: prod.sellingPrice,
          totalPrice: lineTotal.toFixed(2),
          warrantyMonths: prod.warrantyMonths,
          serialNumbers: item.serialNumbers || [],
        });

        // Record stock ledger movement
        state.movements.unshift({
          id: state.movements.length + 1,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          type: 'sale',
          quantityChange: -qty,
          quantity_change: -qty,
          balanceAfter: prod.stockQty,
          balance_after: prod.stockQty,
          referenceType: 'sale',
          referenceId: saleNo,
          notes: `POS sale ${saleNo}`,
          createdAt: new Date().toISOString(),
          userName: currentUser?.fullName || 'Cashier',
        });

        // Create warranty records for serialized products
        if (prod.warrantyMonths > 0 && item.serialNumbers?.length) {
          for (const sn of item.serialNumbers) {
            const exp = new Date();
            exp.setMonth(exp.getMonth() + prod.warrantyMonths);
            state.warranties.unshift({
              id: state.warranties.length + 1,
              productId: prod.id,
              productName: prod.name,
              product_name: prod.name,
              sku: prod.sku,
              customerId: customer?.id || null,
              customerName: customer?.name || 'Walk-in Customer',
              customer_name: customer?.name || 'Walk-in Customer',
              saleId,
              saleNo,
              sale_no: saleNo,
              serialNo: sn,
              serial_no: sn,
              startDate: new Date().toISOString().slice(0, 10),
              start_date: new Date().toISOString().slice(0, 10),
              expiryDate: exp.toISOString().slice(0, 10),
              expiry_date: exp.toISOString().slice(0, 10),
              validity: 'Active',
              warrantyMonths: prod.warrantyMonths,
              warranty_months: prod.warrantyMonths,
            });
          }
        }
      }

      const discount = Math.min(Number(discountAmount || 0), subtotal);
      const total = subtotal - discount;

      const newSale = {
        id: saleId,
        saleNo,
        customerId: customer?.id || null,
        customerName: customer?.name || 'Walk-in Customer',
        userId: currentUser?.id || 1,
        staffName: currentUser?.fullName || 'Cashier',
        paymentMethod,
        subtotal: subtotal.toFixed(2),
        discountAmount: discount.toFixed(2),
        total: total.toFixed(2),
        status: 'completed',
        soldAt: new Date().toISOString(),
        voidedBy: null,
        voidedAt: null,
        voidReason: null,
        items: saleItems,
      };

      if (customer) {
        customer.totalVisits += 1;
        customer.lifetimeSpend = (Number(customer.lifetimeSpend || 0) + total).toFixed(2);
      }

      state.sales.unshift(newSale);
      state.auditLogs.unshift({
        id: state.auditLogs.length + 1,
        userId: currentUser?.id || 1,
        userName: currentUser?.fullName || 'Cashier',
        action: 'SALE_CREATE',
        entityType: 'sales',
        entityId: String(saleId),
        details: `Created sale ${saleNo} with total ${total.toLocaleString()} VND via ${paymentMethod}`,
        createdAt: new Date().toISOString(),
      });

      saveDemoState(state);
      return newSale;
    }

    // List sales with filters & pagination
    const q = (query.get('q') || '').toLowerCase().trim();
    const status = query.get('status');
    const payment = query.get('payment_method');
    const page = Number(query.get('page') || 1);
    const pageSize = Number(query.get('page_size') || 10);

    let filtered = state.sales.filter((s) => {
      if (status && status !== 'all' && s.status !== status) return false;
      if (payment && payment !== 'all' && s.paymentMethod !== payment) return false;
      if (q && !s.saleNo.toLowerCase().includes(q) && !s.customerName.toLowerCase().includes(q)) return false;
      return true;
    });

    const start = (page - 1) * pageSize;
    return {
      items: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize,
    };
  }

  if (endpoint.startsWith('sales/') && endpoint.endsWith('/void') && method === 'POST') {
    const saleId = Number(endpoint.split('/')[1]);
    const sale = state.sales.find((s) => s.id === saleId);
    if (!sale) throw createError(404, 'SALE_NOT_FOUND', 'Sale not found.');
    if (sale.status === 'voided') throw createError(400, 'ALREADY_VOIDED', 'Sale is already voided.');

    sale.status = 'voided';
    sale.voidedBy = currentUser?.fullName || 'System Admin';
    sale.voidedAt = new Date().toISOString();
    sale.voidReason = body.reason || 'Customer returned items';

    // Restock all items
    for (const item of sale.items) {
      const prod = state.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stockQty += item.quantity;
        state.movements.unshift({
          id: state.movements.length + 1,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          type: 'void_reversal',
          quantityChange: item.quantity,
          quantity_change: item.quantity,
          balanceAfter: prod.stockQty,
          balance_after: prod.stockQty,
          referenceType: 'sale_void',
          referenceId: sale.saleNo,
          notes: `Restock from voided sale ${sale.saleNo}: ${sale.voidReason}`,
          createdAt: new Date().toISOString(),
          userName: currentUser?.fullName || 'System Admin',
        });
      }
    }

    state.auditLogs.unshift({
      id: state.auditLogs.length + 1,
      userId: currentUser?.id || 1,
      userName: currentUser?.fullName || 'System Admin',
      action: 'SALE_VOID',
      entityType: 'sales',
      entityId: String(sale.id),
      details: `Voided sale ${sale.saleNo}. Reason: ${sale.voidReason}`,
      createdAt: new Date().toISOString(),
    });

    saveDemoState(state);
    return sale;
  }

  if (endpoint.startsWith('sales/')) {
    const saleId = Number(endpoint.split('/')[1]);
    const sale = state.sales.find((s) => s.id === saleId);
    if (!sale) throw createError(404, 'SALE_NOT_FOUND', 'Sale not found.');
    return sale;
  }

  // --------------------------------------------------------------------------
  // CUSTOMERS
  // --------------------------------------------------------------------------
  if (endpoint === 'customers') {
    if (method === 'POST') {
      const newCustomer = {
        id: state.customers.length + 1,
        name: body.name,
        phone: body.phone,
        email: body.email || '',
        address: body.address || '',
        status: 'active',
        totalVisits: 0,
        lifetimeSpend: '0.00',
      };
      state.customers.push(newCustomer);
      saveDemoState(state);
      return newCustomer;
    }

    const q = (query.get('q') || '').toLowerCase().trim();
    let filtered = state.customers;
    if (q) {
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }
    return { items: filtered, total: filtered.length };
  }

  if (endpoint.startsWith('customers/')) {
    const custId = Number(endpoint.split('/')[1]);
    const customer = state.customers.find((c) => c.id === custId);
    if (!customer) throw createError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');

    if (method === 'PUT' || method === 'PATCH') {
      Object.assign(customer, body);
      saveDemoState(state);
      return customer;
    }
    return customer;
  }

  // --------------------------------------------------------------------------
  // SUPPLIERS
  // --------------------------------------------------------------------------
  if (endpoint === 'suppliers') {
    if (method === 'POST') {
      const newSup = {
        id: state.suppliers.length + 1,
        name: body.name,
        code: `SUP-${String(state.suppliers.length + 1).padStart(3, '0')}`,
        contact_person: body.contact_person || '',
        phone: body.phone || '',
        email: body.email || '',
        address: body.address || '',
        status: 'active',
        notes: body.notes || '',
      };
      state.suppliers.push(newSup);
      saveDemoState(state);
      return newSup;
    }
    return { items: state.suppliers, total: state.suppliers.length };
  }

  if (endpoint.startsWith('suppliers/')) {
    const supId = Number(endpoint.split('/')[1]);
    const sup = state.suppliers.find((s) => s.id === supId);
    if (!sup) throw createError(404, 'SUPPLIER_NOT_FOUND', 'Supplier not found.');

    if (method === 'PUT' || method === 'PATCH') {
      Object.assign(sup, body);
      saveDemoState(state);
      return sup;
    }
    return sup;
  }

  // --------------------------------------------------------------------------
  // USERS
  // --------------------------------------------------------------------------
  if (endpoint === 'users') {
    if (method === 'POST') {
      const newUser = {
        id: state.users.length + 1,
        username: body.username,
        fullName: body.fullName || body.full_name,
        role: body.role || 'staff',
        status: 'active',
        mustChangePassword: false,
        lastLoginAt: null,
      };
      state.users.push(newUser);
      saveDemoState(state);
      return newUser;
    }
    return { items: state.users, total: state.users.length };
  }

  if (endpoint.startsWith('users/')) {
    const userId = Number(endpoint.split('/')[1]);
    const user = state.users.find((u) => u.id === userId);
    if (!user) throw createError(404, 'USER_NOT_FOUND', 'User not found.');

    if (method === 'PUT' || method === 'PATCH') {
      if (body.role) user.role = body.role;
      if (body.status) user.status = body.status;
      if (body.fullName) user.fullName = body.fullName;
      saveDemoState(state);
      return user;
    }
    return user;
  }

  // --------------------------------------------------------------------------
  // WARRANTIES
  // --------------------------------------------------------------------------
  if (endpoint === 'warranties') {
    const q = (query.get('q') || '').toLowerCase().trim();
    let filtered = state.warranties;
    if (q) {
      filtered = filtered.filter(
        (w) =>
          w.productName.toLowerCase().includes(q) ||
          w.sku.toLowerCase().includes(q) ||
          w.serialNo.toLowerCase().includes(q) ||
          w.customerName.toLowerCase().includes(q)
      );
    }
    return { items: filtered, total: filtered.length };
  }

  // --------------------------------------------------------------------------
  // WARRANTY CLAIMS
  // --------------------------------------------------------------------------
  if (endpoint === 'claims') {
    if (method === 'POST') {
      const warranty = state.warranties.find((w) => w.id === Number(body.warrantyId || body.warranty_id));
      const supplier = state.suppliers.find((s) => s.id === Number(body.supplierId || body.supplier_id));
      const customer = warranty ? state.customers.find((c) => c.id === warranty.customerId) : null;

      const claimId = state.claims.length + 1;
      const claimNo = `CLM-${String(claimId).padStart(6, '0')}`;
      const newClaim = {
        id: claimId,
        claimNo,
        claim_no: claimNo,
        warrantyId: warranty ? warranty.id : null,
        warranty_id: warranty ? warranty.id : null,
        productName: warranty ? warranty.productName : 'Hardware Item',
        product_name: warranty ? warranty.productName : 'Hardware Item',
        sku: warranty ? warranty.sku : '',
        serialNo: warranty ? warranty.serialNo : '',
        serial_no: warranty ? warranty.serialNo : '',
        customerId: customer ? customer.id : null,
        customerName: customer ? customer.name : 'Customer',
        customer_name: customer ? customer.name : 'Customer',
        customerPhone: customer ? customer.phone : '0900000000',
        customer_phone: customer ? customer.phone : '0900000000',
        supplierId: supplier ? supplier.id : 1,
        supplierName: supplier ? supplier.name : 'Service Partner',
        supplier_name: supplier ? supplier.name : 'Service Partner',
        status: 'Submitted',
        issueDescription: body.issueDescription || body.issue_description || 'Defect reported',
        issue_description: body.issueDescription || body.issue_description || 'Defect reported',
        expectedReturnDate: body.expectedReturnDate || null,
        expected_return_date: body.expectedReturnDate || null,
        actualReturnDate: null,
        actual_return_date: null,
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        overdue: false,
        history: [
          {
            id: 1,
            fromStatus: null,
            from_status: null,
            toStatus: 'Submitted',
            to_status: 'Submitted',
            notes: body.notes || 'Claim initiated',
            createdAt: new Date().toISOString(),
            created_at: new Date().toISOString(),
            userName: currentUser?.fullName || 'Cashier',
            user_name: currentUser?.fullName || 'Cashier',
          },
        ],
      };

      state.claims.unshift(newClaim);
      saveDemoState(state);
      return newClaim;
    }

    return { items: state.claims, total: state.claims.length };
  }

  if (endpoint.startsWith('claims/') && endpoint.endsWith('/transitions') && method === 'POST') {
    const claimId = Number(endpoint.split('/')[1]);
    const claim = state.claims.find((c) => c.id === claimId);
    if (!claim) throw createError(404, 'CLAIM_NOT_FOUND', 'Claim ticket not found.');

    const oldStatus = claim.status;
    claim.status = body.toStatus || body.status;
    claim.history.push({
      id: claim.history.length + 1,
      fromStatus: oldStatus,
      from_status: oldStatus,
      toStatus: claim.status,
      to_status: claim.status,
      notes: body.notes || `Transitioned to ${claim.status}`,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      userName: currentUser?.fullName || 'Store Manager',
      user_name: currentUser?.fullName || 'Store Manager',
    });

    saveDemoState(state);
    return claim;
  }

  if (endpoint.startsWith('claims/')) {
    const claimId = Number(endpoint.split('/')[1]);
    const claim = state.claims.find((c) => c.id === claimId);
    if (!claim) throw createError(404, 'CLAIM_NOT_FOUND', 'Claim ticket not found.');
    return claim;
  }

  // --------------------------------------------------------------------------
  // AUDIT LOGS
  // --------------------------------------------------------------------------
  if (endpoint === 'audit-logs') {
    return { items: state.auditLogs, total: state.auditLogs.length };
  }

  // --------------------------------------------------------------------------
  // REPORTS
  // --------------------------------------------------------------------------
  if (endpoint === 'reports/dashboard') {
    const todaySales = state.sales.filter((s) => s.status === 'completed');
    const todayTotal = todaySales.reduce((sum, s) => sum + Number(s.total || 0), 0);
    const activeProducts = state.products.filter((p) => p.status === 'active').length;
    const activeCategories = state.categories.filter((c) => c.status === 'active').length;
    const units = state.products.reduce((acc, p) => acc + (p.stockQty || 0), 0);
    const lowStockCount = state.products.filter((p) => p.stockQty <= p.lowStockThreshold).length;

    const inventory = {
      activeProducts,
      activeCategories,
      units,
      lowStockCount,
    };

    if (currentUser?.role === 'admin') {
      const stockVal = state.products.reduce((acc, p) => acc + Number(p.costPrice || 0) * (p.stockQty || 0), 0);
      inventory.stockValue = stockVal.toFixed(2);
    }

    const todayDate = new Date().toISOString().slice(0, 10);
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const daySales = todaySales.filter((s) => s.soldAt.slice(0, 10) === dayStr);
      last7Days.push({
        day: dayStr,
        total: daySales.reduce((sum, s) => sum + Number(s.total || 0), 0).toFixed(2),
        count: daySales.length,
      });
    }

    const topProducts = state.products.slice(0, 4).map((p) => ({
      productId: String(p.id),
      name: p.name,
      quantity: 2,
      revenue: (Number(p.sellingPrice) * 2).toFixed(2),
    }));

    return {
      today: {
        date: todayDate,
        total: todayTotal.toFixed(2),
        count: todaySales.length,
      },
      last7Days,
      topProducts,
      inventory,
      timeZone: 'Asia/Ho_Chi_Minh',
    };
  }

  if (endpoint === 'reports/sales') {
    const group = query.get('group') || 'day';
    const completed = state.sales.filter((s) => s.status === 'completed');
    const voided = state.sales.filter((s) => s.status === 'voided');

    const groups = [];
    if (group === 'day') {
      const map = new Map();
      for (const s of completed) {
        const d = s.soldAt.slice(0, 10);
        const curr = map.get(d) || { groupKey: d, label: d, unitsSold: 0, subtotal: 0, discount: 0, netRevenue: 0 };
        curr.subtotal += Number(s.subtotal || 0);
        curr.discount += Number(s.discountAmount || 0);
        curr.netRevenue += Number(s.total || 0);
        for (const it of s.items || []) curr.unitsSold += it.quantity;
        map.set(d, curr);
      }
      for (const val of map.values()) {
        groups.push({
          groupKey: val.groupKey,
          label: val.label,
          unitsSold: val.unitsSold,
          subtotal: val.subtotal.toFixed(2),
          discount: val.discount.toFixed(2),
          netRevenue: val.netRevenue.toFixed(2),
        });
      }
    }

    return { groups, voided };
  }

  // --------------------------------------------------------------------------
  // SPREADSHEET IMPORTS (MOCK)
  // --------------------------------------------------------------------------
  if (endpoint === 'imports/preview') {
    return {
      id: 'demo-import-1',
      counts: { total: 3, valid: 3, errors: 0 },
      rows: [
        { rowNumber: 2, status: 'valid', data: { sku: 'FAN-COR-120MM', name: 'Corsair AF120 RGB Elite 120mm PWM Fan' } },
        { rowNumber: 3, status: 'valid', data: { sku: 'PSU-MSI-MAG-A750GL', name: 'MSI MAG A750GL PCIE5 750W 80 Plus Gold' } },
        { rowNumber: 4, status: 'valid', data: { sku: 'CASE-NZXT-H5-FLOW', name: 'NZXT H5 Flow Compact ATX Mid-Tower Case' } },
      ],
    };
  }

  if (endpoint.startsWith('imports/') && endpoint.endsWith('/commit')) {
    return { success: true, imported: 3 };
  }

  // Default fallback for any unhandled GET/POST/PUT
  return { items: [], total: 0 };
}

/**
 * Handles mock file downloads in demo mode.
 */
export async function handleDemoDownload(path, filename) {
  const content = `MicroLedger Demo Export: ${path}\nGenerated: ${new Date().toISOString()}\nStatus: Success\n`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
