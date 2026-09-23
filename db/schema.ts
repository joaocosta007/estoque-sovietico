import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`);
const updatedAt = () =>
  text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`);

export const products = pgTable(
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
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("products_sku_unique").on(table.sku),
    uniqueIndex("products_barcode_unique").on(table.barcode),
    index("products_active_name_idx").on(table.active, table.name),
    check("products_stock_nonnegative", sql`${table.stockMilli} >= 0`),
  ],
);

export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull().default(""),
    document: text("document").notNull().default(""),
    creditLimitCents: integer("credit_limit_cents").notNull().default(0),
    notes: text("notes").notNull().default(""),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("customers_active_name_idx").on(table.active, table.name),
    check("customers_credit_limit_nonnegative", sql`${table.creditLimitCents} >= 0`),
  ],
);

export const sales = pgTable(
  "sales",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id").references(() => customers.id),
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    paymentMethod: text("payment_method").notNull(),
    status: text("status").notNull().default("completed"),
    cancelledAt: text("cancelled_at"),
    cancelReason: text("cancel_reason").notNull().default(""),
    cancelledBy: text("cancelled_by").notNull().default(""),
    createdAt: createdAt(),
  },
  (table) => [index("sales_created_at_idx").on(table.createdAt)],
);

export const customerLedger = pgTable(
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
    lateFeeForId: text("late_fee_for_id"),
    createdAt: createdAt(),
  },
  (table) => [
    index("customer_ledger_customer_created_idx").on(
      table.customerId,
      table.createdAt,
    ),
    uniqueIndex("customer_ledger_late_fee_for_unique").on(table.lateFeeForId),
    check(
      "customer_ledger_amount_positive",
      sql`${table.amountCents} > 0`,
    ),
    check(
      "customer_ledger_type_valid",
      sql`${table.type} IN ('debit', 'payment')`,
    ),
  ],
);

export const saleItems = pgTable(
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

export const stockMovements = pgTable(
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
    createdAt: createdAt(),
  },
  (table) => [
    index("stock_movements_product_created_idx").on(
      table.productId,
      table.createdAt,
    ),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    description: text("description").notNull(),
    category: text("category").notNull().default("geral"),
    amountCents: integer("amount_cents").notNull(),
    dueDate: text("due_date"),
    paidAt: text("paid_at"),
    createdAt: createdAt(),
  },
  (table) => [
    index("expenses_due_date_idx").on(table.dueDate),
    index("expenses_paid_at_idx").on(table.paidAt),
    check("expenses_amount_positive", sql`${table.amountCents} > 0`),
  ],
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    contact: text("contact").notNull().default(""),
    phone: text("phone").notNull().default(""),
    notes: text("notes").notNull().default(""),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("suppliers_active_name_idx").on(table.active, table.name)],
);

export const staffMembers = pgTable(
  "staff_members",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    role: text("role").notNull(),
    permissions: text("permissions").notNull().default("[]"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("staff_active_name_idx").on(table.active, table.name)],
);

export const adminUsers = pgTable(
  "admin_users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("admin"),
    active: boolean("active").notNull().default(true),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("admin_users_email_unique").on(table.email),
    index("admin_users_active_email_idx").on(table.active, table.email),
  ],
);

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: updatedAt(),
});

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    label: text("label").notNull().default("CELULAR SEM IDENTIFICAÇÃO"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("push_subscriptions_endpoint_unique").on(table.endpoint),
    index("push_subscriptions_active_idx").on(table.active),
  ],
);

export const notificationTemplates = pgTable(
  "notification_templates",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    targetUrl: text("target_url").notNull().default("/catalogo"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("notification_templates_name_unique").on(table.name)],
);

export const notificationCampaigns = pgTable(
  "notification_campaigns",
  {
    id: text("id").primaryKey(),
    templateId: text("template_id").references(() => notificationTemplates.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    targetUrl: text("target_url").notNull().default("/catalogo"),
    audience: text("audience").notNull().default("all"),
    status: text("status").notNull().default("scheduled"),
    scheduledAt: text("scheduled_at"),
    sentAt: text("sent_at"),
    createdBy: text("created_by").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("notification_campaigns_due_idx").on(table.status, table.scheduledAt),
    check(
      "notification_campaigns_status_valid",
      sql`${table.status} IN ('pending', 'scheduled', 'sending', 'sent', 'partial', 'failed', 'cancelled')`,
    ),
  ],
);

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => notificationCampaigns.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => pushSubscriptions.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    error: text("error").notNull().default(""),
    sentAt: text("sent_at"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("notification_deliveries_campaign_subscription_unique").on(
      table.campaignId,
      table.subscriptionId,
    ),
    index("notification_deliveries_campaign_idx").on(table.campaignId),
  ],
);
