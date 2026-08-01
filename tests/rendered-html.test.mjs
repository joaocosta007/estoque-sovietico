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
const packageUrl = new URL("../package.json", import.meta.url);
const databaseUrl = new URL("../db/index.ts", import.meta.url);
const proxyUrl = new URL("../proxy.ts", import.meta.url);
const landingUrl = new URL("../app/camaradas/page.tsx", import.meta.url);
const dashboardUrl = new URL("../app/dashboard.tsx", import.meta.url);
const loginRouteUrl = new URL(
  "../app/api/auth/login/route.ts",
  import.meta.url,
);
const passwordRouteUrl = new URL(
  "../app/api/auth/password/route.ts",
  import.meta.url,
);
const changePasswordPageUrl = new URL(
  "../app/trocar-senha/page.tsx",
  import.meta.url,
);

test("publica a landing dos camaradas com fotos e acesso ao catálogo", async () => {
  const [landing, proxy] = await Promise.all([
    readFile(landingUrl, "utf8"),
    readFile(proxyUrl, "utf8"),
  ]);

  assert.match(landing, /O residencial/);
  assert.match(landing, /residencial universitário masculino/i);
  assert.match(landing, /\/landing\/camarada-formal\.jpg/);
  assert.match(landing, /\/landing\/camarada-kart\.jpg/);
  assert.match(landing, /\/landing\/camarada-residencial\.jpg/);
  assert.equal(landing.match(/\bunoptimized\b/g)?.length, 3);
  assert.match(landing, /Entrar no catálogo dos camaradas/i);
  assert.match(landing, /href="\/catalogo"/);
  assert.match(proxy, /"\/camaradas"/);
});

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
  const selectSql = route.match(/SELECT[\s\S]*?ORDER BY[\s\S]*?`/)?.[0] ?? "";

  assert.match(selectSql, /\bname\b/);
  assert.match(selectSql, /sale_price_cents AS "priceCents"/);
  assert.match(selectSql, /photo_url AS "photoUrl"/);
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
  assert.match(ledgerRoute, /await sql\.begin/);
  assert.match(ledgerRoute, /FOR UPDATE/);
});

test("registra venda fiada, dívida e baixa de estoque no mesmo batch", async () => {
  const salesRoute = await readFile(salesApiUrl, "utf8");

  assert.match(salesRoute, /paymentMethod === "credit"/);
  assert.match(salesRoute, /INSERT INTO customer_ledger/);
  assert.match(salesRoute, /UPDATE products/);
  assert.match(salesRoute, /await sql\.begin/);
  assert.match(salesRoute, /FOR UPDATE/);
});

test("cancela venda com estorno transacional e opção no menu", async () => {
  const [salesRoute, dashboard, adminModules, schema] = await Promise.all([
    readFile(salesApiUrl, "utf8"),
    readFile(dashboardUrl, "utf8"),
    readFile(adminModulesUrl, "utf8"),
    readFile(schemaUrl, "utf8"),
  ]);

  assert.match(dashboard, /Cancelar venda/);
  assert.match(adminModules, /Confirmar cancelamento/);
  assert.match(salesRoute, /export async function PATCH/);
  assert.match(salesRoute, /await sql\.begin/);
  assert.match(salesRoute, /FOR UPDATE/);
  assert.match(salesRoute, /stock_milli = stock_milli \+/);
  assert.match(salesRoute, /'sale_cancel'/);
  assert.match(salesRoute, /'payment'/);
  assert.match(salesRoute, /status = 'cancelled'/);
  assert.match(schema, /cancelledAt: text\("cancelled_at"\)/);
});

test("oferece múltiplas contas e troca obrigatória da senha temporária", async () => {
  const [loginRoute, passwordRoute, page, dashboard, proxy, schema] =
    await Promise.all([
      readFile(loginRouteUrl, "utf8"),
      readFile(passwordRouteUrl, "utf8"),
      readFile(changePasswordPageUrl, "utf8"),
      readFile(dashboardUrl, "utf8"),
      readFile(proxyUrl, "utf8"),
      readFile(schemaUrl, "utf8"),
    ]);

  assert.match(schema, /export const adminUsers/);
  assert.match(schema, /mustChangePassword/);
  assert.match(loginRoute, /FROM admin_users/);
  assert.match(loginRoute, /must_change_password/);
  assert.match(loginRoute, /"\/trocar-senha"/);
  assert.match(passwordRoute, /hashPassword/);
  assert.match(passwordRoute, /must_change_password = false/);
  assert.match(passwordRoute, /createSessionToken\(session\.email, false\)/);
  assert.match(page, /Escolha sua/);
  assert.match(page, /Salvar minha senha/);
  assert.match(dashboard, /Alterar minha senha/);
  assert.match(proxy, /session\.mustChangePassword/);
});

test("está preparado para Next.js e PostgreSQL na Vercel", async () => {
  const [packageJson, database, schema, proxy] = await Promise.all([
    readFile(packageUrl, "utf8"),
    readFile(databaseUrl, "utf8"),
    readFile(schemaUrl, "utf8"),
    readFile(proxyUrl, "utf8"),
  ]);

  assert.match(packageJson, /"build": "next build"/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|@cloudflare/);
  assert.match(database, /drizzle-orm\/postgres-js/);
  assert.match(database, /process\.env\.DATABASE_URL/);
  assert.match(schema, /drizzle-orm\/pg-core/);
  assert.doesNotMatch(schema, /sqlite-core/);
  assert.match(proxy, /SESSION_COOKIE/);
  assert.match(proxy, /"\/catalogo"/);
});
