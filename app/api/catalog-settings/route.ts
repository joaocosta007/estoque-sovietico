import { getSql } from "../../../db";

export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql<{ key: string; value: string }[]>`
      SELECT key, value
      FROM app_settings
      WHERE key IN ('business_name', 'whatsapp_number')
    `;
    const settings = Object.fromEntries(rows.map((item) => [item.key, item.value]));
    return Response.json({
      businessName: settings.business_name || "Estoque Soviético",
      whatsappNumber: settings.whatsapp_number || "",
    });
  } catch {
    return Response.json(
      { error: "Configurações públicas temporariamente indisponíveis." },
      { status: 500 },
    );
  }
}
