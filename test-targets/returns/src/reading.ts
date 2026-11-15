// Two return values the wire vocabulary has no node for. The calls succeed, so each must answer
// `ok` and carry no value: an invented stand-in would report a result the target never returned.

export function reading(value: number): symbol {
  return Symbol("reading:" + String(value));
}

export function holder(value: number): () => number {
  return () => value;
}
