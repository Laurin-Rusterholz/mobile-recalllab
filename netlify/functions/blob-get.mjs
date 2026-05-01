import { getStore } from "@netlify/blobs";

const STORE_NAME = "app-data";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, If-Match, Cache-Control",
  "Access-Control-Expose-Headers": "ETag, Last-Modified",
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
  if (request.method !== "GET") {
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

  try {
    const store = getStore({ name: STORE_NAME, consistency: "strong" });
    const result = await store.getWithMetadata(key, { type: "json" });

    if (!result || result.data === null || result.data === undefined) {
      return new Response(JSON.stringify({ error: "Not found", key }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const etag = result.etag || result.metadata?.etag || "";
    const headers = {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };
    if (etag) headers["ETag"] = etag;

    return new Response(JSON.stringify(result.data), { status: 200, headers });
  } catch (err) {
    console.error("[blob-get] error:", err);
    return new Response(
      JSON.stringify({ error: "Server error", message: String(err?.message || err) }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
};

export const config = { path: "/.netlify/functions/blob-get" };
