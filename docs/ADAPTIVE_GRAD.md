# ADAPTIVE_GRAD

## Scope and flag

The adaptive advisor applies only when `ADAPTIVE_GRAD=true` and the category is `Graduate` or `Postgraduate / Doctoral`. The flag defaults off. Undergraduate and Personal Development continue through the existing `api/chat.js` path.

The client reads the resolved flag from `GET /api/agents/orchestrate`. Adaptive intake and eligible turns post to `/api/agents/orchestrate`; all legacy turns post to `/api/chat`.

## State

State is stored at `journey:{candidateId}`:

```js
{
  category,
  subtype,
  name,
  collected: {},
  flags: {
    profileConfirmed,
    scoresEmitted,
    programsShown,
    chosenSchools: [],
    narrativeChoice: null,
    stage: 'intake'
  },
  history: [],
  updatedAt
}
```

`patchJourney` deep-merges `collected` and `flags`. Stage progression only moves forward.

## Tools

`GradAgent` extends `BaseAgent` and runs a model-directed tool loop with:

- `read_state`, `write_state`
- `parse_cv`, `score_profile`, `build_portfolio`
- `set_chosen_schools`
- `present_narrative_options`, `craft_narrative`
- `optimize_cv`, `workshop_essay`
- `run_mock_interview`, `predict_odds`
- `advance_stage`, `emit_ui`

Benchmarks are fetched from the program database or cache first, then web search. Unverified benchmarks produce `confidence: "low"`. `applyHardGates` deterministically locks a program when GPA is more than 0.5 below the median or the test score is more than 50 below the median. Per-school risks populate `riskFlags` and create Dashboard tasks.

## One ordering rule

The school list must be shown before narrative. `present_narrative_options` and `craft_narrative` refuse while `flags.programsShown` is false. All other ordering is selected by the model.

## Advisor rail

The adaptive Advisor replaces its Tasks rail with:

- `Next`
- `Profile`
- `Analysis`
- `Portfolio`
- `Narrative`
- `CV`
- `Essays`
- `Interview`

The current stage is highlighted, earlier stages show a checkmark, and unreached stages are disabled. Tasks remain on Dashboard.

| Stage | Unlocked subjects |
|---|---|
| intake | none |
| profile | Profile |
| analysis | Profile, Analysis |
| portfolio | Profile, Analysis, Portfolio |
| narrative | Profile, Analysis, Portfolio, Narrative |
| cv | Profile, Analysis, Portfolio, Narrative, CV |
| essays | Profile, Analysis, Portfolio, Narrative, CV, Essays |
| interview | Profile, Analysis, Portfolio, Narrative, CV, Essays, Interview |

`emit_ui` can open `analysis`, `universities`, or `narrative`, and can open the `upgradePivot` modal. Legacy phrase matching remains in place when the feature is off.

## Tests

```bash
node --test api/__tests__/adaptive-grad.test.js src/components/candidate/__tests__/adaptive-grad-ui.test.js
```
