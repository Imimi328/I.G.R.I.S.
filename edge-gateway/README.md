# I.G.R.I.S. API Gateway

This Worker is the only public path to the VPS API. It runs on `igris.site/api/*`, rejects address-bar navigation and cross-site browser requests, removes any caller-supplied gateway header, and adds the encrypted `IGRIS_GATEWAY_KEY` secret before forwarding to `api.igris.site`.

The matching VPS value is `GATEWAY_SHARED_SECRET`. It must be at least 32 characters and must never be committed, returned to the browser, or placed in frontend JavaScript.

## Safe rollout order

1. Deploy this Worker and store `IGRIS_GATEWAY_KEY` with `wrangler secret put IGRIS_GATEWAY_KEY`.
2. Verify `igris.site/api/health` works for same-origin fetches and fails for browser navigation.
3. Change the frontend API base to same-origin and deploy Pages.
4. Set the matching `GATEWAY_SHARED_SECRET` and `GATEWAY_ENFORCEMENT=true` in `/etc/igris/igris.env`.
5. Restart only `igris-api.service`, then verify direct `api.igris.site/api/*` requests return `403`.

Never enable VPS enforcement before the Worker secret and same-origin frontend are live.
