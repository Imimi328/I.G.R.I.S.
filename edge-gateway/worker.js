const API_ORIGIN = 'https://api.igris.site';
const ALLOWED_HOSTS = new Set(['igris.site', 'www.igris.site']);

export default {
  async fetch(request, env) {
    const incomingUrl = new URL(request.url);
    if (!ALLOWED_HOSTS.has(incomingUrl.hostname) || !incomingUrl.pathname.startsWith('/api/')) {
      return errorResponse(404);
    }
    if (!env.IGRIS_GATEWAY_KEY || env.IGRIS_GATEWAY_KEY.length < 32) {
      return errorResponse(503);
    }

    const fetchSite = request.headers.get('Sec-Fetch-Site');
    const fetchMode = request.headers.get('Sec-Fetch-Mode');
    if (fetchMode === 'navigate' || fetchSite !== 'same-origin') {
      return errorResponse(403);
    }

    const upstreamUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, API_ORIGIN);
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('x-igris-gateway-key');
    headers.set('x-igris-gateway-key', env.IGRIS_GATEWAY_KEY);

    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual'
    });
    const response = new Response(upstreamResponse.body, upstreamResponse);
    response.headers.delete('access-control-allow-origin');
    response.headers.delete('access-control-allow-credentials');
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  }
};

function errorResponse(status) {
  return new Response(JSON.stringify({ detail: 'API access denied.' }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
