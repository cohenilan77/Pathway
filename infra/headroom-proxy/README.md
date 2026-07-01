# Headroom-compatible compression proxy (deployable)

A standalone deployable version of `scripts/headroom-proxy.js`, packaged as
its own Vercel project so it gets a public URL reachable from Pathway's main
Vercel deployment (unlike `127.0.0.1`, which only works for local dev).

Implements the same wire protocol the `headroom-ai` npm SDK calls:
- `GET /health`
- `POST /v1/compress`

with real token-reducing transforms: whitespace collapsing, duplicate
message removal, and budget-based truncation of older chat turns.

## Deploy

This folder is set up as an independent Vercel project (separate from the
main `pathway` project). In the Vercel dashboard:

1. Add New → Project → import this repo, but set **Root Directory** to
   `infra/headroom-proxy`.
2. Deploy. No environment variables are required for this service itself.
3. Copy the resulting deployment URL (e.g.
   `https://<this-project>.vercel.app`) and set it as `HEADROOM_PROXY_URL`
   in the main `pathway` Vercel project's environment variables.
