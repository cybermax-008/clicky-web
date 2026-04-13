/**
 * Clicky Proxy Worker
 *
 * Proxies requests to Claude API so the app/SDK never ships with raw API keys.
 * Keys are stored as Cloudflare secrets.
 *
 * Routes:
 *   POST /chat    → Anthropic Messages API (streaming)
 *   OPTIONS /chat → CORS preflight
 */

interface Env {
  ANTHROPIC_API_KEY: string;
  /** SDK API key for authenticating requests from the web SDK */
  SDK_API_KEY: string;
}

/** CORS headers applied to all responses for cross-origin SDK usage */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Clicky-API-Key",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    // Validate SDK API key if configured
    if (env.SDK_API_KEY) {
      const requestApiKey = request.headers.get("X-Clicky-API-Key");
      if (requestApiKey !== env.SDK_API_KEY) {
        return new Response(
          JSON.stringify({ error: "Invalid or missing API key" }),
          {
            status: 401,
            headers: { ...corsHeaders, "content-type": "application/json" },
          }
        );
      }
    }

    try {
      if (url.pathname === "/chat") {
        return await handleChat(request, env);
      }
    } catch (error) {
      console.error(`[${url.pathname}] Unhandled error:`, error);
      return new Response(
        JSON.stringify({ error: String(error) }),
        {
          status: 500,
          headers: { ...corsHeaders, "content-type": "application/json" },
        }
      );
    }

    return new Response("Not found", {
      status: 404,
      headers: corsHeaders,
    });
  },
};

async function handleChat(request: Request, env: Env): Promise<Response> {
  const body = await request.text();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      `[/chat] Anthropic API error ${response.status}: ${errorBody}`
    );
    return new Response(errorBody, {
      status: response.status,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      ...corsHeaders,
      "content-type":
        response.headers.get("content-type") || "text/event-stream",
      "cache-control": "no-cache",
    },
  });
}
