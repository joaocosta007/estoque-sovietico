-- PostgreSQL 16+. Valores monetários usam NUMERIC; nunca FLOAT.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE product_kind AS ENUM ('stock', 'kit', 'service');
CREATE TYPE movement_type AS ENUM (
  'purchase_in', 'sale_out', 'production_in', 'production_out',
  'adjustment_in', 'adjustment_out', 'return_in', 'return_out'
);
CREATE TYPE document_status AS ENUM ('draft', 'completed', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'pix', 'card', 'bank_transfer', 'credit');
CREATE TYPE finance_status AS ENUM ('open', 'partial', 'paid', 'overdue', 'cancelled');

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  email VARCHAR(254) NOT NULL,
  name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

-- RBAC: permissão = ação atômica; papéis são conjuntos editáveis pelo administrador.
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE, -- ex.: products.view_cost, sales.cancel
  module VARCHAR(40) NOT NULL,
  description VARCHAR(180) NOT NULL
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(80) NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (organization_id, name)
);

CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Exceções permitem granularidade por funcionário sem duplicar papéis.
CREATE TABLE user_permission_overrides (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL,
  PRIMARY KEY (user_id, permission_id)
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  parent_id UUID REFERENCES categories(id),
  name VARCHAR(100) NOT NULL,
  UNIQUE (organization_id, name)
);

CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  code VARCHAR(12) NOT NULL,
  name VARCHAR(50) NOT NULL,
  decimal_places SMALLINT NOT NULL DEFAULT 3 CHECK (decimal_places BETWEEN 0 AND 6),
  UNIQUE (organization_id, code)
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(160) NOT NULL,
  document VARCHAR(32),
  phone VARCHAR(30),
  email VARCHAR(254),
  lead_time_days INTEGER NOT NULL DEFAULT 0 CHECK (lead_time_days >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE NULLS NOT DISTINCT (organization_id, document)
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  category_id UUID REFERENCES categories(id),
  stock_unit_id UUID NOT NULL REFERENCES units(id),
  preferred_supplier_id UUID REFERENCES suppliers(id),
  sku VARCHAR(64) NOT NULL,
  barcode VARCHAR(64),
  name VARCHAR(160) NOT NULL,
  kind product_kind NOT NULL DEFAULT 'stock',
  sale_price NUMERIC(14,2) NOT NULL CHECK (sale_price >= 0),
  min_stock NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  target_stock NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (target_stock >= min_stock),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, sku),
  UNIQUE NULLS NOT DISTINCT (organization_id, barcode)
);

-- Conversões de compra/venda: 1 CX = factor_to_stock_unit UN, por exemplo.
CREATE TABLE product_units (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id),
  factor_to_stock_unit NUMERIC(14,6) NOT NULL CHECK (factor_to_stock_unit > 0),
  is_purchase_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_sale_default BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (product_id, unit_id)
);

CREATE TABLE supplier_products (
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_sku VARCHAR(80),
  last_cost NUMERIC(14,4),
  min_order_quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  PRIMARY KEY (supplier_id, product_id)
);

-- Um kit é também um produto. A aplicação impede ciclos A -> B -> A.
CREATE TABLE kit_components (
  kit_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  component_product_id UUID NOT NULL REFERENCES products(id),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  waste_percentage NUMERIC(6,3) NOT NULL DEFAULT 0 CHECK (waste_percentage BETWEEN 0 AND 100),
  PRIMARY KEY (kit_product_id, component_product_id),
  CHECK (kit_product_id <> component_product_id)
);

CREATE TABLE stock_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  product_id UUID NOT NULL REFERENCES products(id),
  supplier_id UUID REFERENCES suppliers(id),
  lot_code VARCHAR(80) NOT NULL,
  quantity_received NUMERIC(14,3) NOT NULL CHECK (quantity_received > 0),
  quantity_available NUMERIC(14,3) NOT NULL CHECK (quantity_available >= 0),
  unit_cost NUMERIC(14,4) NOT NULL CHECK (unit_cost >= 0),
  manufactured_at DATE,
  expires_at DATE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, product_id, lot_code),
  CHECK (quantity_available <= quantity_received)
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(160) NOT NULL,
  document VARCHAR(32),
  phone VARCHAR(30),
  email VARCHAR(254),
  credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE NULLS NOT DISTINCT (organization_id, document)
);

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  customer_id UUID REFERENCES customers(id),
  operator_id UUID NOT NULL REFERENCES users(id),
  status document_status NOT NULL DEFAULT 'completed',
  subtotal NUMERIC(14,2) NOT NULL,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  CHECK (subtotal >= 0 AND discount >= 0 AND total >= 0),
  CHECK (total = subtotal - discount)
);

CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  unit_id UUID NOT NULL REFERENCES units(id),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost NUMERIC(14,4) NOT NULL CHECK (unit_cost >= 0),
  total NUMERIC(14,2) NOT NULL CHECK (total >= 0)
);

-- Razão de estoque append-only. Correções geram contrapartida, nunca UPDATE/DELETE.
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  product_id UUID NOT NULL REFERENCES products(id),
  batch_id UUID REFERENCES stock_batches(id),
  sale_id UUID REFERENCES sales(id),
  operator_id UUID NOT NULL REFERENCES users(id),
  type movement_type NOT NULL,
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity <> 0),
  unit_cost NUMERIC(14,4) NOT NULL CHECK (unit_cost >= 0),
  reason VARCHAR(180),
  idempotency_key VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (organization_id, idempotency_key)
);

CREATE TABLE cash_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(80) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (organization_id, name)
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  sale_id UUID NOT NULL REFERENCES sales(id),
  method payment_method NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  installments SMALLINT NOT NULL DEFAULT 1 CHECK (installments BETWEEN 1 AND 24),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cash_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  cash_account_id UUID REFERENCES cash_accounts(id),
  sale_id UUID REFERENCES sales(id),
  operator_id UUID NOT NULL REFERENCES users(id),
  entry_type VARCHAR(16) NOT NULL CHECK (entry_type IN ('income', 'expense')),
  category VARCHAR(80),
  description VARCHAR(180) NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  sale_id UUID REFERENCES sales(id),
  installment_number SMALLINT NOT NULL DEFAULT 1,
  original_amount NUMERIC(14,2) NOT NULL CHECK (original_amount > 0),
  open_amount NUMERIC(14,2) NOT NULL CHECK (open_amount >= 0),
  due_date DATE NOT NULL,
  status finance_status NOT NULL DEFAULT 'open',
  UNIQUE (sale_id, installment_number)
);

CREATE TABLE payable_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  supplier_id UUID REFERENCES suppliers(id),
  description VARCHAR(180) NOT NULL,
  category VARCHAR(80) NOT NULL,
  original_amount NUMERIC(14,2) NOT NULL CHECK (original_amount > 0),
  open_amount NUMERIC(14,2) NOT NULL CHECK (open_amount >= 0),
  installment_number SMALLINT NOT NULL DEFAULT 1,
  due_date DATE NOT NULL,
  status finance_status NOT NULL DEFAULT 'open',
  created_by UUID NOT NULL REFERENCES users(id)
);

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  customer_id UUID REFERENCES customers(id),
  operator_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  valid_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  total NUMERIC(14,2) NOT NULL CHECK (total >= 0)
);

-- Tokens externos: guardar somente o hash; scopes reutilizam os códigos de permissions.
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_by UUID NOT NULL REFERENCES users(id),
  name VARCHAR(80) NOT NULL,
  key_prefix VARCHAR(12) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  actor_user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(80),
  before_data JSONB,
  after_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE saved_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(100) NOT NULL,
  description VARCHAR(240),
  -- DSL/consulta parametrizada validada; nunca SQL arbitrário vindo do navegador.
  metric_definition JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  UNIQUE (organization_id, name)
);

CREATE INDEX idx_products_search ON products (organization_id, active, name);
CREATE INDEX idx_batches_fifo ON stock_batches
  (organization_id, product_id, expires_at NULLS LAST, received_at)
  WHERE quantity_available > 0;
CREATE INDEX idx_movements_history ON stock_movements
  (organization_id, product_id, created_at DESC);
CREATE INDEX idx_sales_period ON sales (organization_id, created_at DESC)
  WHERE status = 'completed';
CREATE INDEX idx_receivables_collection ON receivables
  (organization_id, status, due_date);
CREATE INDEX idx_audit_entity ON audit_log
  (organization_id, entity_type, entity_id, created_at DESC);

CREATE VIEW current_stock AS
SELECT organization_id, product_id, SUM(quantity_available) AS quantity
FROM stock_batches
GROUP BY organization_id, product_id;

CREATE VIEW customer_balances AS
SELECT organization_id, customer_id, SUM(open_amount) AS open_balance
FROM receivables
WHERE status IN ('open', 'partial', 'overdue')
GROUP BY organization_id, customer_id;

