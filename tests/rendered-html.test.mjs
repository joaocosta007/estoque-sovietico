import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalogComponentUrl = new URL(
  "../app/catalogo/public-catalog.tsx",
  import.meta.url,
);
const catalogApiUrl = new URL("../app/api/catalog/route.ts", import.meta.url);
const schemaUrl = new URL("../db/schema.ts", import.meta.url);
const adminModulesUrl = new URL("../app/admin-modules.tsx", import.meta.url);
const salesApiUrl = new URL("../app/api/sales/route.ts", import.meta.url);
const ledgerApiUrl = new URL(
  "../app/api/customer-ledger/route.ts",
  import.meta.url,
);

test("mantém a vitrine mobile dentro do design system brutalista", async () => {
  const component = await readFile(catalogComponentUrl, "utf8");

  assert.match(component, /max-w-md/);
  assert.match(component, /Catálogo de suprimentos disponíveis/i);
  assert.match(component, /Buscar no catálogo/i);
  assert.match(component, /Solicitar via WhatsApp/i);
  assert.match(component, /Em estoque/i);
  assert.match(component, /Esgotado/i);
  assert.match(component, /rounded-none/);
  assert.doesNotMatch(component, /\brounded-(?!none\b)[^\s"']+/);
  assert.match(component, /shadow-\[4px_4px_0px_0px_/);
});

test("monta a solicitação do WhatsApp com o nome do produto", async () => {
  const component = await readFile(catalogComponentUrl, "utf8");

  assert.match(component, /https:\/\/wa\.me\/\$\{whatsappNumber\}/);
  assert.match(
    component,
    /Camarada, desejo requisitar o item: \$\{product\.name\}/,
  );
  assert.match(component, /encodeURIComponent\(message\)/);
});

test("limita a API pública aos campos seguros do catálogo", async () => {
  const [route, schema] = await Promise.all([
    readFile(catalogApiUrl, "utf8"),
    readFile(schemaUrl, "utf8"),
  ]);
  const selectSql = route.match(/`SELECT[\s\S]*?ORDER BY[\s\S]*?`/)?.[0] ?? "";

  assert.match(selectSql, /\bname\b/);
  assert.match(selectSql, /sale_price_cents AS priceCents/);
  assert.match(selectSql, /photo_url AS photoUrl/);
  assert.match(selectSql, /stock_milli > 0/);
  assert.doesNotMatch(selectSql, /sku|barcode|cost|supplier/i);
  assert.match(schema, /photoUrl: text\("photo_url"\)/);
});

test("oferece cadastro, extrato, pagamentos e limite para o fiado", async () => {
  const [component, schema, ledgerRoute] = await Promise.all([
    readFile(adminModulesUrl, "utf8"),
    readFile(schemaUrl, "utf8"),
    readFile(ledgerApiUrl, "utf8"),
  ]);

  assert.match(component, /Clientes e fiado/);
  assert.match(component, /Pagamento recebido/i);
  assert.match(component, /Extrato do cliente/);
  assert.match(component, /Limite de crédito/);
  assert.match(schema, /export const customers/);
  assert.match(schema, /export const customerLedger/);
  assert.match(ledgerRoute, /credit_limit_cents/);
  assert.match(ledgerRoute, /credit_guards/);
});

test("registra venda fiada, dívida e baixa de estoque no mesmo batch", async () => {
  const salesRoute = await readFile(salesApiUrl, "utf8");

  assert.match(salesRoute, /paymentMethod === "credit"/);
  assert.match(salesRoute, /INSERT INTO customer_ledger/);
  assert.match(salesRoute, /UPDATE products/);
  assert.match(salesRoute, /await env\.DB\.batch\(statements\)/);
});
