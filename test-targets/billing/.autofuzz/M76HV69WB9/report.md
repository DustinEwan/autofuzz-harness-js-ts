# autofuzz scan M76HV69WB9

`/home/dusti/repos/autofuzz/packages/harness-js/test-targets/billing` at git:0da0637
harness js-ts 0.1.0 (design-time; coverage, stateful, concurrent)

Started 2026-11-12T00:17:11Z, finished 2026-11-12T00:17:54Z — stopped: budget.

Engine 0.1.0 with seed 0x5e3a91c4, config sha256:4e972f8f6e8775c2d21f383ea4bf037846132faa0d434cb6a8e328d72a7fb399.

## Summary

| | |
|---|---|
| targets discovered | 46 |
| fuzzable | 38 |
| skipped | 8 |
| materialization: constructible | 38 |
| materialization: fixture-required | 8 |
| invocations | 30000 |
| corpus entries | 85 |
| coverage | 209 edges (62.4%) |
| deadline exceeded | 0 |
| ran to deadline | 0 |
| plugin restarts | 0 |
| unattempted invocations | 0 |
| findings | 1 |

## Skipped targets

| target | reason | blocked by | unlocks |
|---|---|---|---|
| `afz:t:2f815f0401fc` | unconstructible-parameter | `Account` at `receiver` | 3 |
| `afz:t:bf7f287d2810` | unconstructible-parameter | `Account` at `receiver` | 3 |
| `afz:t:e19665024a16` | unconstructible-parameter | `Account` at `receiver` | 3 |
| `afz:t:40afc9460fbe` | unconstructible-parameter | `Account` at `receiver` | 3 |
| `afz:t:94c159b7b552` | unconstructible-parameter | `DunningPlan` at `receiver` | 1 |
| `afz:t:0084f327f895` | unconstructible-parameter | `DunningPlan` at `receiver` | 1 |
| `afz:t:c4a05355cad8` | unconstructible-parameter | `TaxTable` at `receiver` | 1 |
| `afz:t:ece09fd8e79b` | unconstructible-parameter | `TaxTable` at `receiver` | 1 |

## Findings (1)

### afz:f:135ede04 — failed (high)

`afz:t:03eb7170b1f4`: Cannot read properties of undefined (reading 'code') via `engine-error-outside-declared-channel`

- Fault class: `TypeError`
  - src/reissue.ts:54:46 in `Object.reissueSelfRedeemed [as call]`
  - /home/dusti/repos/autofuzz/packages/harness-js/dist/invoke.js:258:30 in `callTarget`
  - /home/dusti/repos/autofuzz/packages/harness-js/dist/invoke.js:335:31 in `run`
- Input: `inputs/afz-f-135ede04.json` (value-tree+json)
- Minimized input: not shrunk again, because an earlier scan reported this identity
- Reproducer: none emitted
- Reproduced: no; first seen at invocation 3644
- Seen before: this project reported this identity in an earlier scan
- Identity: `afz:i:2a45cdeef81f06b4`

## Artifacts

- Corpus: `corpus/`
- Coverage: `coverage.json`
- Engine log: `engine.log`

