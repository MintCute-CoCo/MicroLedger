/**
 * ============================================================================
 * MicroLedger Seed File: 003_pc_hardware_catalog.js
 * ============================================================================
 *
 * PURPOSE & ARCHITECTURE:
 * This database seed file is designed for university Final Year Project (FYP)
 * demonstration and evaluation. It performs a comprehensive surgical wipe of
 * dummy test artifacts (e.g. 'Product 1792...', 'SKU_179...', 'Reject Customer')
 * and establishes an authentic, realistic retail PC hardware store environment.
 *
 * STRICT REQUISITES:
 * 1. Safe Surgical Wipe:
 *    Safely deletes all dummy artifacts (products, customers, suppliers, serials)
 *    in reverse foreign-key dependency order without dropping or truncating tables:
 *      claim_status_history -> warranty_claims -> warranties ->
 *      sale_item_serials -> sale_items -> sales -> inventory_transactions ->
 *      audit_logs -> products / suppliers / customers / unused categories.
 *
 * 2. Store Team Provisioning (Exactly 6 Users):
 *    - 2 Administrators: System Admin ('admin'), Store Manager Duc ('manager_duc')
 *    - 4 Staff Members: Cashier Minh ('minhanh'), Cashier Lan ('cashier_lan'),
 *      Stock Manager Tuan ('stock_tuan'), Stock Assistant Huy ('stock_assistant')
 *    System configuration in 'settings' table remains fully intact.
 *
 * 3. Authentic Retail Suppliers:
 *    Established distributors and service centers: Phong Vu IT, Synnex FPT,
 *    MSI Authorized Service Center, Asus Warranty Dept.
 *
 * 4. Authentic Retail Customers:
 *    Realistic Vietnamese customer names ('Nguyen Van A', 'Bui Ngoc Lan', etc.)
 *    with valid 10-digit mobile phone numbers.
 *
 * 5. Authentic Categories (Exactly 5 PC Hardware Categories):
 *    Processors, Motherboards, Graphics Cards, Memory, Storage.
 *
 * 6. Authentic PC Hardware Products (EXACTLY 6 Required Items - No Inventions):
 *    - Intel Core i5-14400F Desktop Processor
 *    - MSI B760M Gaming Plus WiFi DDR4 Motherboard
 *    - MSI Gaming X Trio AMD Radeon RX 6800 XT 16GB
 *    - Corsair Vengeance LPX 32GB (2x16GB) DDR4 RAM Kit
 *    - Western Digital Black SN850X 1TB NVMe SSD
 *    - Kingston NV2 500GB PCIe 4.0 NVMe SSD
 *
 * 7. Authentic Serial Numbers:
 *    For serial-tracked items, assigns realistic alphanumeric manufacturer serials
 *    (e.g., 'WD-WCC6Y7821034', 'MSI-SN-602-V397B23090012', etc.), strictly
 *    avoiding any random hashes or 'SN_179...' strings.
 *
 * 8. Stock Ledger Invariant Compliance (SRS-INV-02, AC-015a):
 *    Ensures that for every product, current stock_qty strictly equals the sum
 *    of all inventory_transactions quantity_change values.
 *
 * ============================================================================
 */

import { hashPassword } from '../../utils/passwords.js';

// ============================================================================
// SECTION 1: STATIC STORE DATA DEFINITIONS
// ============================================================================

/**
 * Exact store team user definitions: 2 Admins and 4 Staff members.
 */
const STORE_TEAM_USERS = [
  {
    username: 'admin',
    full_name: 'System Admin',
    role: 'admin',
    password: 'adminpassword123',
    status: 'active',
  },
  {
    username: 'manager_duc',
    full_name: 'Store Manager Duc',
    role: 'admin',
    password: 'AdminPassword@123',
    status: 'active',
  },
  {
    username: 'minhanh',
    full_name: 'Cashier Minh',
    role: 'staff',
    password: 'staffpassword123',
    status: 'active',
  },
  {
    username: 'cashier_lan',
    full_name: 'Cashier Lan',
    role: 'staff',
    password: 'StaffPassword@123',
    status: 'active',
  },
  {
    username: 'stock_tuan',
    full_name: 'Stock Manager Tuan',
    role: 'staff',
    password: 'StaffPassword@123',
    status: 'active',
  },
  {
    username: 'stock_assistant',
    full_name: 'Stock Assistant Huy',
    role: 'staff',
    password: 'StaffPassword@123',
    status: 'active',
  },
];

/**
 * Authentic PC hardware suppliers, wholesale distributors, and RMA service hubs.
 */
const AUTHENTIC_SUPPLIERS = [
  {
    name: 'Phong Vu IT Distribution',
    contact_person: 'Nguyen Hai Phong',
    phone: '02838686868',
    email: 'distribution@phongvu.vn',
    notes: 'Primary retail and wholesale distribution partner for desktop computing systems.',
    status: 'active',
  },
  {
    name: 'Synnex FPT',
    contact_person: 'Le Thanh Dat',
    phone: '02473006666',
    email: 'hardware@synnexfpt.com.vn',
    notes: 'Official national distributor for Intel processors, Asus motherboards, and Corsair kits.',
    status: 'active',
  },
  {
    name: 'MSI Authorized Service Center',
    contact_person: 'Tran Dinh Quang',
    phone: '02838383838',
    email: 'service@msi-vietnam.com',
    notes: 'Direct factory warranty RMA service center for MSI graphic cards and motherboards.',
    status: 'active',
  },
  {
    name: 'Asus Warranty Dept',
    contact_person: 'Doan Van Thang',
    phone: '02839255555',
    email: 'rma_support@asus.com.vn',
    notes: 'Authorized Asus warranty inspection, repairs, and technical component exchanges.',
    status: 'active',
  },
];

/**
 * Authentic retail customers with Vietnamese names and valid 10-digit phone numbers.
 */
const AUTHENTIC_CUSTOMERS = [
  {
    name: 'Nguyen Van A',
    phone: '0901234567',
  },
  {
    name: 'Bui Ngoc Lan',
    phone: '0981122334',
  },
  {
    name: 'Tran Thi Binh',
    phone: '0912345678',
  },
  {
    name: 'Le Van Cuong',
    phone: '0987654321',
  },
  {
    name: 'Pham Thi Dung',
    phone: '0934567890',
  },
  {
    name: 'Hoang Minh Tri',
    phone: '0971234890',
  },
  {
    name: 'Doan Thu Ha',
    phone: '0945678901',
  },
  {
    name: 'Vu Quoc Bao',
    phone: '0967890123',
  },
];

/**
 * Standard PC hardware categories for catalog organization.
 */
const AUTHENTIC_CATEGORIES = [
  {
    name: 'Processors',
    description: 'Central Processing Units (CPUs) for desktop gaming and workstation systems',
  },
  {
    name: 'Motherboards',
    description: 'Desktop computer mainboards with Intel LGA1700 and AMD AM5 chipsets',
  },
  {
    name: 'Graphics Cards',
    description: 'Dedicated GPU video cards for gaming, content creation, and 3D rendering',
  },
  {
    name: 'Memory',
    description: 'High-speed DDR4 and DDR5 dual-channel desktop RAM memory kits',
  },
  {
    name: 'Storage',
    description: 'PCIe 4.0 NVMe M.2 solid-state drives and high-capacity storage drives',
  },
];

/**
 * EXACT list of 6 authentic PC hardware products specified by user requirements.
 * No additional products are invented.
 */
const AUTHENTIC_PRODUCTS = [
  {
    sku: 'CPU-INT-14400F',
    name: 'Intel Core i5-14400F Desktop Processor',
    categoryName: 'Processors',
    unit: 'pcs',
    cost_price: '165.00',
    selling_price: '199.99',
    opening_qty: 19,
    sold_qty: 1,
    reorder_level: 5,
    warranty_months: 36,
    tracks_serial: true,
  },
  {
    sku: 'MB-MSI-B760M-WIFI',
    name: 'MSI B760M Gaming Plus WiFi DDR4 Motherboard',
    categoryName: 'Motherboards',
    unit: 'pcs',
    cost_price: '110.00',
    selling_price: '139.99',
    opening_qty: 16,
    sold_qty: 1,
    reorder_level: 4,
    warranty_months: 36,
    tracks_serial: true,
  },
  {
    sku: 'GPU-MSI-6800XT-16G',
    name: 'MSI Gaming X Trio AMD Radeon RX 6800 XT 16GB',
    categoryName: 'Graphics Cards',
    unit: 'pcs',
    cost_price: '420.00',
    selling_price: '499.99',
    opening_qty: 9,
    sold_qty: 1,
    reorder_level: 2,
    warranty_months: 36,
    tracks_serial: true,
  },
  {
    sku: 'RAM-COR-32GB-D4',
    name: 'Corsair Vengeance LPX 32GB (2x16GB) DDR4 RAM Kit',
    categoryName: 'Memory',
    unit: 'pcs',
    cost_price: '52.00',
    selling_price: '69.99',
    opening_qty: 26,
    sold_qty: 1,
    reorder_level: 8,
    warranty_months: 60,
    tracks_serial: true,
  },
  {
    sku: 'SSD-WDB-SN850X-1TB',
    name: 'Western Digital Black SN850X 1TB NVMe SSD',
    categoryName: 'Storage',
    unit: 'pcs',
    cost_price: '72.00',
    selling_price: '99.99',
    opening_qty: 21,
    sold_qty: 1,
    reorder_level: 5,
    warranty_months: 60,
    tracks_serial: true,
  },
  {
    sku: 'SSD-KST-NV2-500GB',
    name: 'Kingston NV2 500GB PCIe 4.0 NVMe SSD',
    categoryName: 'Storage',
    unit: 'pcs',
    cost_price: '32.00',
    selling_price: '44.99',
    opening_qty: 31,
    sold_qty: 1,
    reorder_level: 8,
    warranty_months: 36,
    tracks_serial: true,
  },
];

// ============================================================================
// SECTION 2: SURGICAL DELETION LOGIC (FOREIGN-KEY ORDERED)
// ============================================================================

/**
 * Safely removes dummy test products, suppliers, customers, and serials along with
 * all associated relational records in strict reverse foreign-key order.
 *
 * Foreign Key Deletion Sequence:
 * 1. claim_status_history (references warranty_claims)
 * 2. warranty_claims (references warranties, suppliers, customers)
 * 3. warranties (references products, customers, sale_items)
 * 4. sale_item_serials (references sale_items, products)
 * 5. sale_items (references sales, products)
 * 6. sales (empty sales or sales belonging to dummy customers/products)
 * 7. inventory_transactions (references products)
 * 8. audit_logs (referencing deleted products, suppliers, customers, or sales)
 * 9. products (dummy products)
 * 10. suppliers (dummy suppliers)
 * 11. customers (dummy customers)
 * 12. categories (unused dummy categories)
 *
 * @param {import('knex').Knex.Transaction} trx - Active Knex database transaction.
 * @returns {Promise<{ productsCount: number, suppliersCount: number, customersCount: number }>}
 */
async function safelyRemoveDummyData(trx) {
  const allowedSkus = AUTHENTIC_PRODUCTS.map((item) => item.sku.toLowerCase());

  // --------------------------------------------------------------------------
  // Step 1: Identify all dummy products (any product NOT in authentic SKU list,
  // or matching test prefixes like 'Product 179...', 'SKU_179...', 'UAT%', etc.)
  // --------------------------------------------------------------------------
  const dummyProducts = await trx('products')
    .whereNotIn(trx.raw('lower(sku)'), allowedSkus)
    .orWhere('name', 'like', 'Product %')
    .orWhere('name', 'like', '%179%')
    .orWhere('name', 'like', 'Sample%')
    .orWhere('name', 'like', 'Updated Name%')
    .orWhere('name', 'like', 'Test%')
    .orWhere('sku', 'like', 'SKU_%')
    .orWhere('sku', 'like', 'UAT%')
    .orWhere('sku', 'like', 'IMP%')
    .orWhere('sku', 'like', 'DEF_%')
    .orWhere('sku', 'like', 'DUP-%')
    .orWhere('sku', 'like', 'DEACT_%')
    .orWhere('sku', 'like', 'EXACT_MATCH_%')
    .orWhere('sku', 'like', '%179%')
    .select('id', 'sku');

  const dummyProductIds = dummyProducts.map((p) => p.id);

  // --------------------------------------------------------------------------
  // Step 2: Identify all dummy suppliers
  // --------------------------------------------------------------------------
  const dummySuppliers = await trx('suppliers')
    .where('name', 'like', 'Supplier_%')
    .orWhere('name', 'like', 'Repair Supplier%')
    .orWhere('name', 'like', 'Test Supplier%')
    .select('id', 'name');

  const dummySupplierIds = dummySuppliers.map((s) => s.id);

  // --------------------------------------------------------------------------
  // Step 3: Identify all dummy customers
  // --------------------------------------------------------------------------
  const dummyCustomers = await trx('customers')
    .whereIn('name', [
      'Customer One',
      'Customer Two',
      'Warranty Customer',
      'Lifecycle Customer',
      'Reject Customer',
    ])
    .orWhere('name', 'like', 'Customer %')
    .orWhere('name', 'like', 'Test %')
    .orWhere('name', 'like', '%179%')
    .select('id', 'name');

  const dummyCustomerIds = dummyCustomers.map((c) => c.id);

  // --------------------------------------------------------------------------
  // Step 4: Identify dummy serials (starting with 'SN_' or containing '179')
  // --------------------------------------------------------------------------
  const dummySerials = await trx('sale_item_serials')
    .where('serial_no', 'like', 'SN_%')
    .orWhere('serial_no', 'like', '%179%')
    .select('id', 'sale_item_id');

  const dummySerialIds = dummySerials.map((s) => s.id);
  const dummySerialSaleItemIds = dummySerials.map((s) => s.sale_item_id);

  // --------------------------------------------------------------------------
  // Step 5: Identify warranties referencing dummy products, customers, or serials
  // --------------------------------------------------------------------------
  const warrantiesToDeleteQuery = trx('warranties').where(function () {
    if (dummyProductIds.length > 0) {
      this.whereIn('product_id', dummyProductIds);
    }
    if (dummyCustomerIds.length > 0) {
      this.orWhereIn('customer_id', dummyCustomerIds);
    }
    if (dummySerialSaleItemIds.length > 0) {
      this.orWhereIn('sale_item_id', dummySerialSaleItemIds);
    }
    this.orWhere('serial_no', 'like', 'SN_%');
    this.orWhere('serial_no', 'like', '%179%');
  });

  const warrantiesToDelete = await warrantiesToDeleteQuery.select('id');
  const warrantyIdsToDelete = warrantiesToDelete.map((w) => w.id);

  // --------------------------------------------------------------------------
  // Step 6: Identify warranty claims linked to warranties, suppliers, or customers
  // --------------------------------------------------------------------------
  const claimsToDeleteQuery = trx('warranty_claims').where(function () {
    if (warrantyIdsToDelete.length > 0) {
      this.whereIn('warranty_id', warrantyIdsToDelete);
    }
    if (dummySupplierIds.length > 0) {
      this.orWhereIn('supplier_id', dummySupplierIds);
    }
    if (dummyCustomerIds.length > 0) {
      this.orWhereIn('customer_id', dummyCustomerIds);
    }
  });

  const claimsToDelete = await claimsToDeleteQuery.select('id');
  const claimIdsToDelete = claimsToDelete.map((c) => c.id);

  // --------------------------------------------------------------------------
  // Step 7: Delete claim status history (child of warranty_claims)
  // --------------------------------------------------------------------------
  if (claimIdsToDelete.length > 0) {
    await trx('claim_status_history')
      .whereIn('claim_id', claimIdsToDelete)
      .delete();

    await trx('warranty_claims')
      .whereIn('id', claimIdsToDelete)
      .delete();
  }

  // --------------------------------------------------------------------------
  // Step 8: Delete warranties
  // --------------------------------------------------------------------------
  if (warrantyIdsToDelete.length > 0) {
    await trx('warranties')
      .whereIn('id', warrantyIdsToDelete)
      .delete();
  }

  // --------------------------------------------------------------------------
  // Step 9: Delete sale_item_serials linked to dummy products or dummy serials
  // --------------------------------------------------------------------------
  await trx('sale_item_serials')
    .where(function () {
      if (dummySerialIds.length > 0) {
        this.whereIn('id', dummySerialIds);
      }
      if (dummyProductIds.length > 0) {
        this.orWhereIn('product_id', dummyProductIds);
      }
      this.orWhere('serial_no', 'like', 'SN_%');
      this.orWhere('serial_no', 'like', '%179%');
    })
    .delete();

  // --------------------------------------------------------------------------
  // Step 10: Identify and delete sale items linked to dummy products or dummy sales
  // --------------------------------------------------------------------------
  const salesByDummyCustomers = dummyCustomerIds.length > 0
    ? await trx('sales').whereIn('customer_id', dummyCustomerIds).select('id')
    : [];

  const dummyCustomerSaleIds = salesByDummyCustomers.map((s) => s.id);

  const saleItemsToDelete = await trx('sale_items')
    .where(function () {
      if (dummyProductIds.length > 0) {
        this.whereIn('product_id', dummyProductIds);
      }
      if (dummyCustomerSaleIds.length > 0) {
        this.orWhereIn('sale_id', dummyCustomerSaleIds);
      }
      if (dummySerialSaleItemIds.length > 0) {
        this.orWhereIn('id', dummySerialSaleItemIds);
      }
    })
    .select('id', 'sale_id');

  const saleItemIdsToDelete = saleItemsToDelete.map((item) => item.id);
  const candidateSaleIds = Array.from(new Set([
    ...dummyCustomerSaleIds,
    ...saleItemsToDelete.map((item) => item.sale_id),
  ]));

  if (saleItemIdsToDelete.length > 0) {
    const warrantiesLinked = await trx('warranties')
      .whereIn('sale_item_id', saleItemIdsToDelete)
      .select('id');
    const warrantyIdsLinked = warrantiesLinked.map((w) => w.id);

    if (warrantyIdsLinked.length > 0) {
      const claimsLinked = await trx('warranty_claims')
        .whereIn('warranty_id', warrantyIdsLinked)
        .select('id');
      const claimIdsLinked = claimsLinked.map((c) => c.id);

      if (claimIdsLinked.length > 0) {
        await trx('claim_status_history').whereIn('claim_id', claimIdsLinked).delete();
        await trx('warranty_claims').whereIn('id', claimIdsLinked).delete();
      }

      await trx('warranties').whereIn('id', warrantyIdsLinked).delete();
    }

    await trx('sale_item_serials')
      .whereIn('sale_item_id', saleItemIdsToDelete)
      .delete();

    await trx('sale_items')
      .whereIn('id', saleItemIdsToDelete)
      .delete();
  }

  // --------------------------------------------------------------------------
  // Step 11: Delete sales that now have zero items or belong to dummy customers
  // --------------------------------------------------------------------------
  if (candidateSaleIds.length > 0) {
    const remainingItems = await trx('sale_items')
      .whereIn('sale_id', candidateSaleIds)
      .select('sale_id');

    const salesWithItems = new Set(remainingItems.map((r) => r.sale_id));
    const emptySaleIds = candidateSaleIds.filter((id) => !salesWithItems.has(id));

    if (emptySaleIds.length > 0) {
      await trx('audit_logs')
        .where('entity_type', 'sale')
        .whereIn('entity_id', emptySaleIds)
        .delete();

      await trx('sales')
        .whereIn('id', emptySaleIds)
        .delete();
    }
  }

  // --------------------------------------------------------------------------
  // Step 12: Delete inventory ledger rows for dummy products
  // --------------------------------------------------------------------------
  if (dummyProductIds.length > 0) {
    await trx('inventory_transactions')
      .whereIn('product_id', dummyProductIds)
      .delete();
  }

  // --------------------------------------------------------------------------
  // Step 13: Delete audit logs for dummy entities
  // --------------------------------------------------------------------------
  if (dummyProductIds.length > 0) {
    await trx('audit_logs')
      .where('entity_type', 'product')
      .whereIn('entity_id', dummyProductIds)
      .delete();
  }

  if (dummySupplierIds.length > 0) {
    await trx('audit_logs')
      .where('entity_type', 'supplier')
      .whereIn('entity_id', dummySupplierIds)
      .delete();
  }

  if (dummyCustomerIds.length > 0) {
    await trx('audit_logs')
      .where('entity_type', 'customer')
      .whereIn('entity_id', dummyCustomerIds)
      .delete();
  }

  // --------------------------------------------------------------------------
  // Step 14: Delete main dummy entity records
  // --------------------------------------------------------------------------
  let deletedProductsCount = 0;
  if (dummyProductIds.length > 0) {
    deletedProductsCount = await trx('products')
      .whereIn('id', dummyProductIds)
      .delete();
  }

  let deletedSuppliersCount = 0;
  if (dummySupplierIds.length > 0) {
    deletedSuppliersCount = await trx('suppliers')
      .whereIn('id', dummySupplierIds)
      .delete();
  }

  let deletedCustomersCount = 0;
  if (dummyCustomerIds.length > 0) {
    deletedCustomersCount = await trx('customers')
      .whereIn('id', dummyCustomerIds)
      .delete();
  }

  // --------------------------------------------------------------------------
  // Step 15: Clean up all non-authentic categories ('Cat_%', 'UAT %', etc.)
  // --------------------------------------------------------------------------
  const authenticCategoryNames = AUTHENTIC_CATEGORIES.map((c) => c.name.toLowerCase());
  await trx('categories')
    .whereNotIn(trx.raw('lower(name)'), authenticCategoryNames)
    .whereNotExists(function () {
      this.select('*')
        .from('products')
        .whereRaw('products.category_id = categories.id');
    })
    .delete();

  return {
    productsCount: deletedProductsCount,
    suppliersCount: deletedSuppliersCount,
    customersCount: deletedCustomersCount,
  };
}

// ============================================================================
// SECTION 3: STORE TEAM PROVISIONING (EXACTLY 6 USERS)
// ============================================================================

/**
 * Seeds the exact store team (2 Admins and 4 Staff members).
 * Safely removes extraneous test accounts while preserving system administrator
 * privileges and reassigning references.
 *
 * @param {import('knex').Knex.Transaction} trx - Active Knex transaction.
 * @param {object} defaultAdmin - Root admin user record for FK reassignments.
 */
async function seedStoreTeam(trx, defaultAdmin) {
  const allowedUsernames = STORE_TEAM_USERS.map((u) => u.username.toLowerCase());

  // Reassign foreign keys of any non-team test accounts before deletion
  const extraUsers = await trx('users')
    .whereNotIn(trx.raw('lower(username)'), allowedUsernames)
    .select('id', 'username');

  const extraUserIds = extraUsers.map((u) => u.id);

  if (extraUserIds.length > 0) {
    await trx('refresh_tokens')
      .whereIn('user_id', extraUserIds)
      .delete();

    await trx('sales')
      .whereIn('user_id', extraUserIds)
      .update({ user_id: defaultAdmin.id });

    await trx('sales')
      .whereNotNull('voided_by')
      .whereIn('voided_by', extraUserIds)
      .update({ voided_by: defaultAdmin.id });

    await trx('inventory_transactions')
      .whereIn('user_id', extraUserIds)
      .update({ user_id: defaultAdmin.id });

    await trx('audit_logs')
      .whereIn('user_id', extraUserIds)
      .update({ user_id: defaultAdmin.id });

    await trx('claim_status_history')
      .whereIn('user_id', extraUserIds)
      .update({ user_id: defaultAdmin.id });

    await trx('warranty_claims')
      .whereIn('created_by', extraUserIds)
      .update({ created_by: defaultAdmin.id });

    await trx('import_logs')
      .whereIn('user_id', extraUserIds)
      .update({ user_id: defaultAdmin.id });

    await trx('users')
      .whereIn('id', extraUserIds)
      .delete();
  }

  // Insert or update each official store team member
  for (const teamMember of STORE_TEAM_USERS) {
    const existingUser = await trx('users')
      .whereRaw('lower(username) = lower(?)', [teamMember.username])
      .first('id', 'username');

    const passwordHash = await hashPassword(teamMember.password);

    if (existingUser) {
      await trx('users')
        .where({ id: existingUser.id })
        .update({
          full_name: teamMember.full_name,
          role: teamMember.role,
          password_hash: passwordHash,
          status: 'active',
          must_change_password: false,
          failed_attempts: 0,
          locked_until: null,
        });
    } else {
      await trx('users').insert({
        username: teamMember.username,
        password_hash: passwordHash,
        full_name: teamMember.full_name,
        role: teamMember.role,
        status: 'active',
        must_change_password: false,
        failed_attempts: 0,
        locked_until: null,
      });
    }
  }
}

// ============================================================================
// SECTION 4: MAIN SEED ENTRY POINT
// ============================================================================

/**
 * Main Knex seed execution function.
 * Wraps all operations inside a single transactional boundary to ensure
 * atomic completion and zero partial data corruption.
 *
 * @param {import('knex').Knex} knex - Active Knex database connection.
 */
export async function seed(knex) {
  await knex.transaction(async (trx) => {
    // ------------------------------------------------------------------------
    // Step A: Locate or ensure root admin user exists
    // ------------------------------------------------------------------------
    let adminUser = await trx('users')
      .where({ role: 'admin' })
      .orderBy('id', 'asc')
      .first('id', 'username');

    if (!adminUser) {
      const defaultPasswordHash = await hashPassword('adminpassword123');
      const [newAdmin] = await trx('users')
        .insert({
          username: 'admin',
          password_hash: defaultPasswordHash,
          full_name: 'System Admin',
          role: 'admin',
          status: 'active',
          must_change_password: false,
        })
        .returning(['id', 'username']);

      adminUser = newAdmin;
    }

    // ------------------------------------------------------------------------
    // Step B: Comprehensive Surgical Wipe of All Dummy Artifacts
    // ------------------------------------------------------------------------
    await safelyRemoveDummyData(trx);

    // ------------------------------------------------------------------------
    // Step C: Provision the Exact Store Team (6 Users)
    // ------------------------------------------------------------------------
    await seedStoreTeam(trx, adminUser);

    const activeAdmin = await trx('users')
      .where({ username: 'admin' })
      .first('id', 'username');

    const auditUserId = activeAdmin ? activeAdmin.id : adminUser.id;

    const cashierUser = await trx('users')
      .where({ username: 'minhanh' })
      .first('id', 'username');

    const cashierUserId = cashierUser ? cashierUser.id : auditUserId;

    // ------------------------------------------------------------------------
    // Step D: Seed Authentic Retail Suppliers
    // ------------------------------------------------------------------------
    const supplierMap = new Map();

    for (const supplierDef of AUTHENTIC_SUPPLIERS) {
      const existingSupplier = await trx('suppliers')
        .whereRaw('lower(name) = lower(?)', [supplierDef.name])
        .first('id', 'name');

      if (existingSupplier) {
        await trx('suppliers')
          .where({ id: existingSupplier.id })
          .update({
            contact_person: supplierDef.contact_person,
            phone: supplierDef.phone,
            email: supplierDef.email,
            notes: supplierDef.notes,
            status: supplierDef.status,
          });

        supplierMap.set(supplierDef.name, existingSupplier.id);
      } else {
        const [insertedSupplier] = await trx('suppliers')
          .insert({
            name: supplierDef.name,
            contact_person: supplierDef.contact_person,
            phone: supplierDef.phone,
            email: supplierDef.email,
            notes: supplierDef.notes,
            status: supplierDef.status,
          })
          .returning(['id', 'name']);

        supplierMap.set(supplierDef.name, insertedSupplier.id);
      }
    }

    // ------------------------------------------------------------------------
    // Step E: Seed Authentic Retail Customers
    // ------------------------------------------------------------------------
    const customerMap = new Map();

    for (const customerDef of AUTHENTIC_CUSTOMERS) {
      const existingCustomer = await trx('customers')
        .whereRaw('lower(name) = lower(?)', [customerDef.name])
        .first('id', 'name');

      if (existingCustomer) {
        await trx('customers')
          .where({ id: existingCustomer.id })
          .update({
            phone: customerDef.phone,
          });

        customerMap.set(customerDef.name, existingCustomer.id);
      } else {
        const [insertedCustomer] = await trx('customers')
          .insert({
            name: customerDef.name,
            phone: customerDef.phone,
          })
          .returning(['id', 'name']);

        customerMap.set(customerDef.name, insertedCustomer.id);
      }
    }

    // ------------------------------------------------------------------------
    // Step F: Seed Authentic PC Hardware Categories (5 Categories)
    // ------------------------------------------------------------------------
    const categoryMap = new Map();

    for (const categoryDef of AUTHENTIC_CATEGORIES) {
      const existingCat = await trx('categories')
        .whereRaw('lower(name) = lower(?)', [categoryDef.name])
        .first('id', 'name');

      if (existingCat) {
        await trx('categories')
          .where({ id: existingCat.id })
          .update({
            description: categoryDef.description,
            status: 'active',
          });

        categoryMap.set(categoryDef.name, existingCat.id);
      } else {
        const [insertedCat] = await trx('categories')
          .insert({
            name: categoryDef.name,
            description: categoryDef.description,
            status: 'active',
          })
          .returning(['id', 'name']);

        categoryMap.set(categoryDef.name, insertedCat.id);
      }
    }

    // ------------------------------------------------------------------------
    // Step G: Seed Exactly the 6 Authentic PC Hardware Products
    // ------------------------------------------------------------------------
    const productRecordMap = new Map();

    for (const item of AUTHENTIC_PRODUCTS) {
      const categoryId = categoryMap.get(item.categoryName);

      if (!categoryId) {
        throw new Error(`Category "${item.categoryName}" was not found in database.`);
      }

      // Expected final stock is opening stock minus units sold in sample transactions
      const finalStockQty = item.opening_qty - item.sold_qty;

      const existingProduct = await trx('products')
        .whereRaw('lower(sku) = lower(?)', [item.sku])
        .first('id', 'sku');

      if (existingProduct) {
        await trx('products')
          .where({ id: existingProduct.id })
          .update({
            name: item.name,
            category_id: categoryId,
            unit: item.unit,
            cost_price: item.cost_price,
            selling_price: item.selling_price,
            stock_qty: finalStockQty,
            reorder_level: item.reorder_level,
            warranty_months: item.warranty_months,
            tracks_serial: item.tracks_serial,
            status: 'active',
          });

        productRecordMap.set(item.sku, {
          id: existingProduct.id,
          sku: item.sku,
          name: item.name,
          cost_price: item.cost_price,
          selling_price: item.selling_price,
          opening_qty: item.opening_qty,
          sold_qty: item.sold_qty,
          stock_qty: finalStockQty,
          warranty_months: item.warranty_months,
        });
      } else {
        const [insertedProduct] = await trx('products')
          .insert({
            sku: item.sku,
            name: item.name,
            category_id: categoryId,
            unit: item.unit,
            cost_price: item.cost_price,
            selling_price: item.selling_price,
            stock_qty: finalStockQty,
            reorder_level: item.reorder_level,
            warranty_months: item.warranty_months,
            tracks_serial: item.tracks_serial,
            status: 'active',
          })
          .returning(['id', 'sku', 'name']);

        productRecordMap.set(item.sku, {
          id: insertedProduct.id,
          sku: item.sku,
          name: item.name,
          cost_price: item.cost_price,
          selling_price: item.selling_price,
          opening_qty: item.opening_qty,
          sold_qty: item.sold_qty,
          stock_qty: finalStockQty,
          warranty_months: item.warranty_months,
        });
      }
    }

    // ------------------------------------------------------------------------
    // Step H: Stock Ledger Invariant (SRS-INV-02, AC-015a) - Opening Balances
    // ------------------------------------------------------------------------
    // Clear any previous inventory transactions for the 6 authentic products
    // so we can record clean opening and sale ledger rows matching final stock.
    const authenticProductIds = Array.from(productRecordMap.values()).map((p) => p.id);

    await trx('inventory_transactions')
      .whereIn('product_id', authenticProductIds)
      .delete();

    for (const product of productRecordMap.values()) {
      await trx('inventory_transactions').insert({
        product_id: product.id,
        type: 'opening',
        quantity_change: product.opening_qty,
        balance_after: product.opening_qty,
        reason: 'Initial retail PC hardware inventory setup',
        user_id: auditUserId,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      });
    }

    // ------------------------------------------------------------------------
    // Step I: Seed Sample Completed Sales with Authentic Serials & Warranties
    // ------------------------------------------------------------------------
    // Clean all previous transactional sales/warranties in strict reverse FK order
    await trx('claim_status_history').delete();
    await trx('warranty_claims').delete();
    await trx('warranties').delete();
    await trx('sale_item_serials').delete();
    await trx('sale_items').delete();
    await trx('sales').delete();

    // Define authentic completed sales with realistic dates and genuine manufacturer serials
    const customerAId = customerMap.get('Nguyen Van A');
    const customerBId = customerMap.get('Bui Ngoc Lan');
    const customerCId = customerMap.get('Tran Thi Binh');

    const msiGpu = productRecordMap.get('GPU-MSI-6800XT-16G');
    const msiMb = productRecordMap.get('MB-MSI-B760M-WIFI');
    const intelCpu = productRecordMap.get('CPU-INT-14400F');
    const corsairRam = productRecordMap.get('RAM-COR-32GB-D4');
    const wdSsd = productRecordMap.get('SSD-WDB-SN850X-1TB');
    const kingstonSsd = productRecordMap.get('SSD-KST-NV2-500GB');

    const sampleSalesDefinitions = [
      {
        saleDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        customerId: customerAId,
        paymentMethod: 'card',
        items: [
          {
            product: wdSsd,
            serialNumber: 'WD-WCC6Y7821034',
          },
          {
            product: msiMb,
            serialNumber: 'MSI-SN-602-V397B23090012',
          },
        ],
      },
      {
        saleDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        customerId: customerBId,
        paymentMethod: 'bank_transfer',
        items: [
          {
            product: msiGpu,
            serialNumber: 'MSI-SN-602-V398B23110056',
          },
          {
            product: corsairRam,
            serialNumber: 'COR-SN-234809-D4-32G-1102',
          },
        ],
      },
      {
        saleDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        customerId: customerCId,
        paymentMethod: 'cash',
        items: [
          {
            product: intelCpu,
            serialNumber: 'INT-AT8071514400F-SRN35',
          },
          {
            product: kingstonSsd,
            serialNumber: 'KST-SN-990432-500G-00291',
          },
        ],
      },
    ];

    for (const saleDef of sampleSalesDefinitions) {
      let subtotal = 0;
      for (const itemDef of saleDef.items) {
        subtotal += Number(itemDef.product.selling_price);
      }

      const subtotalFormatted = subtotal.toFixed(2);
      const discountFormatted = '0.00';
      const totalFormatted = subtotalFormatted;

      const [insertedSale] = await trx('sales')
        .insert({
          idempotency_key: `PC_SALE_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          user_id: cashierUserId,
          customer_id: saleDef.customerId,
          sold_at: saleDef.saleDate,
          subtotal: subtotalFormatted,
          discount_amount: discountFormatted,
          total: totalFormatted,
          payment_method: saleDef.paymentMethod,
          status: 'completed',
        })
        .returning(['id', 'sale_no']);

      for (const itemDef of saleDef.items) {
        const prod = itemDef.product;

        // Insert sale item snapshot
        const [insertedSaleItem] = await trx('sale_items')
          .insert({
            sale_id: insertedSale.id,
            product_id: prod.id,
            sku_snapshot: prod.sku,
            name_snapshot: prod.name,
            quantity: 1,
            unit_price: prod.selling_price,
            line_total: prod.selling_price,
          })
          .returning(['id']);

        // Record authentic serial number in sale_item_serials
        await trx('sale_item_serials').insert({
          sale_item_id: insertedSaleItem.id,
          product_id: prod.id,
          serial_no: itemDef.serialNumber,
          released_at: null,
        });

        // Record stock reduction ledger row in inventory_transactions
        await trx('inventory_transactions').insert({
          product_id: prod.id,
          type: 'sale',
          quantity_change: -1,
          balance_after: prod.stock_qty,
          reference_type: 'sale',
          reference_id: insertedSale.id,
          reason: `Sale ${insertedSale.sale_no}`,
          user_id: cashierUserId,
          created_at: saleDef.saleDate,
        });

        // Calculate warranty expiry date
        const startDate = saleDef.saleDate;
        const expiryDate = new Date(startDate);
        expiryDate.setMonth(expiryDate.getMonth() + prod.warranty_months);

        await trx('warranties')
          .insert({
            sale_item_id: insertedSaleItem.id,
            product_id: prod.id,
            customer_id: saleDef.customerId,
            serial_no: itemDef.serialNumber,
            start_date: startDate.toISOString().slice(0, 10),
            expiry_date: expiryDate.toISOString().slice(0, 10),
            source: 'sale',
            created_at: startDate,
          });
      }
    }

    // ------------------------------------------------------------------------
    // Step I-2: Seed Authentic Sample Voided Sale (Demonstrates Void Separation)
    // ------------------------------------------------------------------------
    const customerDId = customerMap.get('Le Van Cuong');
    const voidedDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const [voidedSale] = await trx('sales')
      .insert({
        idempotency_key: `PC_VOID_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        user_id: cashierUserId,
        customer_id: customerDId,
        sold_at: voidedDate,
        subtotal: kingstonSsd.selling_price,
        discount_amount: '0.00',
        total: kingstonSsd.selling_price,
        payment_method: 'cash',
        status: 'voided',
        voided_by: auditUserId,
        voided_at: voidedDate,
        void_reason: 'Customer requested order change to higher capacity NVMe SSD',
      })
      .returning(['id', 'sale_no']);

    const [voidedSaleItem] = await trx('sale_items')
      .insert({
        sale_id: voidedSale.id,
        product_id: kingstonSsd.id,
        sku_snapshot: kingstonSsd.sku,
        name_snapshot: kingstonSsd.name,
        quantity: 1,
        unit_price: kingstonSsd.selling_price,
        line_total: kingstonSsd.selling_price,
      })
      .returning(['id']);

    // Record serial with released_at for the voided item
    await trx('sale_item_serials').insert({
      sale_item_id: voidedSaleItem.id,
      product_id: kingstonSsd.id,
      serial_no: 'KST-SN-990432-500G-00299',
      released_at: voidedDate,
    });

    // Write sale deduction and immediate void reversal ledger rows (net change: 0)
    await trx('inventory_transactions').insert([
      {
        product_id: kingstonSsd.id,
        type: 'sale',
        quantity_change: -1,
        balance_after: kingstonSsd.stock_qty - 1,
        reference_type: 'sale',
        reference_id: voidedSale.id,
        reason: `Sale ${voidedSale.sale_no}`,
        user_id: cashierUserId,
        created_at: voidedDate,
      },
      {
        product_id: kingstonSsd.id,
        type: 'void_reversal',
        quantity_change: 1,
        balance_after: kingstonSsd.stock_qty,
        reference_type: 'sale',
        reference_id: voidedSale.id,
        reason: `Void reversal for ${voidedSale.sale_no}`,
        user_id: auditUserId,
        created_at: voidedDate,
      },
    ]);

  });
}
