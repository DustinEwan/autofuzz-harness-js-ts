// Two template properties about a symbol the plugin cannot fully describe.
//
// `opaque-return`: a call whose whole return value has no wire form — a symbol, a live closure —
// is still a call that succeeded, so it answers `ok` and carries no value. `unbuildable-symbol`:
// discovery is a parse that never runs the module, so a module whose own top level throws is still
// listed as a target, and the failure belongs to `prepare`, for that symbol alone.

import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";

import { packageRoot, startPlugin } from "./support/plugin.mjs";

const targetRoot = join(packageRoot, "test-targets", "returns");
const number = (value) => ({ node: "number", value });

const discover = (plugin) => plugin.call("discover", { root: targetRoot });
const named = (discovery, name) => discovery.targets.find((candidate) => candidate.name === name);
const names = (discovery) => discovery.targets.map((candidate) => candidate.name).join(", ");

test("a return value with no wire form answers ok and carries no value", async () => {
  const plugin = startPlugin();
  try {
    const discovery = await discover(plugin);
    for (const name of ["reading", "holder"]) {
      const target = named(discovery, name);
      assert.ok(target, `discovery lost ${name}: ${names(discovery)}`);
      const outcome = await plugin.call("invoke", {
        invocationId: 1,
        targetId: target.id,
        values: [number(3)],
        deadlineMs: 2000,
        collectCoverage: false,
      });
      assert.equal(outcome.kind, "ok", `${name} did not answer ok: ${JSON.stringify(outcome)}`);
      assert.ok(
        !("value" in outcome),
        `${name} carried a stand-in for a value the wire cannot carry: ${JSON.stringify(outcome)}`,
      );
    }
  } finally {
    plugin.close();
  }
});

test("a module that will not load is listed, skipped at prepare, and leaves its neighbour callable", async () => {
  const plugin = startPlugin();
  try {
    const discovery = await discover(plugin);
    const broken = named(discovery, "broken");
    const ready = named(discovery, "ready");
    assert.ok(broken, `discovery dropped the symbol whose module cannot be loaded: ${names(discovery)}`);
    assert.ok(
      !discovery.skipped.some((candidate) => candidate.name === "broken"),
      "discovery skipped the unloadable symbol, which it cannot know about without running the module",
    );

    const prepared = await plugin.call("prepare", { targetId: broken.id, values: [number(0)] });
    assert.equal(prepared.ok, false, JSON.stringify(prepared));
    assert.equal(prepared.reason, "discovery-error", JSON.stringify(prepared));

    const sibling = await plugin.call("prepare", { targetId: ready.id, values: [number(1)] });
    assert.equal(sibling.ok, true, `the unloadable module took its neighbour down: ${JSON.stringify(sibling)}`);
    const outcome = await plugin.call("invoke", {
      invocationId: 1,
      targetId: ready.id,
      values: [number(1)],
      deadlineMs: 2000,
      collectCoverage: false,
    });
    assert.equal(outcome.kind, "ok", JSON.stringify(outcome));
    assert.deepEqual(outcome.value, { node: "number", value: 2 });
  } finally {
    plugin.close();
  }
});
