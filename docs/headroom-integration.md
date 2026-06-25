# Headroom Integration

Pathway can optionally route the text it sends to Anthropic through
[Headroom](https://github.com/headroomlabs-ai/headroom), a context-compression
proxy/SDK, to reduce token usage and latency on large prompts (system prompt,
chat history, KPI context, parsed CV/document text). This integration is
**off by default** and is designed to fail safe: if Headroom is disabled,
unreachable, the SDK is missing, or a request times out, Pathway falls back
to the normal, uncompressed Anthropic flow with no change in behavior.

## How it fits in

```
Pathway (api/chat.js, api/summarize.js, api/parse-file.js)
        │
        ▼
  lib/payload-safety.js  — strips secrets/tokens/binary before anything leaves Pathway
        │
        ▼
  lib/headroom.js  — compress via the headroom-ai SDK (HTTP client)
        │
        ▼
  Headroom proxy (local/self-hosted, HEADROOM_PROXY_URL)
        │
        ▼
  Anthropic API (client.messages.create — unchanged)
```

Headroom never replaces the Anthropic call itself — `client.messages.create`
in `api/chat.js` is untouched. Headroom only pre-processes the `system`
string and `messages` array before they're handed to that call.

## Enabling / disabling

All Headroom behavior is controlled by environment variables (see
`.env.example`):

| Variable | Default | Effect |
|---|---|---|
| `HEADROOM_ENABLED` | `0` | Master switch. Must be `1` to do anything. |
| `HEADROOM_MODE` | `off` | Set to anything other than `off` (e.g. `optimize`) once enabled. |
| `HEADROOM_PROXY_URL` | `http://127.0.0.1:8787` | Base URL of your running Headroom proxy. |
| `HEADROOM_COMPRESS_SYSTEM` | `1` | Compress the system prompt (incl. KPI context, AI config, retry corrective notes). |
| `HEADROOM_COMPRESS_CHAT` | `1` | Compress chat history before sending. |
| `HEADROOM_COMPRESS_STRUCTURED_STATE` | `1` | Reserved for compressing structured state (profile/scores/programs) embedded in the system prompt. |
| `HEADROOM_COMPRESS_FILES` | `1` | Compress extracted CV/resume/document text (never the raw file). |
| `HEADROOM_TIMEOUT_MS` | `3000` | Per-request timeout before falling back to uncompressed input. |

With `HEADROOM_ENABLED=0` (the default), `lib/headroom.js` is a no-op
pass-through everywhere it's called — Pathway behaves exactly as it did
before this integration.

## Proxy vs. SDK mode

Pathway uses the official `headroom-ai` npm package (`lib/headroom.js`
dynamically imports it), which is itself an HTTP client for a running
Headroom proxy (`headroom proxy --port 8787`) or Headroom Cloud. There is no
separate "proxy mode" to configure in Pathway — point `HEADROOM_PROXY_URL` at
wherever your proxy/cloud endpoint lives. If the `headroom-ai` package is not
installed or fails to import, Pathway logs it and falls back to the
uncompressed flow automatically.

## What is compressed

- **System prompt** (`api/chat.js`) — includes the admissions-strategist
  instructions, live KPI database summary, AI config sections, and any retry
  corrective note appended on a retry attempt.
- **Chat history** (`api/chat.js`) — the candidate/advisor message array sent
  to `client.messages.create`.
- **Session transcript** (`api/summarize.js`) — the condensed chat transcript
  before it's summarized.
- **Extracted document text** (`api/parse-file.js`) — only the plain text
  extracted from a CV/resume (via `mammoth` for `.docx`, via Anthropic's
  document extraction for PDF). Compression happens **after** extraction.

## What is never sent to Headroom

- Raw base64 or binary file payloads (PDF/DOCX bytes) — `api/parse-file.js`
  extracts text first; Headroom only ever sees the resulting plain text.
- API keys, bearer tokens, cookies/session tokens, signed/temporary blob
  URLs, JWTs, and large base64 blobs — stripped by `lib/payload-safety.js`
  before any text reaches Headroom.

Normal candidate admissions data (CV text, essays, recommender names, emails,
phone numbers, grades, addresses) is **not** stripped, since Headroom is
expected to run locally/self-hosted under your own control.

## Telemetry fields

`lib/usage.js`'s `recordUsage()` now accepts optional metadata, stored
alongside each usage record (never raw prompt/candidate text):

- `endpoint` — which API route produced the record (`chat`, `summarize`, `parse-file`)
- `attempt` — retry attempt number (chat only)
- `useWebSearch` — whether the web_search tool was enabled for that call
- `stopReason` — the Anthropic response's `stop_reason`
- `headroomEnabled` / `headroomMode` — whether Headroom was active for that call
- `headroomError` — short error string if compression failed and fell back
- `originalInputChars` / `optimizedInputChars` — character counts before/after compression (no content)
- `estimatedCompressionPercent` — derived savings estimate

`api/admin-usage.js` aggregates these into cost/token breakdowns by feature,
endpoint, web-search usage, and Headroom usage, plus average compression %
and a list of recent high-cost calls — without exposing any candidate
content.

## Local dev instructions

1. Install and run a local Headroom proxy per the
   [Headroom README](https://github.com/headroomlabs-ai/headroom):
   ```bash
   npx headroom-ai proxy --port 8787
   ```
2. In `.env`, set:
   ```
   HEADROOM_ENABLED=1
   HEADROOM_MODE=optimize
   HEADROOM_PROXY_URL=http://127.0.0.1:8787
   ```
3. Run Pathway as usual (`npm run dev` / `npm run dev:api`) and use the chat
   feature — Headroom compresses the system prompt and chat history
   transparently. If the proxy isn't running, requests fall back to the
   normal uncompressed flow automatically (you'll see a `headroomError` in
   the usage record, and chat keeps working).
