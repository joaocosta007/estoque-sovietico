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
export const sales = sqliteTable(
  "sales",
  {
    id: text("id").primaryKey(),
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    paymentMethod: text("payment_method").notNull(),
    status: text("status").notNull().default("completed"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("sales_created_at_idx").on(table.createdAt)],
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
