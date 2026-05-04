"""Build a NetworkX DiGraph from extracted AST nodes/edges.

Resolves edge ``targetLabel`` → ``targetId`` using a label lookup. Unresolved
edges are counted but never raise — external symbols are expected.
"""

from __future__ import annotations

from typing import Optional

import networkx as nx


def build_graph(nodes: list[dict], edges: list[dict]) -> nx.DiGraph:
    """Build a directed graph from node/edge dicts.

    Last-write-wins for duplicate labels; edges referencing unknown labels are
    dropped (they're typically calls into stdlib / external packages).
    """
    g = nx.DiGraph()
    label_to_id: dict[str, str] = {}
    for n in nodes:
        g.add_node(n["id"], **n)
        label_to_id[n["label"]] = n["id"]

    unresolved = 0
    for e in edges:
        source_id = e["sourceId"]
        target_id = label_to_id.get(e.get("targetLabel", ""))
        if target_id and g.has_node(source_id) and g.has_node(target_id):
            g.add_edge(
                source_id,
                target_id,
                type=e["type"],
                confidence=e["confidence"],
                weight=e["weight"],
            )
        else:
            unresolved += 1

    if unresolved:
        print(
            f"[GraphBuilder] {unresolved} edges unresolved "
            "(external symbols — expected)"
        )

    return g


def get_god_nodes(
    g: nx.DiGraph, community_nodes: list[str], top_n: int = 3
) -> list[str]:
    """Return the top ``top_n`` highest-degree nodes within a subgraph."""
    sub = g.subgraph(community_nodes)
    return sorted(
        community_nodes,
        key=lambda n: sub.degree(n),
        reverse=True,
    )[:top_n]


def get_node_neighbors(g: nx.DiGraph, node_id: str, hops: int = 2) -> set[str]:
    """BFS expansion from a node, up to ``hops`` levels deep (both directions)."""
    visited = {node_id}
    frontier = {node_id}
    for _ in range(hops):
        next_frontier: set[str] = set()
        for n in frontier:
            next_frontier.update(g.predecessors(n))
            next_frontier.update(g.successors(n))
        frontier = next_frontier - visited
        visited.update(frontier)
    return visited


def shortest_path(
    g: nx.DiGraph,
    source_label: str,
    target_label: str,
    nodes: list[dict],
) -> Optional[list[str]]:
    """Find shortest path between two nodes by label."""
    label_to_id = {n["label"]: n["id"] for n in nodes}
    src_id = label_to_id.get(source_label)
    tgt_id = label_to_id.get(target_label)
    if not src_id or not tgt_id:
        return None
    try:
        path = nx.shortest_path(g.to_undirected(), src_id, tgt_id)
        return [g.nodes[n].get("label", n) for n in path]
    except nx.NetworkXNoPath:
        return None
