#!/usr/bin/env node
// Render the conformance fixture project for the js-ts harness.
//
// `afz validate-harness` and `afz-xtask check-harness` validate a plugin against the template
// (`crates/afz-conformance/template/v1.json`): twelve semantic properties stated as wire-level
// expectations. This emitter writes a small TypeScript package that realizes every property
// the language can express, the `autofuzz.json` that points the plugin at it, and
// `afz-conformance-manifest.json` naming the symbol behind each property. The suite, not this
// file, decides pass/fail.
//
// Usage:
//   node conformance/emit.mjs --out /tmp/conformance-js
//
// One property is declared not-applicable, and the CI gate asserts that this is the only
// such line for js-ts: TypeScript discovery enumerates exported symbols only, so a
// module-local function never appears in `skipped` to be named at all. Declaring the absence
// is honest; inventing a fake "private" symbol to fake the pass is not.
//
// The rendered project also carries the fixture validator, `conformance/validate.mjs`, copied
// in verbatim from this directory: it re-checks the seven fixture-shaped properties by
// importing the fixture directly, with the plugin out of the path, and the suite requires its
// verdicts to agree with the plugin's.

import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The fixture. Every symbol carries a comment naming the template property it realizes, so
// a reader of a rendered tree can trace a FAIL line back to the code that caused it.
const PRICING_TS = `// Rendered by conformance/emit.mjs - do not edit by hand.

/** A store handle the harness cannot build: the constructor requires an argument. */
export class Ledger {
  // An explicit assignment, not a readonly parameter property: the fixture validator runs
  // this file through Node's own type stripping, which accepts erasable syntax only.
  path: string;
  constructor(path: string) {
    this.path = path;
  }
}

/** A receiver the harness can construct with no arguments. */
export class Invoice {
  lines: number[] = [];

  /** method-receiver: \`prepare\` must build this receiver and answer ok. */
  addLine(amount: number): number {
    this.lines.push(amount);
    return this.lines.length;
  }
}

/**
 * crash-unguarded, coverage-digest-live, reproducer-script.
 *
 * Two branches the coverage inputs take separately; the property read on the out-of-range
 * element is the unguarded crash the suite drives with quantity 5.
 */
export function tieredPrice(quantity: number): number {
  const tiers = quantity < 2 ? [10, 20] : [30, 40, 50];
  const tier = tiers[quantity];
  return (tier as any).amount;
}

/** guard-refusal: the out-of-range input throws RangeError on a guard line. */
export function applyDiscount(amount: number): number {
  if (amount < 0 || amount > 100) {
    throw new RangeError("amount out of range");
  }
  return amount * 0.9;
}

/**
 * unrepresentable-symbol: an ambient declaration has no implementation the plugin can call,
 * so discovery reports it as \`unsupported-signature\` rather than listing it as fuzzable.
 * (A module-local function would be the python-shaped realization, but TypeScript discovery
 * never enumerates unexported symbols at all - that property is declared not-applicable in
 * the manifest instead.)
 */
export declare function untyped(x: unknown): unknown;

/** unconstructible-receiver: blocked by Ledger, whose constructor needs an argument. */
export function post(ledger: Ledger): string {
  return ledger.path;
}

/** stdout-purity: writes to stdout first; the protocol channel must survive it. */
export function noisy(message: string): string {
  console.log(message);
  return message;
}

/** deadline-sleep: blocks the event loop far past any deadline the suite passes. */
export function spin(ms: number): string {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  return "done";
}

/**
 * opaque-return: the symbol this returns has no wire form, so \`invoke\` must answer \`ok\` and
 * carry no value. Failing the call because the result cannot be described, or inventing a node
 * for it, is exactly what this property catches.
 */
export function reading(value: number): symbol {
  return Symbol("reading:" + String(value));
}
`;

// Its own module, on purpose: the top level throws, so nothing else may share the file. The
// property is about isolation as much as about the skip, and discovery reads this file with the
// TypeScript compiler without ever running it, so `broken` is still listed as a target.
const UNLOADABLE_TS = `// Rendered by conformance/emit.mjs - do not edit by hand.

/**
 * unbuildable-symbol: discovery accepts this signature from the source text, so the symbol is
 * listed in \`targets\`. The module's own top level throws, so the harness's import of it fails
 * when the symbol is prepared, and \`prepare\` must answer \`ok: false\` with reason
 * \`discovery-error\` - for this symbol alone, because every other fixture symbol lives in
 * \`pricing.ts\`, which loads.
 */
export function broken(value: number): number {
  return value + 1;
}

throw new Error("afz-conformance: this module cannot be loaded");
`;

const autofuzz = {
  project: "conformance-js",
  harness: {
    name: "js-ts",
    // No `command`: the plugin the suite launches is the one `afz-harness.json` names, and a
    // rendered project that baked in the plugin's path would break the moment it is rendered
    // under the registry instead of the checkout.
    include: ["src/**/*.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.d.ts"],
  },
  oracles: {},
  budget: { invocations: 2000, wallClockMs: 60000, workers: 0, maxCorpus: 256, strategy: "guided" },
  output: { dir: ".autofuzz", renderers: ["json"] },
};

const value = (node) => ({ ...node, provenance: "user" });
const number = (n) => value({ node: "number", value: n });
const string = (s) => value({ node: "string", value: s });

const manifest = {
  templateVersion: 1,
  properties: {
    "crash-unguarded": { symbol: "tieredPrice", input: [number(5)] },
    "guard-refusal": { symbol: "applyDiscount", input: [number(-5)] },
    "private-symbol": {
      notApplicable:
        "TypeScript discovery enumerates exported symbols only, so a module-local function is never enumerated and no skipped entry can name it; visibility here is an export decision, not a fuzzability skip",
    },
    "unrepresentable-symbol": { symbol: "untyped" },
    "unconstructible-receiver": { symbol: "post", blockedByType: "Ledger" },
    "method-receiver": { symbol: "Invoice.addLine", input: [number(1)] },
    // 0 takes the first branch and reads clean; 2 takes the second. Same function, different
    // edges: a dead or never-reset probe answers identical digests and fails.
    "coverage-digest-live": { symbol: "tieredPrice", inputs: [[number(0)], [number(2)]] },
    "stdout-purity": { symbol: "noisy", input: [string("conformance noise")] },
    "reproducer-script": { symbol: "tieredPrice", input: [number(5)] },
    // 30 000 ms against the suite's 1000 ms default: only a real cut answers inside it.
    "deadline-sleep": { symbol: "spin", input: [number(30000)] },
    // A return value the wire cannot carry: the call must still answer ok, with no value.
    "opaque-return": { symbol: "reading", input: [number(3)] },
    // Listed by discovery, refused by the harness's own import of its module; `Invoice.addLine`
    // above is the isolation sibling that must still prepare.
    "unbuildable-symbol": { symbol: "broken", input: [number(0)] },
  },
  // The project judges its own fixture: Node strips the type annotations itself, so the
  // validator imports `src/pricing.ts` with no plugin and no emitter in the path.
  validator: ["node", "--experimental-strip-types", "conformance/validate.mjs"],
};

function emit(out) {
  mkdirSync(join(out, "src"), { recursive: true });
  mkdirSync(join(out, "conformance"), { recursive: true });
  writeFileSync(join(out, "src", "pricing.ts"), PRICING_TS);
  writeFileSync(join(out, "src", "unloadable.ts"), UNLOADABLE_TS);
  copyFileSync(new URL("./validate.mjs", import.meta.url), join(out, "conformance", "validate.mjs"));
  writeFileSync(join(out, "autofuzz.json"), JSON.stringify(autofuzz, null, 2) + "\n");
  writeFileSync(join(out, "afz-conformance-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

const flag = process.argv.indexOf("--out");
if (flag === -1 || process.argv[flag + 1] === undefined) {
  console.error("usage: emit.mjs --out DIR");
  process.exit(2);
}
emit(process.argv[flag + 1]);
console.log(process.argv[flag + 1]);
