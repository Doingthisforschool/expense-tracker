import { kv } from "@vercel/kv";

export async function GET() {
  try {
    const pin = await kv.get("pin");
    return Response.json({ hasPin: !!pin });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (body.action === "set") {
      await kv.set("pin", body.pin);
      return Response.json({ ok: true });
    }

    if (body.action === "verify") {
      const storedPin = await kv.get("pin");
      return Response.json({ valid: storedPin === body.pin });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
