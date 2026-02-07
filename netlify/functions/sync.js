import { getStore, getDeployStore } from "@netlify/blobs";

function getBlobStore(name) {
  const ctx = globalThis.Netlify?.context;
  if (ctx?.deploy?.context === "production") {
    return getStore(name, { consistency: "strong" });
  }
  return getDeployStore(name);
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export default async (request) => {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    if (!key) return json(400, { ok: false, error: "Missing key" });

    const store = getBlobStore("lifehub");

    if (request.method === "GET") {
      const value = await store.get(key, { type: "json" });
      return json(200, { ok: true, value: value ?? null });
    }

    if (request.method === "PUT" || request.method === "POST") {
      const body = await request.json().catch(() => null);
      if (!body || !("value" in body)) return json(400, { ok: false, error: "Missing value" });
      await store.setJSON(key, body.value);
      return json(200, { ok: true });
    }

    return json(405, { ok: false, error: "Method not allowed" });
  } catch (e) {
    return json(500, { ok: false, error: "Server error" });
  }
};
