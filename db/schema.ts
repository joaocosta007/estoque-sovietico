import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    sku: text("sku").notNull(),
    barcode: text("barcode"),
    name: text("name").notNull(),
    photoUrl: text("photo_url"),
    salePriceCents: integer("sale_price_cents").notNull(),
    stockMilli: integer("stock_milli").notNull().default(0),
    minStockMilli: integer("min_stock_milli").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("products_sku_unique").on(table.sku),
    uniqueIndex("products_barcode_unique").on(table.barcode),
    index("products_active_name_idx").on(table.active, table.name),
  ],
);

export const customers = sqliteTable(
  "customers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull().default(""),
    document: text("document").notNull().default(""),
    creditLimitCents: integer("credit_limit_cents").notNull().default(0),
    notes: text("notes").notNull().default(""),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("customers_active_name_idx").on(table.active, table.name)],
);

export const sales = sqliteTable(
  "sales",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id").references(() => customers.id),
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    paymentMethod: text("payment_method").notNull(),
    status: text("status").notNull().default("completed"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("sales_created_at_idx").on(table.createdAt)],
);

export const customerLedger = sqliteTable(
  "customer_ledger",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    type: text("type").notNull(),
    amountCents: integer("amount_cents").notNull(),
    description: text("description").notNull(),
    saleId: text("sale_id").references(() => sales.id),
    dueDate: text("due_date"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("customer_ledger_customer_created_idx").on(
      table.customerId,
      table.createdAt,
    ),
  ],
);

export const saleItems = sqliteTable(
  "sale_items",
  {
    id: text("id").primaryKey(),
    saleId: text("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    productName: text("product_name").notNull(),
    quantityMilli: integer("quantity_milli").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (table) => [index("sale_items_sale_idx").on(table.saleId)],
);

export const stockMovements = sqliteTable(
  "stock_movements",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    type: text("type").notNull(),
    quantityMilli: integer("quantity_milli").notNull(),
    referenceId: text("reference_id"),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("stock_movements_product_created_idx").on(
      table.productId,
      table.createdAt,
    ),
  ],
);

// Linhas efêmeras usadas dentro do batch de venda para forçar rollback quando
// o saldo é insuficiente. Cada guarda é removida no fim da mesma transação.
export const saleGuards = sqliteTable(
  "sale_guards",
  {
    id: text("id").primaryKey(),
    ok: integer("ok").notNull(),
  },
  (table) => [check("sale_guards_ok", sql`${table.ok} = 1`)],
);

export const creditGuards = sqliteTable(
  "credit_guards",
  {
    id: text("id").primaryKey(),
    ok: integer("ok").notNull(),
  },
  (table) => [check("credit_guards_ok", sql`${table.ok} = 1`)],
);

export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    description: text("description").notNull(),
    category: text("category").notNull().default("geral"),
    amountCents: integer("amount_cents").notNull(),
    dueDate: text("due_date"),
    paidAt: text("paid_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("expenses_due_date_idx").on(table.dueDate),
    index("expenses_paid_at_idx").on(table.paidAt),
  ],
);

export const suppliers = sqliteTable(
  "suppliers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    contact: text("contact").notNull().default(""),
    phone: text("phone").notNull().default(""),
    notes: text("notes").notNull().default(""),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("suppliers_active_name_idx").on(table.active, table.name)],
);

export const staffMembers = sqliteTable(
  "staff_members",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    role: text("role").notNull(),
    permissions: text("permissions").notNull().default("[]"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("staff_active_name_idx").on(table.active, table.name)],
);

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
