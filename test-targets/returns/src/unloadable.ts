// A module the harness cannot import: its own top level throws. Discovery reads the signature from
// the source text without running the module, so `broken` is still listed; the load fails at
// `prepare`, and only for this symbol — `ready.ts` next door still prepares and calls.

export function broken(value: number): number {
  return value + 1;
}

throw new Error("this module cannot be loaded");
