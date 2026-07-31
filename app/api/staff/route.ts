import { getSql } from "../../../db";
import { requireAdminApi } from "../../../lib/auth";

export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const sql = getSql();
    const rows = await sql<{
      id: string;
      name: string;
      role: string;
      permissions: string;
      active: boolean;
      createdAt: string;
    }[]>`
      SELECT id, name, role, permissions, active, created_at AS "createdAt"
      FROM staff_members
      WHERE active = true
      ORDER BY name
    `;
    return Response.json({
      staff: rows.map((member) => ({
        ...member,
        permissions: JSON.parse(member.permissions) as string[],
      })),
    });
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
    const role = String(body.role ?? "").trim();
    const permissions = Array.isArray(body.permissions)
      ? body.permissions.map(String)
      : [];
    if (!name || !role) {
      return Response.json({ error: "Nome e função são obrigatórios." }, { status: 400 });
    }
    const id = crypto.randomUUID();
    const sql = getSql();
    await sql`
      INSERT INTO staff_members (id, name, role, permissions)
      VALUES (${id}, ${name}, ${role}, ${JSON.stringify(permissions)})
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
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    const permissions = Array.isArray(body.permissions)
      ? body.permissions.map(String)
      : [];
    if (!id) {
      return Response.json({ error: "Funcionário obrigatório." }, { status: 400 });
    }
    const sql = getSql();
    const rows = await sql<{ id: string }[]>`
      UPDATE staff_members
      SET permissions = ${JSON.stringify(permissions)},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id
    `;
    if (!rows[0]) {
      return Response.json({ error: "Funcionário não encontrado." }, { status: 404 });
    }
    return Response.json({ updated: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}
