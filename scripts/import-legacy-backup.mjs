import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const backupDir = process.env.LEGACY_BACKUP_DIR ?? "/Users/joao.pirani/Downloads/Backup";
const dryRun = process.env.IMPORT_DRY_RUN !== "0";
const confirmed = process.env.IMPORT_CONFIRM === "REPLACE_ALL_LEGACY_DATA";

const names = ["Produtos", "Clientes", "Cab_Venda", "Det_Venda", "Pagamentos", "Categorias", "Unidades", "FormaPgto", "Empresa"];

async function readJson(name) {
  try {
    return JSON.parse(await fs.readFile(path.join(backupDir, `${name}.json`), "utf8"));
  } catch {
    return {};
  }
}

const entries = (value) => Object.entries(value ?? {});
const n = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const cents = (value) => Math.round(n(value) * 100);
const milli = (value) => Math.round(n(value) * 1000);
const id = (value, fallback) => String(value || fallback);
const isoDate = (date, time = "00:00:00") => {
  const [day, month, year] = String(date || "").split(/[-/]/);
  if (!day || !month || !year) return new Date().toISOString();
  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")} ${String(time || "00:00:00").slice(0, 8)}`;
};
const data = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await readJson(name)])));
const products = entries(data.Produtos);
const customers = entries(data.Clientes);
const sales = entries(data.Cab_Venda);
const payments = entries(data.Pagamentos);
const paymentSaleIds = new Set(payments.map(([, p]) => String(p.uid_cab_venda || "")).filter(Boolean));
const details = data.Det_Venda ?? {};
const productIds = new Set(products.map(([uid]) => String(uid)));
const customerIds = new Set(customers.map(([uid]) => String(uid)));

const saleItems = [];
for (const [saleUid, rows] of entries(details)) {
  for (const [detailUid, row] of entries(rows)) {
    if (String(row.tipo_item || "PRODUTO").toUpperCase() === "DESCONTO") continue;
    const productId = String(row.uid_produto || "");
    if (!productIds.has(productId)) continue;
    saleItems.push({ id: id(row.uid || detailUid, `${saleUid}-${detailUid}`), saleId: String(saleUid), productId, productName: String(row.produto || "Produto importado"), quantityMilli: milli(row.quantidade), unitPriceCents: cents(row.valor_uni), lineTotalCents: cents(row.valor_total) });
  }
}

const summary = {
  products: products.length,
  customers: customers.length,
  sales: sales.length,
  saleItems: saleItems.length,
  creditSales: sales.filter(([, s]) => paymentSaleIds.has(String(s.uid)) || n(s.restante) > 0).length,
  payments: payments.length,
};
console.log(JSON.stringify({ backupDir, dryRun, summary }, null, 2));

if (dryRun) {
  console.log("Pré-visualização concluída. Para aplicar: IMPORT_DRY_RUN=0 IMPORT_CONFIRM=REPLACE_ALL_LEGACY_DATA node scripts/import-legacy-backup.mjs");
  process.exit(0);
}
if (!confirmed) throw new Error("Importação destrutiva bloqueada. Defina IMPORT_CONFIRM=REPLACE_ALL_LEGACY_DATA.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");

const sql = postgres(process.env.DATABASE_URL, { prepare: false, connect_timeout: 20, max: 1 });
const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
const backupPath = `/private/tmp/estoque-before-legacy-import-${stamp}.json`;

try {
  const existing = {};
  for (const table of ["products", "customers", "sales", "sale_items", "customer_ledger", "stock_movements", "expenses", "suppliers", "staff_members", "app_settings"]) {
    existing[table] = await sql.unsafe(`select * from ${table}`);
  }
  await fs.writeFile(backupPath, JSON.stringify(existing, null, 2));

  await sql.begin(async (tx) => {
    // Administrative accounts and notification subscriptions/campaigns are deliberately preserved.
    await tx`delete from customer_ledger`;
    await tx`delete from sale_items`;
    await tx`delete from stock_movements`;
    await tx`delete from sales`;
    await tx`delete from products`;
    await tx`delete from customers`;
    await tx`delete from expenses`;
    await tx`delete from suppliers`;
    await tx`delete from staff_members`;
    await tx`delete from app_settings`;

    for (const [uid, p] of products) {
      const productId = String(uid);
      const barcode = String(p.cod_barra || "").trim() || null;
      await tx`insert into products ${tx({ id: productId, sku: `LEGACY-${productId.slice(0, 24)}`, barcode, name: String(p.produto || "Produto sem nome"), photo_url: String(p.img0 || "").trim() || null, sale_price_cents: cents(p.valor_venda), stock_milli: milli(p.estoque_atual), min_stock_milli: milli(p.estoque_minimo), active: true })}`;
      const stock = milli(p.estoque_atual);
      if (stock > 0) await tx`insert into stock_movements ${tx({ id: `legacy-opening-${productId}`, product_id: productId, type: "opening", quantity_milli: stock, reference_id: null, note: "Saldo importado do backup legado" })}`;
    }

    for (const [uid, c] of customers) {
      const customerId = String(uid);
      const address = [c.endereco, c.numero, c.bairro, c.cidade, c.uf].filter(Boolean).join(", ");
      const notes = [c.observacoes, c.email, address].filter(Boolean).join(" | ");
      await tx`insert into customers ${tx({ id: customerId, name: String(c.nome || c.apelido || "Cliente sem nome"), phone: String(c.celular || c.telefone || ""), document: "", credit_limit_cents: 999999999, notes, active: String(c.status ?? "ATIVO").toUpperCase() !== "INATIVO" })}`;
    }

    for (const [uid, s] of sales) {
      const saleId = String(uid);
      const customerId = customerIds.has(String(s.uid_cliente || "")) ? String(s.uid_cliente) : null;
      const rows = saleItems.filter((item) => item.saleId === saleId);
      const subtotal = rows.reduce((sum, item) => sum + item.lineTotalCents, 0) || cents(s.total);
      const total = cents(s.total);
      const credit = paymentSaleIds.has(saleId) || n(s.restante) > 0;
      await tx`insert into sales ${tx({ id: saleId, customer_id: customerId, subtotal_cents: subtotal, discount_cents: Math.max(0, subtotal - total), total_cents: total, payment_method: credit ? "credit" : "cash", status: "completed", cancelled_at: null, cancel_reason: "", cancelled_by: "", created_at: isoDate(s.data, s.hora) })}`;
      for (const item of rows) await tx`insert into sale_items ${tx({ id: item.id, sale_id: saleId, product_id: item.productId, product_name: item.productName, quantity_milli: item.quantityMilli, unit_price_cents: item.unitPriceCents, line_total_cents: item.lineTotalCents })}`;
      if (credit && customerId && total > 0) await tx`insert into customer_ledger ${tx({ id: `legacy-debit-${saleId}`, customer_id: customerId, type: "debit", amount_cents: total, description: "Venda fiada importada", sale_id: saleId, due_date: isoDate(s.data, s.hora).slice(0, 10), late_fee_for_id: null, created_at: isoDate(s.data, s.hora) })}`;
    }

    for (const [uid, p] of payments) {
      const customerId = customerIds.has(String(p.uid_cliente || "")) ? String(p.uid_cliente) : null;
      if (!customerId || cents(p.valor) <= 0) continue;
      await tx`insert into customer_ledger ${tx({ id: `legacy-payment-${String(uid)}`, customer_id: customerId, type: "payment", amount_cents: cents(p.valor), description: `Pagamento importado${p.formapgto ? ` via ${p.formapgto}` : ""}`, sale_id: String(p.uid_cab_venda || "") || null, due_date: null, late_fee_for_id: null, created_at: isoDate(p.data, p.hora) })}`;
    }

    const company = data.Empresa ?? {};
    if (company.empresa) await tx`insert into app_settings ${tx({ key: "business_name", value: String(company.empresa) })}`;
  });
  console.log(`Importação concluída. Backup de segurança: ${backupPath}`);
} finally {
  await sql.end({ timeout: 5 });
}
