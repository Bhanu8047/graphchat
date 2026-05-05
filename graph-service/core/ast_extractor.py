"""Tree-sitter AST extraction pass.

Supports: Python, TypeScript, JavaScript, Go, Rust, Java, C, C++, Ruby, C#.
Zero LLM calls. Zero network calls. Source code never leaves the machine.
All extracted nodes/edges get ``confidence='EXTRACTED'`` and ``weight=1.0``.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import tree_sitter_c as tsc
import tree_sitter_c_sharp as tscsharp
import tree_sitter_cpp as tscpp
import tree_sitter_go as tsgo
import tree_sitter_java as tsjava
import tree_sitter_javascript as tsjavascript
import tree_sitter_python as tspython
import tree_sitter_ruby as tsruby
import tree_sitter_rust as tsrust
import tree_sitter_typescript as tstypescript
from tree_sitter import Language, Node, Parser

# ── Language registry ────────────────────────────────────────────────────────
LANG_MAP: dict[str, Language] = {
    ".py": Language(tspython.language()),
    ".ts": Language(tstypescript.language_typescript()),
    ".tsx": Language(tstypescript.language_typescript()),
    ".js": Language(tsjavascript.language()),
    ".jsx": Language(tsjavascript.language()),
    ".go": Language(tsgo.language()),
    ".rs": Language(tsrust.language()),
    ".java": Language(tsjava.language()),
    ".c": Language(tsc.language()),
    ".h": Language(tsc.language()),
    ".cpp": Language(tscpp.language()),
    ".cc": Language(tscpp.language()),
    ".rb": Language(tsruby.language()),
    ".cs": Language(tscsharp.language()),
}

# Default ignore patterns (augmented by ``.graphchatignore`` on the NestJS side)
DEFAULT_IGNORE = {
    "node_modules",
    "dist",
    "build",
    ".next",
    "coverage",
    ".git",
    ".nx",
    "__pycache__",
    ".pytest_cache",
    "vendor",
}

RATIONALE_PREFIXES = (
    "# NOTE:",
    "# WHY:",
    "# HACK:",
    "# IMPORTANT:",
    "# TODO:",
    "# FIXME:",
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _make_id() -> str:
    return str(uuid.uuid4())


def _make_node(
    repo_id: str,
    label: str,
    node_type: str,
    content: str,
    file_path: str,
    line: int,
    tags: list[str],
) -> dict:
    return {
        "id": _make_id(),
        "repoId": repo_id,
        "type": node_type,
        "label": label,
        "content": content,
        "tags": tags,
        "confidence": "EXTRACTED",
        "sourceFile": file_path,
        "sourceLine": line,
        "updatedAt": _now(),
    }


def _make_edge(
    repo_id: str,
    source_id: str,
    target_label: str,
    edge_type: str,
    file_path: str,
) -> dict:
    return {
        "id": _make_id(),
        "repoId": repo_id,
        "sourceId": source_id,
        "targetLabel": target_label,  # resolved to targetId in graph_builder
        "type": edge_type,
        "confidence": "EXTRACTED",
        "weight": 1.0,
        "createdAt": _now(),
    }


# ── Per-language extractors ──────────────────────────────────────────────────
def _extract_python(
    root: Node,
    source: bytes,
    fp: str,
    repo_id: str,
    nodes: list,
    edges: list,
) -> None:
    def walk(node: Node, class_ctx: Optional[str] = None) -> None:
        if node.type == "class_definition":
            name_node = node.child_by_field_name("name")
            if name_node:
                name = source[name_node.start_byte : name_node.end_byte].decode()
                docstring = _extract_python_docstring(node, source)
                n = _make_node(
                    repo_id,
                    name,
                    "class",
                    docstring or f"Python class {name}",
                    fp,
                    node.start_point[0] + 1,
                    ["python", "class"],
                )
                nodes.append(n)
                args = node.child_by_field_name("superclasses")
                if args:
                    for arg in args.named_children:
                        base = source[arg.start_byte : arg.end_byte].decode().strip()
                        if base:
                            edges.append(
                                _make_edge(repo_id, n["id"], base, "depends_on", fp)
                            )
                for child in node.children:
                    walk(child, class_ctx=name)

        elif node.type == "function_definition":
            name_node = node.child_by_field_name("name")
            if name_node:
                name = source[name_node.start_byte : name_node.end_byte].decode()
                qualified = f"{class_ctx}.{name}" if class_ctx else name
                docstring = _extract_python_docstring(node, source)
                n = _make_node(
                    repo_id,
                    qualified,
                    "function",
                    docstring or f"Python function {qualified}",
                    fp,
                    node.start_point[0] + 1,
                    ["python", "function"],
                )
                nodes.append(n)
                _find_calls_python(node, source, repo_id, n["id"], fp, edges)

        elif node.type in ("import_statement", "import_from_statement"):
            _extract_python_import(node, source, repo_id, fp, nodes, edges)

        elif node.type == "comment":
            text = source[node.start_byte : node.end_byte].decode().strip()
            if any(text.startswith(p) for p in RATIONALE_PREFIXES):
                n = _make_node(
                    repo_id,
                    text[:50],
                    "rationale",
                    text,
                    fp,
                    node.start_point[0] + 1,
                    ["rationale", "comment"],
                )
                nodes.append(n)

        else:
            for child in node.children:
                walk(child, class_ctx)

    walk(root)


def _extract_python_docstring(func_node: Node, source: bytes) -> str:
    body = func_node.child_by_field_name("body")
    if not body:
        return ""
    for child in body.children:
        if child.type == "expression_statement":
            expr = child.children[0] if child.children else None
            if expr and expr.type in ("string", "concatenated_string"):
                raw = source[expr.start_byte : expr.end_byte].decode()
                return raw.strip("\"'").strip()[:300]
    return ""


def _find_calls_python(
    func_node: Node,
    source: bytes,
    repo_id: str,
    caller_id: str,
    fp: str,
    edges: list,
) -> None:
    def walk(node: Node) -> None:
        if node.type == "call":
            fn = node.child_by_field_name("function")
            if fn:
                name = source[fn.start_byte : fn.end_byte].decode().strip()
                if "." in name:
                    name = name.split(".")[-1]
                if name and name.isidentifier():
                    edges.append(_make_edge(repo_id, caller_id, name, "calls", fp))
        for child in node.children:
            walk(child)

    walk(func_node)


def _extract_python_import(
    node: Node,
    source: bytes,
    repo_id: str,
    fp: str,
    nodes: list,
    edges: list,
) -> None:
    raw = source[node.start_byte : node.end_byte].decode().strip()
    n = _make_node(
        repo_id,
        raw[:80],
        "import",
        raw,
        fp,
        node.start_point[0] + 1,
        ["python", "import"],
    )
    nodes.append(n)


def _extract_typescript(
    root: Node,
    source: bytes,
    fp: str,
    repo_id: str,
    nodes: list,
    edges: list,
) -> None:
    def walk(node: Node) -> None:
        if node.type in ("class_declaration", "abstract_class_declaration"):
            name_node = node.child_by_field_name("name")
            if name_node:
                name = source[name_node.start_byte : name_node.end_byte].decode()
                n = _make_node(
                    repo_id,
                    name,
                    "class",
                    f"TypeScript class {name}",
                    fp,
                    node.start_point[0] + 1,
                    ["typescript", "class"],
                )
                nodes.append(n)
                for child in node.children:
                    if child.type == "implements_clause":
                        for impl in child.named_children:
                            target = (
                                source[impl.start_byte : impl.end_byte].decode().strip()
                            )
                            edges.append(
                                _make_edge(repo_id, n["id"], target, "implements", fp)
                            )
                for child in node.children:
                    walk(child)

        elif node.type == "interface_declaration":
            name_node = node.child_by_field_name("name")
            if name_node:
                name = source[name_node.start_byte : name_node.end_byte].decode()
                n = _make_node(
                    repo_id,
                    name,
                    "interface",
                    f"TypeScript interface {name}",
                    fp,
                    node.start_point[0] + 1,
                    ["typescript", "interface"],
                )
                nodes.append(n)

        elif node.type in (
            "function_declaration",
            "method_definition",
            "arrow_function",
            "function_expression",
        ):
            name_node = node.child_by_field_name("name")
            if name_node:
                name = source[name_node.start_byte : name_node.end_byte].decode()
                jsdoc = _extract_jsdoc(node, source)
                n = _make_node(
                    repo_id,
                    name,
                    "function",
                    jsdoc or f"TypeScript function {name}",
                    fp,
                    node.start_point[0] + 1,
                    ["typescript", "function"],
                )
                nodes.append(n)

        elif node.type == "import_statement":
            raw = source[node.start_byte : node.end_byte].decode().strip()
            n = _make_node(
                repo_id,
                raw[:80],
                "import",
                raw,
                fp,
                node.start_point[0] + 1,
                ["typescript", "import"],
            )
            nodes.append(n)

        for child in node.children:
            walk(child)

    walk(root)


def _extract_jsdoc(node: Node, source: bytes) -> str:
    prev = node.prev_sibling
    while prev and prev.type in ("comment", "\n", " "):
        if prev.type == "comment":
            raw = source[prev.start_byte : prev.end_byte].decode().strip()
            if raw.startswith("/**") or raw.startswith("//"):
                return raw.lstrip("/*").rstrip("*/").strip()[:300]
        prev = prev.prev_sibling
    return ""


def _extract_javascript(
    root: Node,
    source: bytes,
    fp: str,
    repo_id: str,
    nodes: list,
    edges: list,
) -> None:
    _extract_typescript(root, source, fp, repo_id, nodes, edges)


def _extract_go(
    root: Node,
    source: bytes,
    fp: str,
    repo_id: str,
    nodes: list,
    edges: list,
) -> None:
    def walk(node: Node) -> None:
        if node.type == "function_declaration":
            name_node = node.child_by_field_name("name")
            if name_node:
                name = source[name_node.start_byte : name_node.end_byte].decode()
                nodes.append(
                    _make_node(
                        repo_id,
                        name,
                        "function",
                        f"Go function {name}",
                        fp,
                        node.start_point[0] + 1,
                        ["go", "function"],
                    )
                )
        elif node.type == "type_declaration":
            name_node = node.child_by_field_name("name")
            if name_node:
                name = source[name_node.start_byte : name_node.end_byte].decode()
                nodes.append(
                    _make_node(
                        repo_id,
                        name,
                        "class",
                        f"Go type {name}",
                        fp,
                        node.start_point[0] + 1,
                        ["go", "type"],
                    )
                )
        for child in node.children:
            walk(child)

    walk(root)


def _extract_rust(
    root: Node,
    source: bytes,
    fp: str,
    repo_id: str,
    nodes: list,
    edges: list,
) -> None:
    def walk(node: Node) -> None:
        if node.type in ("function_item", "fn_item"):
            name_node = node.child_by_field_name("name")
            if name_node:
                name = source[name_node.start_byte : name_node.end_byte].decode()
                nodes.append(
                    _make_node(
                        repo_id,
                        name,
                        "function",
                        f"Rust fn {name}",
                        fp,
                        node.start_point[0] + 1,
                        ["rust", "function"],
                    )
                )
        elif node.type in ("struct_item", "enum_item", "trait_item", "impl_item"):
            name_node = node.child_by_field_name("name")
            if name_node:
                name = source[name_node.start_byte : name_node.end_byte].decode()
                nodes.append(
                    _make_node(
                        repo_id,
                        name,
                        "class",
                        f"Rust {node.type} {name}",
                        fp,
                        node.start_point[0] + 1,
                        ["rust", node.type],
                    )
                )
        for child in node.children:
            walk(child)

    walk(root)


def _extract_java(
    root: Node,
    source: bytes,
    fp: str,
    repo_id: str,
    nodes: list,
    edges: list,
) -> None:
    def walk(node: Node) -> None:
        if node.type == "class_declaration":
            name_node = node.child_by_field_name("name")
            if name_node:
                name = source[name_node.start_byte : name_node.end_byte].decode()
                nodes.append(
                    _make_node(
                        repo_id,
                        name,
                        "class",
                        f"Java class {name}",
                        fp,
                        node.start_point[0] + 1,
                        ["java", "class"],
                    )
                )
        elif node.type == "method_declaration":
            name_node = node.child_by_field_name("name")
            if name_node:
                name = source[name_node.start_byte : name_node.end_byte].decode()
                nodes.append(
                    _make_node(
                        repo_id,
                        name,
                        "function",
                        f"Java method {name}",
                        fp,
                        node.start_point[0] + 1,
                        ["java", "method"],
                    )
                )
        for child in node.children:
            walk(child)

    walk(root)


def _extract_generic(
    root: Node,
    source: bytes,
    fp: str,
    repo_id: str,
    nodes: list,
    edges: list,
) -> None:
    """Fallback: extract anything containing 'function' or 'class' in its type."""

    def walk(node: Node) -> None:
        if "function" in node.type or "class" in node.type:
            name_node = node.child_by_field_name("name")
            if name_node:
                name = source[name_node.start_byte : name_node.end_byte].decode()
                t = "function" if "function" in node.type else "class"
                nodes.append(
                    _make_node(
                        repo_id,
                        name,
                        t,
                        f"{t} {name}",
                        fp,
                        node.start_point[0] + 1,
                        [t],
                    )
                )
        for child in node.children:
            walk(child)

    walk(root)


def _extract_from_tree(
    tree, source: bytes, file_path: str, repo_id: str
) -> tuple[list[dict], list[dict]]:
    """Walk the AST and extract nodes + edges. Language-agnostic entry point."""
    nodes: list[dict] = []
    edges: list[dict] = []
    ext = Path(file_path).suffix.lower()

    if ext == ".py":
        _extract_python(tree.root_node, source, file_path, repo_id, nodes, edges)
    elif ext in (".ts", ".tsx"):
        _extract_typescript(tree.root_node, source, file_path, repo_id, nodes, edges)
    elif ext in (".js", ".jsx"):
        _extract_javascript(tree.root_node, source, file_path, repo_id, nodes, edges)
    elif ext == ".go":
        _extract_go(tree.root_node, source, file_path, repo_id, nodes, edges)
    elif ext == ".rs":
        _extract_rust(tree.root_node, source, file_path, repo_id, nodes, edges)
    elif ext == ".java":
        _extract_java(tree.root_node, source, file_path, repo_id, nodes, edges)
    else:
        _extract_generic(tree.root_node, source, file_path, repo_id, nodes, edges)

    return nodes, edges


# ── Public API ───────────────────────────────────────────────────────────────
def extract_repo(
    repo_path: str,
    repo_id: str,
    ignored_paths: Optional[set[str]] = None,
) -> tuple[list[dict], list[dict]]:
    """Walk ``repo_path`` and run Tree-sitter on every supported file.

    Returns ``(nodes, edges)`` — all with ``confidence='EXTRACTED'``.
    Skips paths in the ``ignored_paths`` set.
    """
    all_nodes: list[dict] = []
    all_edges: list[dict] = []
    ignored_paths = ignored_paths or set()

    for root_dir, dirs, files in os.walk(repo_path):
        # Prune ignored directories in-place
        dirs[:] = [
            d
            for d in dirs
            if d not in DEFAULT_IGNORE
            and os.path.join(root_dir, d) not in ignored_paths
        ]

        for fname in files:
            abs_path = os.path.join(root_dir, fname)
            rel_path = os.path.relpath(abs_path, repo_path)

            if rel_path in ignored_paths:
                continue

            ext = Path(fname).suffix.lower()
            if ext not in LANG_MAP:
                continue

            try:
                with open(abs_path, "rb") as f:
                    source = f.read()

                parser = Parser(LANG_MAP[ext])
                tree = parser.parse(source)
                file_nodes, file_edges = _extract_from_tree(
                    tree, source, rel_path, repo_id
                )
                all_nodes.extend(file_nodes)
                all_edges.extend(file_edges)
            except Exception as e:  # noqa: BLE001 — never crash on a bad file
                print(f"[AST] Skipping {rel_path}: {e}")

    return all_nodes, all_edges
