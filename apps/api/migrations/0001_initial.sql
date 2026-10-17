-- Micro app initial schema with enforced tenant boundaries.
-- PostgreSQL is the source of truth. Monetary values use NUMERIC, never floating-point.
-- This migration has not been applied to Neon main. Review and test on an isolated branch first.

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (length(trim(email)) > 0),
  display_name text NOT NULL CHECK (length(trim(display_name)) > 0),
  password_hash text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX app_users_email_lower_uq ON app_users (lower(email));

CREATE TABLE organization_members (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'cashier', 'inventory')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);
CREATE INDEX organization_members_user_idx ON organization_members (user_id, is_active);

CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  contact_name text,
  phone text,
  email text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id)
);
CREATE INDEX suppliers_org_name_lower_idx ON suppliers (organization_id, lower(name));

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  sku text NOT NULL CHECK (length(trim(sku)) > 0),
  barcode text,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  description text,
  unit text NOT NULL DEFAULT 'unidad' CHECK (length(trim(unit)) > 0),
  cost_usd numeric(14,4) NOT NULL DEFAULT 0 CHECK (cost_usd >= 0),
  price_usd numeric(14,4) NOT NULL CHECK (price_usd >= 0),
  stock_quantity numeric(14,3) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  minimum_stock numeric(14,3) NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  supplier_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, sku),
  UNIQUE (organization_id, barcode),
  FOREIGN KEY (organization_id, supplier_id)
    REFERENCES suppliers (organization_id, id) ON DELETE RESTRICT,
  CHECK (barcode IS NULL OR length(trim(barcode)) > 0)
);
CREATE INDEX products_org_name_lower_idx ON products (organization_id, lower(name));
CREATE INDEX products_org_stock_alert_idx ON products (organization_id, stock_quantity, minimum_stock) WHERE is_active;

-- BCV exchange rates are source data shared by all organizations; every sale keeps a snapshot.
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
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  sale_number bigint GENERATED ALWAYS AS IDENTITY,
  idempotency_key text NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'void', 'refunded')),
  subtotal_usd numeric(14,4) NOT NULL DEFAULT 0 CHECK (subtotal_usd >= 0),
  discount_usd numeric(14,4) NOT NULL DEFAULT 0 CHECK (discount_usd >= 0),
  total_usd numeric(14,4) NOT NULL DEFAULT 0 CHECK (total_usd >= 0),
  exchange_rate_id uuid REFERENCES exchange_rates(id) ON DELETE RESTRICT,
  exchange_rate_snapshot numeric(14,6) CHECK (exchange_rate_snapshot IS NULL OR exchange_rate_snapshot > 0),
  total_ves_snapshot numeric(16,2) CHECK (total_ves_snapshot IS NULL OR total_ves_snapshot >= 0),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, sale_number),
  UNIQUE (organization_id, idempotency_key),
  FOREIGN KEY (organization_id, created_by)
    REFERENCES organization_members (organization_id, user_id) ON DELETE RESTRICT,
  CHECK (discount_usd <= subtotal_usd),
  CHECK (total_usd = subtotal_usd - discount_usd),
  CHECK (status <> 'completed' OR (
    completed_at IS NOT NULL AND exchange_rate_id IS NOT NULL
    AND exchange_rate_snapshot IS NOT NULL AND total_ves_snapshot IS NOT NULL
  ))
);
CREATE INDEX sales_org_created_at_idx ON sales (organization_id, created_at DESC);
CREATE INDEX sales_org_status_idx ON sales (organization_id, status, created_at DESC);

CREATE TABLE sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  sale_id uuid NOT NULL,
  product_id uuid,
  product_name_snapshot text NOT NULL CHECK (length(trim(product_name_snapshot)) > 0),
  sku_snapshot text NOT NULL,
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  unit_price_usd numeric(14,4) NOT NULL CHECK (unit_price_usd >= 0),
  unit_cost_usd numeric(14,4) NOT NULL CHECK (unit_cost_usd >= 0),
  line_total_usd numeric(14,4) NOT NULL CHECK (line_total_usd >= 0),
  line_total_ves numeric(16,2) NOT NULL CHECK (line_total_ves >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, sale_id)
    REFERENCES sales (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, product_id)
    REFERENCES products (organization_id, id) ON DELETE RESTRICT
);
CREATE INDEX sale_items_org_sale_idx ON sale_items (organization_id, sale_id);
CREATE INDEX sale_items_org_product_idx ON sale_items (organization_id, product_id);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  sale_id uuid NOT NULL,
  method text NOT NULL CHECK (method IN ('cash', 'card', 'transfer', 'mobile_payment', 'other')),
  currency char(3) NOT NULL CHECK (currency IN ('USD', 'VES')),
  amount numeric(14,4) NOT NULL CHECK (amount > 0),
  usd_equivalent_snapshot numeric(14,4) NOT NULL CHECK (usd_equivalent_snapshot >= 0),
  exchange_rate_snapshot numeric(14,6) CHECK (exchange_rate_snapshot IS NULL OR exchange_rate_snapshot > 0),
  reference text,
  received_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, sale_id)
    REFERENCES sales (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, received_by)
    REFERENCES organization_members (organization_id, user_id) ON DELETE RESTRICT
);
CREATE INDEX payments_org_sale_idx ON payments (organization_id, sale_id);

CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  product_id uuid NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('opening', 'purchase', 'sale', 'return', 'adjustment', 'void_reversal')),
  quantity_delta numeric(14,3) NOT NULL CHECK (quantity_delta <> 0),
  unit_cost_usd numeric(14,4) CHECK (unit_cost_usd IS NULL OR unit_cost_usd >= 0),
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  reference_type text,
  reference_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, product_id)
    REFERENCES products (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, created_by)
    REFERENCES organization_members (organization_id, user_id) ON DELETE RESTRICT
);
CREATE INDEX inventory_movements_org_product_date_idx ON inventory_movements (organization_id, product_id, created_at DESC);
CREATE INDEX inventory_movements_org_reference_idx ON inventory_movements (organization_id, reference_type, reference_id);

CREATE TABLE audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  actor_user_id uuid,
  action text NOT NULL CHECK (length(trim(action)) > 0),
  entity_type text NOT NULL CHECK (length(trim(entity_type)) > 0),
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, actor_user_id)
    REFERENCES organization_members (organization_id, user_id) ON DELETE RESTRICT
);
CREATE INDEX audit_logs_org_created_at_idx ON audit_logs (organization_id, created_at DESC);
CREATE INDEX audit_logs_org_entity_idx ON audit_logs (organization_id, entity_type, entity_id);
