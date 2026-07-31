import { getSql } from "../../../db";
import { requireAdminApi } from "../../../lib/auth";

export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const sql = getSql();
    const suppliers = await sql`
      SELECT id, name, contact, phone, notes, created_at AS "createdAt"
      FROM suppliers
      WHERE active = true
      ORDER BY name
    `;
    return Response.json({ suppliers });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    if (!name) {
      return Response.json({ error: "Nome obrigatório." }, { status: 400 });
    }
    const id = crypto.randomUUID();
    const sql = getSql();
    await sql`
      INSERT INTO suppliers (id, name, contact, phone, notes)
      VALUES (
        ${id}, ${name}, ${String(body.contact ?? "").trim()},
        ${String(body.phone ?? "").trim()}, ${String(body.notes ?? "").trim()}
      )
    `;
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const body = (await request.json()) as { id?: string; active?: boolean };
    if (!body.id) {
      return Response.json({ error: "Fornecedor obrigatório." }, { status: 400 });
    }
    const sql = getSql();
    const rows = await sql<{ id: string }[]>`
      UPDATE suppliers
      SET active = ${body.active !== false}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${body.id}
      RETURNING id
    `;
    if (!rows[0]) {
      return Response.json({ error: "Fornecedor não encontrado." }, { status: 404 });
    }
    return Response.json({ updated: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}
