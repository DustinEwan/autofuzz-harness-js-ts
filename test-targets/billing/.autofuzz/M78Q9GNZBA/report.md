# autofuzz scan M78Q9GNZBA

`/home/dusti/repos/autofuzz/packages/harness-js/test-targets/billing` at git:8bbdf07
harness js-ts 0.1.0 (design-time; coverage, stateful, concurrent, reproducer)

Started 2026-11-12T20:30:52Z, finished 2026-11-12T20:30:59Z — stopped: budget.

Engine 0.1.0 with seed 0x5e3a91c4, config sha256:f366c373c189ba51939c96b879181bdd0a91003e2634b992877320e8232c13b0.

## Summary

| | |
|---|---|
| targets discovered | 46 |
| fuzzable | 38 |
| skipped | 8 |
| materialization: constructible | 38 |
| materialization: fixture-required | 8 |
| invocations | 3000 |
| corpus entries | 83 |
| coverage | 207 edges (62.2%) |
| deadline exceeded | 0 |
| ran to deadline | 0 |
| plugin restarts | 0 |
| unattempted invocations | 0 |
| findings | 0 |

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

## Findings (0)

No finding met the configured oracles.
