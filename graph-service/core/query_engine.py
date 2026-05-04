"""Graph query engine: BFS, DFS, and KNN-seeded expansion.

Used by the FastAPI ``/query`` endpoint. NestJS first runs a vector search
to produce seed node ids, then asks the sidecar to expand them via the graph.
"""

from __future__ import annotations

import networkx as nx

from .graph_builder import get_node_neighbors


def query_bfs(
    g: nx.DiGraph,
    seed_node_ids: list[str],
    hops: int = 2,
    budget_chars: int = 8000,
) -> dict:
    """BFS expansion from seed nodes. Good for 'what connects X to Y?'"""
    visited: set[str] = set()
    for seed in seed_node_ids:
        if g.has_node(seed):
            visited.update(get_node_neighbors(g, seed, hops))

    return _build_result(g, visited, budget_chars, mode="bfs")


def query_dfs(
    g: nx.DiGraph,
    seed_node_ids: list[str],
    hops: int = 3,
    budget_chars: int = 8000,
) -> dict:
    """DFS traversal — good for tracing a specific call chain."""
    visited: set[str] = set()
    stack = list(seed_node_ids)
    depth = 0
    while stack and depth < hops:
        node_id = stack.pop()
        if node_id not in visited and g.has_node(node_id):
            visited.add(node_id)
            stack.extend(list(g.successors(node_id)))
        depth += 1

    return _build_result(g, visited, budget_chars, mode="dfs")


def query_knn_expand(
    g: nx.DiGraph,
    seed_node_ids: list[str],
    hops: int = 2,
    budget_chars: int = 8000,
) -> dict:
    """KNN-seeded expansion: expand vector search seeds via call/import edges.

    EXTRACTED edges are followed transitively (up to ``hops`` more steps);
    INFERRED edges add only the immediate neighbour.
    """
    visited: set[str] = set(seed_node_ids)
    for seed in seed_node_ids:
        if not g.has_node(seed):
            continue
        for neighbor in list(g.predecessors(seed)) + list(g.successors(seed)):
            edge_data = (
                g.get_edge_data(seed, neighbor)
                or g.get_edge_data(neighbor, seed)
                or {}
            )
            if edge_data.get("confidence") == "EXTRACTED":
                visited.update(get_node_neighbors(g, neighbor, max(0, hops - 1)))
            else:
                visited.add(neighbor)

    return _build_result(g, visited, budget_chars, mode="knn")


def _build_result(
    g: nx.DiGraph,
    node_ids: set[str],
    budget_chars: int,
    mode: str,
) -> dict:
    nodes: list[dict] = []
    edges: list[dict] = []
    char_count = 0

    sorted_ids = sorted(
        node_ids,
        key=lambda n: g.degree(n) if g.has_node(n) else 0,
        reverse=True,
    )

    for nid in sorted_ids:
        if not g.has_node(nid):
            continue
        node_data = dict(g.nodes[nid])
        content = node_data.get("content", "")
        char_count += len(content) + len(node_data.get("label", ""))
        if char_count > budget_chars:
            break
        node_data.pop("embedding", None)
        nodes.append(node_data)

    included_ids = {n["id"] for n in nodes}
    for src, tgt, data in g.edges(data=True):
        if src in included_ids and tgt in included_ids:
            edges.append(
                {
                    "source": g.nodes[src].get("label", src),
                    "target": g.nodes[tgt].get("label", tgt),
                    **data,
                }
            )

    token_estimate = char_count // 4

    return {
        "nodes": nodes,
        "edges": edges,
        "token_estimate": token_estimate,
        "mode_used": mode,
    }
