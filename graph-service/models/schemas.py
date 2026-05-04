from typing import Optional

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    repo_id: str
    repo_path: str
    languages: list[str] = Field(default_factory=list)  # empty = auto-detect


class AnalyzeResponse(BaseModel):
    repo_id: str
    nodes_added: int
    edges_added: int
    communities: int
    god_nodes: list[str]
    duration_ms: int


class ClusterRequest(BaseModel):
    repo_id: str


class ClusterResponse(BaseModel):
    repo_id: str
    communities: list[dict]
    duration_ms: int


class QueryRequest(BaseModel):
    repo_id: str
    query: str
    mode: str = "knn"  # 'bfs' | 'dfs' | 'knn'
    budget: Optional[int] = 2000
    hops: int = 2
    seed_node_ids: list[str] = Field(default_factory=list)


class QueryResponse(BaseModel):
    nodes: list[dict]
    edges: list[dict]
    token_estimate: int
    mode_used: str
