import { env } from "cloudflare:workers";

const allowedKeys = ["business_name", "whatsapp_number"] as const;

export async function GET() {
  try {
    const result = await env.DB.prepare(
      "SELECT key, value FROM app_settings ORDER BY key",
    ).all<{ key: string; value: string }>();
    return Response.json({
      settings: Object.fromEntries(result.results.map((item) => [item.key, item.value])),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const statements = allowedKeys.map((key) =>
      env.DB.prepare(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = CURRENT_TIMESTAMP`,
      ).bind(key, String(body[key] ?? "").trim()),
    );
    await env.DB.batch(statements);
    return Response.json({ updated: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}
