/**
 * Rough token estimator. Uses a 4-chars-per-token heuristic which is close
 * enough for budgeting display purposes; the server applies the real budget
 * cap. Avoids the weight + native deps of `tiktoken` in the CLI.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function estimateNodesTokens(
  nodes: Array<{ content?: string; label?: string }>,
): number {
  return nodes.reduce(
    (sum, n) => sum + estimateTokens(`${n.label ?? ''}\n${n.content ?? ''}`),
    0,
  );
}
