-- Micro app initial schema. PostgreSQL is the source of truth.
-- Keep money in NUMERIC, never floating-point. All sale totals retain snapshots.
CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  display_name text NOT NULL CHECK (length(trim(display_name)) > 0),
  password_hash text,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'cashier', 'inventory')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX app_users_email_lower_uq ON app_users (lower(email));

CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  contact_name text,
  phone text,
  email text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE CHECK (length(trim(sku)) > 0),
  barcode text UNIQUE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  description text,
  unit text NOT NULL DEFAULT 'unidad' CHECK (length(trim(unit)) > 0),
  cost_usd numeric(14,4) NOT NULL DEFAULT 0 CHECK (cost_usd >= 0),
  price_usd numeric(14,4) NOT NULL CHECK (price_usd >= 0),
  stock_quantity numeric(14,3) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  minimum_stock numeric(14,3) NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (barcode IS NULL OR length(trim(barcode)) > 0)
);
CREATE INDEX products_name_lower_idx ON products (lower(name));
CREATE INDEX products_stock_alert_idx ON products (stock_quantity, minimum_stock) WHERE is_active;

CREATE TABLE exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency char(3) NOT NULL DEFAULT 'USD' CHECK (base_currency = 'USD'),
  quote_currency char(3) NOT NULL DEFAULT 'VES' CHECK (quote_currency = 'VES'),
  rate numeric(14,6) NOT NULL CHECK (rate > 0),
  source text NOT NULL CHECK (length(trim(source)) > 0),
  effective_date date NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  validation_status text NOT NULL DEFAULT 'valid' CHECK (validation_status IN ('valid', 'stale')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, effective_date)
);
CREATE INDEX exchange_rates_effective_date_idx ON exchange_rates (effective_date DESC, fetched_at DESC);

CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  idempotency_key text NOT NULL UNIQUE CHECK (length(trim(idempotency_key)) > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'void', 'refunded')),
  subtotal_usd numeric(14,4) NOT NULL DEFAULT 0 CHECK (subtotal_usd >= 0),
  discount_usd numeric(14,4) NOT NULL DEFAULT 0 CHECK (discount_usd >= 0),
  total_usd numeric(14,4) NOT NULL DEFAULT 0 CHECK (total_usd >= 0),
  exchange_rate_id uuid REFERENCES exchange_rates(id) ON DELETE RESTRICT,
  exchange_rate_snapshot numeric(14,6) CHECK (exchange_rate_snapshot IS NULL OR exchange_rate_snapshot > 0),
  total_ves_snapshot numeric(16,2) CHECK (total_ves_snapshot IS NULL OR total_ves_snapshot >= 0),
  created_by uuid REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (discount_usd <= subtotal_usd),
  CHECK (total_usd = subtotal_usd - discount_usd),
  CHECK (status <> 'completed' OR (completed_at IS NOT NULL AND exchange_rate_id IS NOT NULL AND exchange_rate_snapshot IS NOT NULL AND total_ves_snapshot IS NOT NULL))
);
CREATE INDEX sales_created_at_idx ON sales (created_at DESC);
CREATE INDEX sales_status_idx ON sales (status, created_at DESC);

CREATE TABLE sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT,
  product_name_snapshot text NOT NULL CHECK (length(trim(product_name_snapshot)) > 0),
  sku_snapshot text NOT NULL,
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  unit_price_usd numeric(14,4) NOT NULL CHECK (unit_price_usd >= 0),
  unit_cost_usd numeric(14,4) NOT NULL CHECK (unit_cost_usd >= 0),
  line_total_usd numeric(14,4) NOT NULL CHECK (line_total_usd >= 0),
  line_total_ves numeric(16,2) NOT NULL CHECK (line_total_ves >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sale_items_sale_id_idx ON sale_items (sale_id);
CREATE INDEX sale_items_product_id_idx ON sale_items (product_id);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  method text NOT NULL CHECK (method IN ('cash', 'card', 'transfer', 'mobile_payment', 'other')),
  currency char(3) NOT NULL CHECK (currency IN ('USD', 'VES')),
  amount numeric(14,4) NOT NULL CHECK (amount > 0),
  usd_equivalent_snapshot numeric(14,4) NOT NULL CHECK (usd_equivalent_snapshot >= 0),
  exchange_rate_snapshot numeric(14,6) CHECK (exchange_rate_snapshot IS NULL OR exchange_rate_snapshot > 0),
  reference text,
  received_by uuid REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_sale_id_idx ON payments (sale_id);

CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type text NOT NULL CHECK (movement_type IN ('opening', 'purchase', 'sale', 'return', 'adjustment', 'void_reversal')),
  quantity_delta numeric(14,3) NOT NULL CHECK (quantity_delta <> 0),
  unit_cost_usd numeric(14,4) CHECK (unit_cost_usd IS NULL OR unit_cost_usd >= 0),
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  reference_type text,
  reference_id uuid,
  created_by uuid REFERENCES app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_movements_product_date_idx ON inventory_movements (product_id, created_at DESC);
CREATE INDEX inventory_movements_reference_idx ON inventory_movements (reference_type, reference_id);

CREATE TABLE audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid REFERENCES app_users(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (length(trim(action)) > 0),
  entity_type text NOT NULL CHECK (length(trim(entity_type)) > 0),
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at DESC);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
