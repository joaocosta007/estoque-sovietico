export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) {
    return Response.json(
      { error: "Notificações ainda não foram configuradas." },
      { status: 503 },
    );
  }
  return Response.json({ publicKey });
}
