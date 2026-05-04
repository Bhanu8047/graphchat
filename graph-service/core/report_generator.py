"""Generate ``GRAPH_REPORT.md`` — a compressed, token-efficient context document.

This is the core token-minimization artifact: AI agents fetch it once and use
it for all subsequent queries instead of re-reading raw source files.
"""

from __future__ import annotations

from datetime import datetime, timezone


def generate_report(
    nodes: list[dict],
    edges: list[dict],
    communities: list[dict],
    repo_name: str,
) -> str:
    extracted = [n for n in nodes if n.get("confidence") == "EXTRACTED"]
    inferred = [n for n in nodes if n.get("confidence") == "INFERRED"]

    god_node_ids = {c["godNodeId"] for c in communities}
    god_nodes = [n for n in nodes if n["id"] in god_node_ids]

    lines: list[str] = [
        f"# GRAPH_REPORT — {repo_name}",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        f"Nodes: {len(nodes)} ({len(extracted)} EXTRACTED, {len(inferred)} INFERRED)",
        f"Edges: {len(edges)}",
        f"Communities: {len(communities)}",
        "",
        "## God Nodes (Highest Connectivity)",
        "> These are the architectural hub concepts. Start here.",
        "",
    ]

    for gn in god_nodes[:10]:
        lines.append(f'### {gn["label"]} ({gn["type"]})')
        lines.append(f'{gn["content"][:200]}')
        if gn.get("sourceFile"):
            lines.append(
                f'*Source: `{gn["sourceFile"]}`:{gn.get("sourceLine", "")}*'
            )
        lines.append("")

    lines += [
        "## Communities",
        "",
    ]

    node_map = {n["id"]: n for n in nodes}
    for c in communities:
        lines.append(f'### {c["label"]}')
        lines.append(f'Nodes: {len(c["nodeIds"])}')
        member_labels: list[str] = []
        for nid in c["nodeIds"][:5]:
            n = node_map.get(nid)
            if n:
                member_labels.append(f'`{n["label"]}`')
        if member_labels:
            suffix = "..." if len(c["nodeIds"]) > 5 else ""
            lines.append(f'Members: {", ".join(member_labels)}{suffix}')
        lines.append("")

    raw_token_estimate = len(nodes) * 800
    report_token_estimate = len(" ".join(lines)) // 4
    lines += [
        "## Agent Instructions",
        "1. Use this report to understand the codebase structure at a glance.",
        "2. Call the `/api/search` endpoint for semantic queries.",
        "3. Call `/api/graph/community/{id}/prompt` to get all nodes in a community.",
        "4. Never read raw files — query the graph instead.",
        f"5. Token cost of this report: ~{report_token_estimate} tokens vs"
        f" ~{raw_token_estimate} tokens to read all raw files.",
    ]

    return "\n".join(lines)
