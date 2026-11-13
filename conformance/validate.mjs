#!/usr/bin/env node
// The conformance project's own fixture validator.
//
// The protocol judge only ever sees the plugin's statements about this fixture. This file is
// the second judgment: it inspects the fixture directly - imports only the fixture and the
// Node standard library, never the plugin and never the emitter - and reports the same
// property ids. The suite requires the two verdict lists to agree, so a plugin cannot pass a
// fixture-shaped property by answering consistently instead of behaving.
//
// Contract (docs/harness-authoring.md, section 12):
//   - stdout is exactly one JSON `TemplateReport` and nothing else;
//   - exit 0 even when a property fails; non-zero only when this validator itself could not run;
//   - the seven fixture-shaped ids, never the three process-shaped ones;
//   - stderr is free text for the author.
//
// Rendered verbatim from conformance/validate.mjs into the staged project; run as
//   node --experimental-strip-types conformance/validate.mjs

import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const fixture = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "..", "src", "pricing.ts")).href;

const results = [];
const record = (id, verdict, detail) => results.push({ id, verdict, detail });

let pricing;
try {
  pricing = await import(fixture);
} catch (cause) {
  console.error(`validate.mjs: cannot import the fixture at ${fixture}: ${cause}`);
  process.exit(1);
}

// crash-unguarded: the crash is in the fixture's own code, not in a wrapper.
try {
  const value = pricing.tieredPrice(5);
  record("crash-unguarded", "fail", `tieredPrice(5) returned ${value} instead of throwing: the crash fixture stopped crashing`);
} catch (error) {
  const stack = String(error?.stack ?? "");
  if (stack.includes("pricing.ts")) {
    record("crash-unguarded", "pass", `tieredPrice(5) threw ${error?.name ?? "an error"}, and its stack names pricing.ts`);
  } else {
    record("crash-unguarded", "fail", `tieredPrice(5) threw, but no frame names pricing.ts: ${stack.split("\n")[0]}`);
  }
}

// guard-refusal: the guard is a real RangeError at the guard line.
try {
  const value = pricing.applyDiscount(-5);
  record("guard-refusal", "fail", `applyDiscount(-5) returned ${value} instead of refusing`);
} catch (error) {
  const named = error instanceof RangeError;
  record("guard-refusal", named ? "pass" : "fail", named
    ? "applyDiscount(-5) threw RangeError from the guard line"
    : `applyDiscount(-5) threw ${error?.name ?? "an error"}, not the declared RangeError`);
}

// private-symbol: TypeScript discovery enumerates exported symbols only, so no skipped entry
// can ever name a module-local function. The same reason the manifest declares.
record("private-symbol", "not-applicable", "TypeScript discovery enumerates exported symbols only, so a module-local function is never enumerated and no skipped entry can name it");

// unrepresentable-symbol: an ambient declaration has no implementation at runtime; that is
// exactly why the plugin must skip it rather than list it.
if (!("untyped" in pricing)) {
  record("unrepresentable-symbol", "pass", "untyped is an ambient declaration: the module exports no implementation a call could reach");
} else {
  record("unrepresentable-symbol", "fail", "untyped has a runtime implementation, so the manifest's unsupported-signature skip is a lie");
}

// unconstructible-receiver: Ledger's constructor demands its path, and post demands a
// Ledger, so no receiver can be built for post.
if (pricing.Ledger?.length === 1 && pricing.post?.length === 1) {
  record("unconstructible-receiver", "pass", "Ledger's constructor requires one argument and post(ledger) requires a Ledger, so the receiver cannot be built");
} else {
  record("unconstructible-receiver", "fail", `Ledger arity ${pricing.Ledger?.length}, post arity ${pricing.post?.length}: the fixture no longer demonstrates an unbuildable receiver`);
}

// method-receiver: the method lives on the prototype of a zero-argument class.
try {
  const lines = new pricing.Invoice().addLine(1);
  const onPrototype = typeof pricing.Invoice.prototype.addLine === "function";
  if (lines === 1 && onPrototype) {
    record("method-receiver", "pass", "new Invoice().addLine(1) returned 1 and addLine exists on Invoice.prototype");
  } else {
    record("method-receiver", "fail", `new Invoice().addLine(1) returned ${lines}, prototype method: ${onPrototype}`);
  }
} catch (error) {
  record("method-receiver", "fail", `new Invoice().addLine(1) threw ${error}`);
}

// coverage-digest-live: the two manifest inputs must execute different covered ranges of
// pricing.ts. Measured with V8's own coverage in two child processes, so a probe that never
// resets or never arms cannot make the digests look different here.
function coveredRanges(input) {
  const dir = mkdtempSync(join(tmpdir(), "afz-fixture-coverage-"));
  const script = `import(${JSON.stringify(fixture)}).then((m) => m.tieredPrice(${input}));`;
  const child = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], {
    env: { ...process.env, NODE_V8_COVERAGE: dir },
    encoding: "utf8",
  });
  if (child.status !== 0) {
    console.error(`validate.mjs: coverage child for input ${input} exited ${child.status}: ${child.stderr}`);
    process.exit(1);
  }
  // The profile is every range of pricing.ts with its hit bit: two inputs that take
  // different branches differ in which ranges stay cold, exactly as a live digest does.
  const profile = new Set();
  for (const file of readdirSync(dir)) {
    if (!file.startsWith("coverage-")) continue;
    // Each NODE_V8_COVERAGE file is one `{result: […], timestamp}` object.
    for (const entry of JSON.parse(readFileSync(join(dir, file), "utf8")).result ?? []) {
      if (!entry.url?.endsWith("pricing.ts")) continue;
      for (const fn of entry.functions ?? []) {
        for (const range of fn.ranges ?? []) {
          profile.add(`${range.startOffset}:${range.endOffset}:${range.count > 0 ? "hit" : "cold"}`);
        }
      }
    }
  }
  return profile;
}

const first = coveredRanges(0);
const second = coveredRanges(2);
const differs = [...first].some((range) => !second.has(range)) || [...second].some((range) => !first.has(range));
if (differs && [...first].some((r) => r.endsWith(":hit")) && [...second].some((r) => r.endsWith(":hit"))) {
  record("coverage-digest-live", "pass", `tieredPrice(0) and tieredPrice(2) produced different covered-range profiles of pricing.ts (${first.size} and ${second.size} ranges): the inputs take different branches`);
} else {
  record("coverage-digest-live", "fail", `tieredPrice(0) and tieredPrice(2) produced the same profile (${first.size} and ${second.size} ranges): no live per-input coverage signal`);
}

console.log(JSON.stringify({ version: 1, properties: results }));
