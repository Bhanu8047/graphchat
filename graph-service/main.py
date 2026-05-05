"""GRAPHCHAT Graph Service — FastAPI application.

Port 5000. Internal only (not exposed via Nginx). Called by NestJS via the
``GraphBridgeService``.
"""

from __future__ import annotations

import json
import os
import time
from contextlib import asynccontextmanager

import redis as redis_client
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient, UpdateOne

from core.ast_extractor import extract_repo
from core.graph_builder import build_graph, shortest_path
from core.leiden_clusterer import cluster, get_surprising_edges
from core.query_engine import query_bfs, query_dfs, query_knn_expand
from core.report_generator import generate_report
from models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    ClusterRequest,
    ClusterResponse,
    IngestRequest,
    QueryRequest,
    QueryResponse,
)

load_dotenv()

# ── Repo-path sandboxing ──────────────────────────────────────────────────────
# Defense-in-depth: even though only the trusted NestJS caller hits this
# service, we never let an analyze request reach an arbitrary path on disk.
# Only paths under ``GRAPH_REPO_ROOT`` (the mounted /repos volume) are allowed.
GRAPH_REPO_ROOT = os.path.realpath(os.getenv("GRAPH_REPO_ROOT", "/repos"))


def _safe_repo_path(raw: str) -> str:
    """Resolve ``raw`` and ensure it lives under ``GRAPH_REPO_ROOT``."""
    resolved = os.path.realpath(raw)
    root = GRAPH_REPO_ROOT.rstrip(os.sep) + os.sep
    if not (resolved == GRAPH_REPO_ROOT or resolved.startswith(root)):
        raise HTTPException(
            status_code=400,
            detail=f"repo_path must live under {GRAPH_REPO_ROOT}",
        )
    if not os.path.exists(resolved):
        raise HTTPException(status_code=400, detail=f"Path not found: {raw}")
    return resolved


# ── DB clients ───────────────────────────────────────────────────────────────
MONGO_URI = os.getenv(
    "MONGODB_URI",
    "mongodb://root:secret@mongo:27017/vectorgraph?authSource=admin",
)
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

mongo = MongoClient(MONGO_URI)
db = mongo["vectorgraph"]
nodes_col = db["context_nodes"]
repos_col = db["repositories"]
edges_col = db["context_edges"]
communities_col = db["communities"]

r = redis_client.from_url(REDIS_URL, decode_responses=True)

# Rebuilt on each /analyze; persists across restarts via MongoDB.
_graph_cache: dict[str, object] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[graph-service] Starting up...")
    yield
    print("[graph-service] Shutting down...")


app = FastAPI(title="GRAPHCHAT Graph Service", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "graph-service"}


def _build_and_persist(
    repo_id: str, nodes: list[dict], edges: list[dict], start: float
) -> AnalyzeResponse:
    """Shared pipeline tail: build graph, cluster, persist, cache report.

    Used by both ``/analyze`` (server-side extraction) and ``/ingest``
    (client-side extraction). Steps 2–6 of the original analyze flow.
    """
    g = build_graph(nodes, edges)
    _graph_cache[repo_id] = g

    communities = cluster(g, repo_id, trials=10)
    get_surprising_edges(g, communities)  # diagnostic only

    if nodes:
        ops = [
            UpdateOne({"id": n["id"]}, {"$set": n}, upsert=True) for n in nodes
        ]
        nodes_col.bulk_write(ops)

    if edges:
        resolved_edges = [e for e in edges if "targetId" in e]
        if resolved_edges:
            ops = [
                UpdateOne({"id": e["id"]}, {"$set": e}, upsert=True)
                for e in resolved_edges
            ]
            edges_col.bulk_write(ops)

    if communities:
        ops = [
            UpdateOne({"id": c["id"]}, {"$set": c}, upsert=True)
            for c in communities
        ]
        communities_col.bulk_write(ops)

    repo = repos_col.find_one({"id": repo_id})
    repo_name = repo.get("name", repo_id) if repo else repo_id
    report_md = generate_report(nodes, edges, communities, repo_name)
    r.setex(f"repo:{repo_id}:graph_report", 60 * 60 * 24, report_md)

    node_map = {n["id"]: n for n in nodes}
    for c in communities:
        c_nodes = [node_map[nid] for nid in c["nodeIds"] if nid in node_map]
        god_node = node_map.get(c["godNodeId"])
        god_label = god_node["label"] if god_node else ""
        prompt = _build_community_prompt(c, c_nodes, god_label)
        r.setex(f'community:{c["id"]}:prompt', 60 * 60 * 24, prompt)
        meta = {
            "id": c["id"],
            "repoId": repo_id,
            "label": c["label"],
            "godNodeId": c["godNodeId"],
            "nodeCount": len(c["nodeIds"]),
        }
        r.setex(f'community:{c["id"]}:meta', 60 * 60 * 24, json.dumps(meta))

    duration_ms = int((time.time() - start) * 1000)
    god_node_labels: list[str] = []
    for c in communities:
        n = node_map.get(c["godNodeId"])
        if n:
            god_node_labels.append(n["label"])

    return AnalyzeResponse(
        repo_id=repo_id,
        nodes_added=len(nodes),
        edges_added=len(edges),
        communities=len(communities),
        god_nodes=god_node_labels[:5],
        duration_ms=duration_ms,
    )


# ── POST /analyze ─────────────────────────────────────────────────────────────
@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    """Server-side pipeline: Tree-sitter on a path mounted under /repos.

    Used when the graph-service has filesystem access to the repo. For SaaS
    deployments where the CLI extracts locally, prefer ``/ingest`` instead.
    """
    start = time.time()
    safe_path = _safe_repo_path(req.repo_path)
    nodes, edges = extract_repo(safe_path, req.repo_id)
    return _build_and_persist(req.repo_id, nodes, edges, start)


# ── POST /ingest ──────────────────────────────────────────────────────────────
@app.post("/ingest", response_model=AnalyzeResponse)
def ingest(req: IngestRequest) -> AnalyzeResponse:
    """Accept a client-extracted graph payload and run the same build/cluster/
    persist pipeline. Source code never reaches this service.

    The CLI is responsible for stamping ``confidence='EXTRACTED'`` on every
    node/edge and using the same id/label conventions as the server extractor.
    """
    start = time.time()
    if not req.nodes and not req.edges:
        raise HTTPException(
            status_code=400, detail="ingest payload contained no nodes or edges"
        )
    return _build_and_persist(req.repo_id, req.nodes, req.edges, start)


# ── POST /cluster ─────────────────────────────────────────────────────────────
@app.post("/cluster", response_model=ClusterResponse)
def cluster_repo(req: ClusterRequest) -> ClusterResponse:
    """Re-cluster an existing graph (e.g. after new nodes added via UI)."""
    start = time.time()

    nodes = list(nodes_col.find({"repoId": req.repo_id}, {"_id": 0}))
    edges = list(edges_col.find({"repoId": req.repo_id}, {"_id": 0}))

    if not nodes:
        raise HTTPException(
            status_code=404, detail="No nodes found for this repo. Run /analyze first."
        )

    g = build_graph(nodes, edges)
    _graph_cache[req.repo_id] = g
    communities = cluster(g, req.repo_id, trials=10)

    duration_ms = int((time.time() - start) * 1000)
    return ClusterResponse(
        repo_id=req.repo_id,
        communities=communities,
        duration_ms=duration_ms,
    )


# ── POST /query ───────────────────────────────────────────────────────────────
@app.post("/query", response_model=QueryResponse)
def query_graph(req: QueryRequest) -> QueryResponse:
    """Graph traversal query starting from vector search seed nodes."""
    g = _graph_cache.get(req.repo_id)
    if g is None:
        nodes = list(nodes_col.find({"repoId": req.repo_id}, {"_id": 0}))
        edges = list(edges_col.find({"repoId": req.repo_id}, {"_id": 0}))
        if not nodes:
            raise HTTPException(status_code=404, detail="Run /analyze first.")
        g = build_graph(nodes, edges)
        _graph_cache[req.repo_id] = g

    budget_chars = (req.budget or 2000) * 4

    if req.mode == "bfs":
        result = query_bfs(g, req.seed_node_ids, req.hops, budget_chars)
    elif req.mode == "dfs":
        result = query_dfs(g, req.seed_node_ids, req.hops, budget_chars)
    else:  # default: knn
        result = query_knn_expand(g, req.seed_node_ids, req.hops, budget_chars)

    return QueryResponse(**result)


# ── GET /report/{repo_id} ─────────────────────────────────────────────────────
@app.get("/report/{repo_id}")
def get_report(repo_id: str) -> dict:
    cached = r.get(f"repo:{repo_id}:graph_report")
    if cached:
        return {"report": cached, "source": "cache"}

    nodes = list(nodes_col.find({"repoId": repo_id}, {"_id": 0}))
    edges = list(edges_col.find({"repoId": repo_id}, {"_id": 0}))
    communities = list(communities_col.find({"repoId": repo_id}, {"_id": 0}))
    repo = repos_col.find_one({"id": repo_id})
    if not nodes:
        raise HTTPException(status_code=404, detail="No graph data found.")
    report = generate_report(
        nodes,
        edges,
        communities,
        repo.get("name", repo_id) if repo else repo_id,
    )
    r.setex(f"repo:{repo_id}:graph_report", 60 * 60 * 24, report)
    return {"report": report, "source": "rebuilt"}


# ── GET /path ─────────────────────────────────────────────────────────────────
@app.get("/path")
def get_path(repo_id: str, source: str, target: str) -> dict:
    """Shortest path between two node labels."""
    g = _graph_cache.get(repo_id)
    if g is None:
        nodes = list(nodes_col.find({"repoId": repo_id}, {"_id": 0}))
        edges = list(edges_col.find({"repoId": repo_id}, {"_id": 0}))
        g = build_graph(nodes, edges)
        _graph_cache[repo_id] = g
    nodes_list = [dict(g.nodes[n]) for n in g.nodes]
    path = shortest_path(g, source, target, nodes_list)
    if not path:
        raise HTTPException(
            status_code=404, detail=f"No path from {source} to {target}"
        )
    return {"path": path, "hops": len(path) - 1}


def _build_community_prompt(
    community: dict, nodes: list[dict], god_label: str
) -> str:
    extracted = [n for n in nodes if n.get("confidence") == "EXTRACTED"]
    return "\n".join(
        [
            f'## {community["label"]}',
            f"God node: {god_label}",
            f"Size: {len(nodes)} nodes ({len(extracted)} AST-extracted)",
            "",
            *[
                f'- [{n["type"]}] {n["label"]}: {n["content"][:100]}'
                for n in extracted[:8]
            ],
        ]
    )
