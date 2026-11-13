# autofuzz harness: TypeScript and JavaScript

The harness plugin the autofuzz engine loads for TypeScript and JavaScript targets. It discovers exported functions, builds arguments from generated values, invokes each entry point, and answers with coverage digests, fault outcomes, and reproducer scripts over the plugin protocol (`afz/1`).

Host runtime: Node 24. The plugin transpiles TypeScript with the pinned TypeScript compiler and reads coverage from `NODE_V8_COVERAGE`.

## Install

```sh
afz install-harness https://github.com/DustinEwan/autofuzz-harness-js-ts.git
```

Install runs `npm ci`, then `npm run build`, then drives the conformance suite against the built plugin; a plugin that violates any rule is not recorded. `afz harnesses` lists what the registry holds.

A scan project names the harness and no command:

```json
{ "codebase": { "harness": "js-ts" } }
```

The engine resolves the plugin argv from the registry record. To try the plugin on the fixture that ships here:

```sh
afz probe-plugin --path test-targets/billing
```

## Author

Fetch dependencies once, edit, validate:

```sh
npm ci
afz validate-harness
```

`afz validate-harness` with no argument validates the repository it is run in: it runs the `build` argv, renders the conformance project with this repository's own emitter, drives the suite, and reports rule by rule. It never touches an install or a registry, and it never runs `npm ci` — dependency fetching belongs to `afz install-harness` alone, because `npm ci` deletes and reinstalls `node_modules`.

Run the unit tests and the wire-vocabulary contract tests:

```sh
AFZ_DOCS=/path/to/autofuzz/docs npm test
```

`AFZ_DOCS` points at an engine checkout; `test/contract.test.mjs` reads `docs/schema/` and `docs/architecture.md` from it. The default is the sibling checkout `../autofuzz/docs`; CI sets the variable explicitly.

## afz-harness.json

| key | meaning |
|---|---|
| `install` | argv that fetch dependencies; run only by `afz install-harness`, never by `afz validate-harness` |
| `build` | argv that compile the plugin; run by both commands, after `install`, in order, in this root; a failure names the stage, the program, and the status |
| `command` | the plugin argv; an element that names an existing file is resolved against this root |
| `conformance.emitter` | a program run as `<argv…> --out <dir>` that renders the whole conformance scan project — source tree, `autofuzz.json`, and `afz-conformance-manifest.json` — into the directory it is given; that rendered project is the only project validation ever drives |
| `conformance.deadlineMs` | the per-invocation deadline the suite passes, default 1000 |

The emitter is a standalone program: `conformance/emit.mjs` imports `node:fs`, `node:path`, and `node:url` only, so it needs Node and nothing else — no `node_modules`, no `dist/`. A harness with no `conformance` block installs only with `--no-validate`, and `afz validate-harness` refuses it by name, because there is nothing to validate against.

## The conformance project

`conformance/emit.mjs` renders a small pricing package and the manifest that names the symbol behind each template property. `conformance/validate.mjs` is the project's own fixture validator: it imports the rendered fixture and the Node standard library only — never the plugin, never the emitter — and the suite requires its verdicts to agree with the plugin's.

## The contract

`docs/harness-authoring.md` in the engine repository, <https://github.com/DustinEwan/autofuzz>, states the plugin contract this harness implements.
