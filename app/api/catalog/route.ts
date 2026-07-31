import { getSql } from "../../../db";

type CatalogRow = {
  name: string;
  priceCents: number;
  photoUrl: string | null;
  available: boolean;
};

export async function GET() {
  try {
    const sql = getSql();
    // Endpoint público: retorna somente dados seguros de produtos ativos.
    const products = await sql<CatalogRow[]>`
      SELECT
        name,
        sale_price_cents AS "priceCents",
        photo_url AS "photoUrl",
        stock_milli > 0 AS available
      FROM products
      WHERE active = true
      ORDER BY available DESC, name ASC
    `;
    return Response.json({ products });
  } catch {
    return Response.json(
      { error: "Catálogo temporariamente indisponível." },
      { status: 500 },
    );
  }
}
