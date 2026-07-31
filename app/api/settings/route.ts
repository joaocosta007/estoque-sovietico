import { getSql } from "../../../db";
import { requireAdminApi } from "../../../lib/auth";

const allowedKeys = ["business_name", "whatsapp_number"] as const;

export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;
  try {
    const sql = getSql();
    const rows = await sql<{ key: string; value: string }[]>`
      SELECT key, value FROM app_settings ORDER BY key
    `;
    return Response.json({
      settings: Object.fromEntries(rows.map((item) => [item.key, item.value])),
    });
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
    const sql = getSql();
    await sql.begin(async (tx) => {
      for (const key of allowedKeys) {
        await tx`
          INSERT INTO app_settings (key, value, updated_at)
          VALUES (${key}, ${String(body[key] ?? "").trim()}, CURRENT_TIMESTAMP)
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = CURRENT_TIMESTAMP
        `;
      }
    });
    return Response.json({ updated: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}
