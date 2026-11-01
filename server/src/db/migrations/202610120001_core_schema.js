/** Phase 1 schema from docs/DATABASE_DESIGN.md. */
export async function up(knex) {
  await knex.raw(`
    CREATE EXTENSION IF NOT EXISTS pg_trgm;

    CREATE TABLE users (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      username VARCHAR(50) NOT NULL,
      password_hash TEXT NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      role VARCHAR(10) NOT NULL CHECK (role IN ('admin','staff')),
      status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
      must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
      failed_attempts INT NOT NULL DEFAULT 0,
      locked_until TIMESTAMPTZ,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX users_username_uq ON users (lower(username));

    CREATE TABLE refresh_tokens (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id),
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);

    CREATE TABLE categories (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description VARCHAR(255),
      status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive'))
    );
    CREATE UNIQUE INDEX categories_name_uq ON categories (lower(name));

    CREATE TABLE products (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      sku VARCHAR(50) NOT NULL,
      name VARCHAR(200) NOT NULL,
      category_id BIGINT NOT NULL REFERENCES categories(id),
      unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
      cost_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
      selling_price NUMERIC(12,2) NOT NULL CHECK (selling_price >= 0),
      stock_qty INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
      reorder_level INT NOT NULL DEFAULT 5 CHECK (reorder_level >= 0),
      warranty_months INT NOT NULL DEFAULT 0 CHECK (warranty_months BETWEEN 0 AND 120),
      tracks_serial BOOLEAN NOT NULL DEFAULT FALSE,
      status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX products_sku_active_uq ON products (lower(sku)) WHERE status = 'active';
    CREATE INDEX products_category_idx ON products (category_id);
    CREATE INDEX products_name_trgm ON products USING gin (name gin_trgm_ops);
    CREATE INDEX products_sku_trgm ON products USING gin (sku gin_trgm_ops);

    CREATE TABLE customers (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(30),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX customers_phone_idx ON customers (phone);
    CREATE INDEX customers_name_trgm ON customers USING gin (name gin_trgm_ops);

    CREATE SEQUENCE sale_no_seq;
    CREATE TABLE sales (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      sale_no VARCHAR(20) NOT NULL UNIQUE DEFAULT ('S-' || lpad(nextval('sale_no_seq')::text, 6, '0')),
      idempotency_key VARCHAR(64) NOT NULL UNIQUE,
      user_id BIGINT NOT NULL REFERENCES users(id),
      customer_id BIGINT REFERENCES customers(id),
      sold_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
      discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      total NUMERIC(12,2) NOT NULL,
      payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash','card','bank_transfer','other')),
      status VARCHAR(10) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','voided')),
      voided_by BIGINT REFERENCES users(id),
      voided_at TIMESTAMPTZ,
      void_reason VARCHAR(255),
      CONSTRAINT sales_discount_ck CHECK (discount_amount >= 0 AND discount_amount <= subtotal),
      CONSTRAINT sales_total_ck CHECK (total = subtotal - discount_amount),
      CONSTRAINT sales_void_ck CHECK (
        (status = 'voided' AND voided_by IS NOT NULL AND voided_at IS NOT NULL AND void_reason IS NOT NULL)
        OR (status = 'completed' AND voided_by IS NULL AND voided_at IS NULL AND void_reason IS NULL))
    );
    CREATE INDEX sales_sold_at_idx ON sales (sold_at);
    CREATE INDEX sales_customer_idx ON sales (customer_id);

    CREATE TABLE sale_items (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      sale_id BIGINT NOT NULL REFERENCES sales(id),
      product_id BIGINT NOT NULL REFERENCES products(id),
      sku_snapshot VARCHAR(50) NOT NULL,
      name_snapshot VARCHAR(200) NOT NULL,
      quantity INT NOT NULL CHECK (quantity > 0),
      unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
      line_total NUMERIC(12,2) NOT NULL,
      CONSTRAINT sale_items_total_ck CHECK (line_total = quantity * unit_price)
    );
    CREATE INDEX sale_items_sale_idx ON sale_items (sale_id);
    CREATE INDEX sale_items_product_idx ON sale_items (product_id);

    CREATE TABLE inventory_transactions (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      product_id BIGINT NOT NULL REFERENCES products(id),
      type VARCHAR(15) NOT NULL CHECK (type IN ('opening','stock_in','adjustment','sale','void_reversal')),
      quantity_change INT NOT NULL CHECK (quantity_change <> 0),
      balance_after INT NOT NULL CHECK (balance_after >= 0),
      reason VARCHAR(255),
      reference_type VARCHAR(20),
      reference_id BIGINT,
      user_id BIGINT NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT inv_reason_ck CHECK (type <> 'adjustment' OR reason IS NOT NULL)
    );
    CREATE INDEX inv_tx_product_idx ON inventory_transactions (product_id, created_at);

    CREATE TABLE import_logs (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id),
      filename VARCHAR(255) NOT NULL,
      file_type VARCHAR(5) NOT NULL CHECK (file_type IN ('xlsx','csv')),
      rows_total INT NOT NULL,
      rows_valid INT NOT NULL,
      rows_error INT NOT NULL,
      status VARCHAR(12) NOT NULL CHECK (status IN ('previewed','committed','cancelled','expired','failed')),
      payload JSONB,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      committed_at TIMESTAMPTZ
    );

    CREATE TABLE audit_logs (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id BIGINT REFERENCES users(id),
      action VARCHAR(50) NOT NULL,
      entity_type VARCHAR(30),
      entity_id BIGINT,
      details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX audit_created_idx ON audit_logs (created_at);
    CREATE INDEX audit_user_idx ON audit_logs (user_id);
    CREATE INDEX audit_action_idx ON audit_logs (action);

    CREATE TABLE settings (key VARCHAR(50) PRIMARY KEY, value JSONB NOT NULL);
    INSERT INTO settings (key, value) VALUES
      ('currency_code', '"USD"'), ('currency_decimals', '2'), ('time_zone', '"UTC"');
  `);
}

/**
 * Drops all Phase 1 core tables and sequences.
 *
 * @param {import('knex').Knex} knex - Knex query builder client.
 * @returns {Promise<void>} Resolves when tables and sequences are dropped.
 */
export async function down(knex) {
  await knex.raw(`
    DROP TABLE IF EXISTS settings, audit_logs, import_logs, inventory_transactions,
      sale_items, sales, customers, products, categories, refresh_tokens, users CASCADE;
    DROP SEQUENCE IF EXISTS sale_no_seq;
  `);
}
