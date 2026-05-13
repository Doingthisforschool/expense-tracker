import { kv } from "@vercel/kv";

export async function GET() {
  try {
    const [data, budget] = await Promise.all([
      kv.get("expenses-data"),
      kv.get("expenses-budget"),
    ]);
    return Response.json({
      data: data || {},
      budget: budget || 500,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (body.type === "expenses") {
      await kv.set("expenses-data", body.data);
      return Response.json({ ok: true });
    }

    if (body.type === "budget") {
      await kv.set("expenses-budget", body.value);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
