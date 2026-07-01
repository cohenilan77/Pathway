# ADAPTIVE_GRAD - AI-Driven Grad/PhD Journey Advisor

## What it is

An AI-driven, stage-based advisory flow for Graduate and PhD candidates. Instead of a fixed script it uses Claude with tools to move each candidate through a personalized journey: intake, profile, analysis, portfolio, narrative, CV, essays, and interview prep.

Enabled via feature flag. When off, the existing AdvisorAgent runs unchanged for all candidate types.

## Feature flag

| Variable | Where | Required value |
|---|---|---|
| `ADAPTIVE_GRAD` | Vercel env (server-side) | `true` |

Default is off (`undefined` or any other value).

The candidate UI reads this server flag from `/api/agents/orchestrate`, so no separate client flag is required.

## Who it applies to

- Graduate and PhD candidates
- NOT Undergraduate, NOT Personal Development

## Journey stages

```
intake -> profile -> analysis -> portfolio -> narrative -> cv -> essays -> interview
```

Stages advance only forward. The AI calls `advance_stage` when a stage is complete.

## Architecture

```
api/chat.js
  |__ isGradPhD check + flag check
      |__ JourneyAdvisor.chat()
            |__ buildJourneySystemPrompt()   (lib/agents/journey/prompts.js)
            |__ Claude + tool loop (up to 8 iterations)
            |__ Tool handlers:
                  parse_cv          -> heuristic GPA/test extraction
                  fetch_benchmark   -> lib/agents/journey/tools/benchmarks.js
                  score_profile     -> lib/scoring.js computeFit()
                  check_risk        -> lib/agents/journey/tools/risk.js
                  set_chosen_schools -> marks portfolioShown = true
                  build_portfolio   -> benchmark + score + risk for each school
                  show_narrative_options -> gated by portfolioShown
                  advance_stage     -> lib/agents/journey/state.js
                  open_screen       -> signals frontend to switch tab
```

## Persistence

Journey state is stored in Redis under `journey:grad:{candidateId}` with a 90-day TTL.

Default state shape:
```json
{
  "stage": "intake",
  "category": null,
  "name": null,
  "collected": {},
  "chosenSchools": [],
  "portfolio": null,
  "narrative": null,
  "portfolioShown": false
}
```

## Hard gates

Candidates are "locked" from a program when:
- GPA gap > 0.5 (candidate GPA is more than 0.5 below median)
- Test score gap > 50 (candidate score is more than 50 below median)

When locked, fit score is capped at 49 and tasks are generated to address the gap.

## Narrative gate

The `show_narrative_options` tool is blocked until `portfolioShown` is `true`. This prevents narrative strategy from being discussed before the candidate has seen their school list.

## Risk checks

`checkRisk` generates risk flags and actionable tasks for:
- Hard gate lock (GPA/test gap)
- Unverified benchmark data
- Thin profile (fewer than 2 key evidence fields)
- Distant recommenders (senator, minister, president, CEO, etc.)
- Career gap

Tasks flow from the API response back to `src/App.jsx` via `data.pendingTasks`, which are shown on the Dashboard (not in the Advisor rail when ADAPTIVE_GRAD is on).

## UI changes (when flag is on + grad/PhD)

The Advisor right rail switches from "Your tasks" to a Journey Rail:

- **Next Step** button (purple gradient) - sends "I would like to move to the next step."
- **Stage buttons** (Profile, Analysis, Portfolio, Narrative, CV, Essays, Interview):
  - Locked (lock icon) until reached
  - Highlighted + bold when current
  - Checkmarked (green) when past

Tasks are removed from the Advisor rail and remain visible on the Dashboard only.

## Benchmark data sourcing

Three-tier lookup for each school's median GPA and test score:

1. Redis `program:*` keys (from existing KPI import)
2. Redis `admitrate:{name}` cache
3. Anthropic web search (2 uses max per conversation)

When data cannot be verified, `verified: false` and a `confidenceNote` are returned. The AI is instructed to disclose low confidence to the candidate.

## Testing

```bash
node api/__tests__/adaptive-grad.test.js
```

21 tests covering: flag routing, hard gates, risk detection, narrative gate, stage ordering, rail visibility.
