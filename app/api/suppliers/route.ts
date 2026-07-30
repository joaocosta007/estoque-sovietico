import { env } from "cloudflare:workers";

export async function GET() {
  try {
    const result = await env.DB.prepare(
      `SELECT id, name, contact, phone, notes, created_at AS createdAt
       FROM suppliers WHERE active = 1 ORDER BY name`,
    ).all();
    return Response.json({ suppliers: result.results });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    if (!name) {
      return Response.json({ error: "Nome obrigatório." }, { status: 400 });
    }
    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO suppliers (id, name, contact, phone, notes)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        name,
        String(body.contact ?? "").trim(),
        String(body.phone ?? "").trim(),
        String(body.notes ?? "").trim(),
      )
      .run();
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id?: string; active?: boolean };
    if (!body.id) {
      return Response.json({ error: "Fornecedor obrigatório." }, { status: 400 });
    }
    const result = await env.DB.prepare(
      `UPDATE suppliers SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    )
      .bind(body.active === false ? 0 : 1, body.id)
      .run();
    if ((result.meta.changes ?? 0) !== 1) {
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
