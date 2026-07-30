import { env } from "cloudflare:workers";

export async function GET() {
  try {
    const result = await env.DB.prepare(
      `SELECT key, value FROM app_settings
       WHERE key IN ('business_name', 'whatsapp_number')`,
    ).all<{ key: string; value: string }>();
    const settings = Object.fromEntries(
      result.results.map((item) => [item.key, item.value]),
    );
    return Response.json({
      businessName: settings.business_name || "Estoque Soviético",
      whatsappNumber: settings.whatsapp_number || "",
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Falha inesperada." },
      { status: 500 },
    );
  }
}
