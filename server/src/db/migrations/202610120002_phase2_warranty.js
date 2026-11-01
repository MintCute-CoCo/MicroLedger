/**
 * ============================================================================
 * MicroLedger Phase 2 Migration: Warranty, Serials, Claims, and Suppliers
 * ============================================================================
 *
 * PURPOSE:
 * Implements Phase 2 schema from docs/architecture/DATABASE_DESIGN.md:
 * - `sale_item_serials`: Tracks hardware serial numbers per sale line.
 * - `suppliers`: Retail distributor directory and RMA contacts.
 * - `warranties`: Product warranty policies, serial associations, and date limits.
 * - `warranty_claims`: 7-status warranty lifecycle ticket tracking.
 * - `claim_status_history`: Immutable timeline log of claim transitions.
 */

/**
 * Creates Phase 2 warranty, claims, serials, and supplier tables.
 *
 * @param {import('knex').Knex} knex - Knex query builder client.
 * @returns {Promise<void>} Resolves when tables and sequences are created.
 */
export async function up(knex) {
  await knex.raw(`
    CREATE TABLE sale_item_serials (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      sale_item_id BIGINT NOT NULL REFERENCES sale_items(id),
      product_id BIGINT NOT NULL REFERENCES products(id),
      serial_no VARCHAR(100) NOT NULL,
      released_at TIMESTAMPTZ
    );
    CREATE UNIQUE INDEX serial_active_uq ON sale_item_serials (product_id, serial_no) WHERE released_at IS NULL;

    CREATE TABLE suppliers (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      contact_person VARCHAR(100),
      phone VARCHAR(30), email VARCHAR(150), notes TEXT,
      status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive'))
    );
    CREATE UNIQUE INDEX suppliers_name_uq ON suppliers (lower(name));

    CREATE TABLE warranties (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      sale_item_id BIGINT REFERENCES sale_items(id),
      product_id BIGINT NOT NULL REFERENCES products(id),
      customer_id BIGINT REFERENCES customers(id),
      serial_no VARCHAR(100), start_date DATE NOT NULL, expiry_date DATE NOT NULL,
      source VARCHAR(10) NOT NULL CHECK (source IN ('sale','manual')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT warranties_dates_ck CHECK (expiry_date >= start_date)
    );
    CREATE INDEX warranties_customer_idx ON warranties (customer_id);
    CREATE INDEX warranties_product_idx ON warranties (product_id);
    CREATE INDEX warranties_expiry_idx ON warranties (expiry_date);

    CREATE SEQUENCE claim_no_seq;
    CREATE TABLE warranty_claims (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      claim_no VARCHAR(20) NOT NULL UNIQUE DEFAULT ('C-' || lpad(nextval('claim_no_seq')::text, 6, '0')),
      warranty_id BIGINT NOT NULL REFERENCES warranties(id), customer_id BIGINT NOT NULL REFERENCES customers(id),
      claim_date DATE NOT NULL, problem VARCHAR(1000) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted','With Supplier','Returned','Ready for Customer','Completed','Rejected','Cancelled')),
      supplier_id BIGINT REFERENCES suppliers(id), sent_date DATE, expected_return_date DATE, actual_return_date DATE, collected_date DATE,
      resolution VARCHAR(15) CHECK (resolution IN ('repaired','replaced','cannot_repair','other')),
      out_of_warranty_note TEXT, notes TEXT, created_by BIGINT NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT claims_expected_ck CHECK (expected_return_date IS NULL OR sent_date IS NULL OR expected_return_date >= sent_date),
      CONSTRAINT claims_actual_ck CHECK (actual_return_date IS NULL OR sent_date IS NULL OR actual_return_date >= sent_date)
    );
    CREATE INDEX claims_status_due_idx ON warranty_claims (status, expected_return_date);

    CREATE TABLE claim_status_history (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, claim_id BIGINT NOT NULL REFERENCES warranty_claims(id),
      from_status VARCHAR(20), to_status VARCHAR(20) NOT NULL, user_id BIGINT NOT NULL REFERENCES users(id),
      note VARCHAR(255), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX claim_history_claim_idx ON claim_status_history (claim_id);
  `);
}

/**
 * Drops Phase 2 warranty, claims, serials, and supplier tables and sequences.
 *
 * @param {import('knex').Knex} knex - Knex query builder client.
 * @returns {Promise<void>} Resolves when Phase 2 tables and sequences are dropped.
 */
export async function down(knex) {
  await knex.raw(`DROP TABLE IF EXISTS claim_status_history, warranty_claims, warranties, suppliers, sale_item_serials CASCADE; DROP SEQUENCE IF EXISTS claim_no_seq;`);
}
