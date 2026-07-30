import { env } from "cloudflare:workers";

type CatalogRow = {
  name: string;
  priceCents: number;
  photoUrl: string | null;
  available: number;
};

export async function GET() {
  try {
    // Endpoint deliberadamente público e de leitura. A projeção não expõe
    // custo, fornecedor, SKU, código de barras nem a quantidade exata.
    const result = await env.DB.prepare(
      `SELECT
         name,
         sale_price_cents AS priceCents,
         photo_url AS photoUrl,
         CASE WHEN stock_milli > 0 THEN 1 ELSE 0 END AS available
       FROM products
       WHERE active = 1
       ORDER BY available DESC, name ASC`,
    ).all<CatalogRow>();

    return Response.json({
      products: result.results.map((product) => ({
        name: product.name,
        priceCents: product.priceCents,
        photoUrl: product.photoUrl,
        available: product.available === 1,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao carregar o catálogo.";
    return Response.json({ error: message }, { status: 500 });
  }
}
