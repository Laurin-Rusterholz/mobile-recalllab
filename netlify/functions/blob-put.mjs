import { getStore } from "@netlify/blobs";

const STORE_NAME = "app-data";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PUT, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, If-Match",
  "Access-Control-Expose-Headers": "ETag",
};

function checkAuth(request) {
  const required = process.env.SYNC_AUTH_TOKEN;
  if (!required) return { ok: true };
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (token !== required) return { ok: false, error: "Unauthorized" };
  return { ok: true };
}

export default async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== "PUT" && request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const auth = checkAuth(request);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return new Response(JSON.stringify({ error: "key parameter required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid JSON", message: String(err?.message || err) }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const store = getStore({ name: STORE_NAME, consistency: "strong" });

    // ETag-Conflict-Check (optional)
    const ifMatch = request.headers.get("if-match");
    if (ifMatch) {
      try {
        const existing = await store.getWithMetadata(key, { type: "json" });
        const currentEtag = existing?.etag || existing?.metadata?.etag || "";
        if (currentEtag && ifMatch !== currentEtag && ifMatch !== "*") {
          return new Response(JSON.stringify({ error: "Precondition failed", currentEtag }), {
            status: 412,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json", "ETag": currentEtag },
          });
        }
      } catch (e) {
        // existing didn't exist - that's OK
      }
    }

    const newEtag = "\"" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8) + "\"";
    await store.setJSON(key, body, { metadata: { etag: newEtag, updatedAt: new Date().toISOString() } });

    return new Response(JSON.stringify({ ok: true, key, etag: newEtag }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json", "ETag": newEtag },
    });
  } catch (err) {
    console.error("[blob-put] error:", err);
    return new Response(
      JSON.stringify({ error: "Server error", message: String(err?.message || err) }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
};

export const config = { path: "/.netlify/functions/blob-put" };
