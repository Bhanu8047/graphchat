"""Leiden community detection via graspologic.

Runs over the NetworkX graph alone — no embeddings, no vector store. Groups
nodes by edge density (who calls whom, who imports whom).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import networkx as nx
from graspologic.partition import leiden

from .graph_builder import get_god_nodes


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def cluster(g: nx.DiGraph, repo_id: str, trials: int = 10) -> list[dict]:
    """Run Leiden on the graph. Returns a list of community dicts.

    Multiple trials → keeps the best modularity partition (handled by
    ``graspologic.partition.leiden`` internally).
    """
    if g.number_of_nodes() == 0:
        return []

    g_und = g.to_undirected()
    nx.set_edge_attributes(g_und, 1, "weight")

    components = list(nx.connected_components(g_und))
    if not components:
        return []

    all_communities: list[dict] = []

    for component in components:
        if len(component) < 2:
            node_id = next(iter(component))
            label = g.nodes[node_id].get("label", node_id)
            all_communities.append(
                {
                    "id": str(uuid.uuid4()),
                    "repoId": repo_id,
                    "label": label,
                    "nodeIds": [node_id],
                    "godNodeId": node_id,
                    "updatedAt": _now(),
                }
            )
            continue

        subgraph = g_und.subgraph(component).copy()

        try:
            community_map = leiden(subgraph, trials=trials, random_seed=42)
        except Exception as e:  # noqa: BLE001 — Leiden may fail on tiny components
            print(f"[Leiden] Error on component of size {len(component)}: {e}")
            continue

        buckets: dict[int, list[str]] = {}
        for node_id, comm_id in community_map.items():
            buckets.setdefault(comm_id, []).append(node_id)

        for _, node_ids in buckets.items():
            god_nodes = get_god_nodes(g, node_ids, top_n=1)
            god_node_id = god_nodes[0] if god_nodes else node_ids[0]
            god_label = g.nodes[god_node_id].get("label", god_node_id)
            label = f"{god_label} Community"

            all_communities.append(
                {
                    "id": str(uuid.uuid4()),
                    "repoId": repo_id,
                    "label": label,
                    "nodeIds": node_ids,
                    "godNodeId": god_node_id,
                    "updatedAt": _now(),
                }
            )

    return all_communities


def get_surprising_edges(
    g: nx.DiGraph, communities: list[dict]
) -> list[dict]:
    """Cross-community edges (architectural surprises). Top 10 returned."""
    node_to_community: dict[str, str] = {}
    for c in communities:
        for nid in c["nodeIds"]:
            node_to_community[nid] = c["id"]

    cross_edges: list[dict] = []
    for src, tgt, data in g.edges(data=True):
        src_comm = node_to_community.get(src)
        tgt_comm = node_to_community.get(tgt)
        if src_comm and tgt_comm and src_comm != tgt_comm:
            cross_edges.append(
                {
                    "source": g.nodes[src].get("label", src),
                    "target": g.nodes[tgt].get("label", tgt),
                    "type": data.get("type", "unknown"),
                    "confidence": data.get("confidence", "INFERRED"),
                    "src_community": src_comm,
                    "tgt_community": tgt_comm,
                }
            )

    return cross_edges[:10]
