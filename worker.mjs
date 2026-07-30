import openNext from "./.open-next/worker.js";

import { handleAgentEdge } from "./agent-edge.mjs";

export {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
} from "./.open-next/worker.js";

const HOME_CACHE_CONTROL =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

function homeCacheKey(request, versionId) {
  const url = new URL(request.url);
  url.searchParams.set("__india_numbers_version", versionId);
  return new Request(url, request);
}

export default {
  async fetch(request, env, ctx) {
    const agentResponse = handleAgentEdge(request);
    if (agentResponse) return agentResponse;

    const url = new URL(request.url);
    if (request.method !== "GET" || url.pathname !== "/") {
      return openNext.fetch(request, env, ctx);
    }

    const cache = caches.default;
    const cacheKey = homeCacheKey(
      request,
      env.CF_VERSION_METADATA?.id ?? "local",
    );
    const cached = await cache.match(cacheKey);
    if (cached) {
      const response = new Response(cached.body, cached);
      response.headers.set("x-edge-cache", "HIT");
      return response;
    }

    const response = await openNext.fetch(request, env, ctx);
    const contentType = response.headers.get("content-type") ?? "";
    if (response.status !== 200 || !contentType.includes("text/html")) {
      return response;
    }

    const body = await response.arrayBuffer();
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", HOME_CACHE_CONTROL);
    const cacheable = new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    ctx.waitUntil(cache.put(cacheKey, cacheable.clone()));

    const clientResponse = new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    clientResponse.headers.set("x-edge-cache", "MISS");
    return clientResponse;
  },
};
