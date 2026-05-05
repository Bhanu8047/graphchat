import { makeEdge, makeNode, RATIONALE_PREFIXES } from './builders.js';
import type { ExtractedEdge, ExtractedNode, Lang } from './types.js';

/** web-tree-sitter@0.20 doesn't expose its `SyntaxNode` type as a value — we
 * use a structural alias here covering only the fields the extractors touch. */
type TSNode = {
  type: string;
  startIndex: number;
  endIndex: number;
  startPosition: { row: number; column: number };
  childCount: number;
  namedChildCount: number;
  previousSibling: TSNode | null;
  child(i: number): TSNode | null;
  namedChild(i: number): TSNode | null;
  childForFieldName(name: string): TSNode | null;
};

type Ctx = {
  repoId: string;
  source: string;
  filePath: string;
  nodes: ExtractedNode[];
  edges: ExtractedEdge[];
};

const txt = (n: TSNode | null | undefined, src: string): string =>
  n ? src.slice(n.startIndex, n.endIndex) : '';

const lineOf = (n: TSNode): number => n.startPosition.row + 1;

const isIdent = (s: string): boolean => /^[A-Za-z_$][\w$]*$/.test(s);

// ── Python ───────────────────────────────────────────────────────────────────
function extractPython(ctx: Ctx, root: TSNode): void {
  const walk = (node: TSNode, classCtx?: string): void => {
    if (node.type === 'class_definition') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const name = txt(nameNode, ctx.source);
        const docstring = pythonDocstring(node, ctx.source);
        const n = makeNode(
          ctx.repoId,
          name,
          'class',
          docstring || `Python class ${name}`,
          ctx.filePath,
          lineOf(node),
          ['python', 'class'],
        );
        ctx.nodes.push(n);
        const supers = node.childForFieldName('superclasses');
        if (supers) {
          for (let i = 0; i < supers.namedChildCount; i++) {
            const arg = supers.namedChild(i);
            if (!arg) continue;
            const base = txt(arg, ctx.source).trim();
            if (base) ctx.edges.push(makeEdge(ctx.repoId, n.id, base, 'depends_on'));
          }
        }
        for (let i = 0; i < node.childCount; i++) {
          const c = node.child(i);
          if (c) walk(c, name);
        }
        return;
      }
    } else if (node.type === 'function_definition') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const name = txt(nameNode, ctx.source);
        const qualified = classCtx ? `${classCtx}.${name}` : name;
        const docstring = pythonDocstring(node, ctx.source);
        const n = makeNode(
          ctx.repoId,
          qualified,
          'function',
          docstring || `Python function ${qualified}`,
          ctx.filePath,
          lineOf(node),
          ['python', 'function'],
        );
        ctx.nodes.push(n);
        findCallsPython(node, ctx, n.id);
      }
    } else if (
      node.type === 'import_statement' ||
      node.type === 'import_from_statement'
    ) {
      const raw = txt(node, ctx.source).trim();
      ctx.nodes.push(
        makeNode(
          ctx.repoId,
          raw.slice(0, 80),
          'import',
          raw,
          ctx.filePath,
          lineOf(node),
          ['python', 'import'],
        ),
      );
    } else if (node.type === 'comment') {
      const text = txt(node, ctx.source).trim();
      if (RATIONALE_PREFIXES.some((p) => text.startsWith(p))) {
        ctx.nodes.push(
          makeNode(
            ctx.repoId,
            text.slice(0, 50),
            'rationale',
            text,
            ctx.filePath,
            lineOf(node),
            ['rationale', 'comment'],
          ),
        );
      }
    }

    for (let i = 0; i < node.childCount; i++) {
      const c = node.child(i);
      if (c) walk(c, classCtx);
    }
  };
  walk(root);
}

function pythonDocstring(funcNode: TSNode, source: string): string {
  const body = funcNode.childForFieldName('body');
  if (!body) return '';
  for (let i = 0; i < body.childCount; i++) {
    const child = body.child(i);
    if (child?.type === 'expression_statement' && child.childCount > 0) {
      const expr = child.child(0);
      if (expr && (expr.type === 'string' || expr.type === 'concatenated_string')) {
        return txt(expr, source).replace(/^['"]+|['"]+$/g, '').trim().slice(0, 300);
      }
    }
  }
  return '';
}

function findCallsPython(funcNode: TSNode, ctx: Ctx, callerId: string): void {
  const walk = (n: TSNode): void => {
    if (n.type === 'call') {
      const fn = n.childForFieldName('function');
      if (fn) {
        let name = txt(fn, ctx.source).trim();
        if (name.includes('.')) name = name.split('.').pop() ?? name;
        if (name && isIdent(name)) {
          ctx.edges.push(makeEdge(ctx.repoId, callerId, name, 'calls'));
        }
      }
    }
    for (let i = 0; i < n.childCount; i++) {
      const c = n.child(i);
      if (c) walk(c);
    }
  };
  walk(funcNode);
}

// ── TypeScript / JavaScript ──────────────────────────────────────────────────
function extractTypeScript(ctx: Ctx, root: TSNode, langTag: string): void {
  const walk = (node: TSNode): void => {
    if (
      node.type === 'class_declaration' ||
      node.type === 'abstract_class_declaration'
    ) {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const name = txt(nameNode, ctx.source);
        const n = makeNode(
          ctx.repoId,
          name,
          'class',
          `${capitalize(langTag)} class ${name}`,
          ctx.filePath,
          lineOf(node),
          [langTag, 'class'],
        );
        ctx.nodes.push(n);
        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          if (child?.type === 'implements_clause') {
            for (let j = 0; j < child.namedChildCount; j++) {
              const impl = child.namedChild(j);
              if (!impl) continue;
              const target = txt(impl, ctx.source).trim();
              if (target)
                ctx.edges.push(makeEdge(ctx.repoId, n.id, target, 'implements'));
            }
          }
        }
      }
    } else if (node.type === 'interface_declaration') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const name = txt(nameNode, ctx.source);
        ctx.nodes.push(
          makeNode(
            ctx.repoId,
            name,
            'interface',
            `${capitalize(langTag)} interface ${name}`,
            ctx.filePath,
            lineOf(node),
            [langTag, 'interface'],
          ),
        );
      }
    } else if (
      node.type === 'function_declaration' ||
      node.type === 'method_definition' ||
      node.type === 'arrow_function' ||
      node.type === 'function_expression'
    ) {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const name = txt(nameNode, ctx.source);
        const jsdoc = jsDoc(node, ctx.source);
        ctx.nodes.push(
          makeNode(
            ctx.repoId,
            name,
            'function',
            jsdoc || `${capitalize(langTag)} function ${name}`,
            ctx.filePath,
            lineOf(node),
            [langTag, 'function'],
          ),
        );
      }
    } else if (node.type === 'import_statement') {
      const raw = txt(node, ctx.source).trim();
      ctx.nodes.push(
        makeNode(
          ctx.repoId,
          raw.slice(0, 80),
          'import',
          raw,
          ctx.filePath,
          lineOf(node),
          [langTag, 'import'],
        ),
      );
    }

    for (let i = 0; i < node.childCount; i++) {
      const c = node.child(i);
      if (c) walk(c);
    }
  };
  walk(root);
}

function jsDoc(node: TSNode, source: string): string {
  let prev = node.previousSibling;
  while (prev) {
    if (prev.type === 'comment') {
      const raw = txt(prev, source).trim();
      if (raw.startsWith('/**') || raw.startsWith('//')) {
        return raw.replace(/^\/\*+|\*+\/$/g, '').trim().slice(0, 300);
      }
      prev = prev.previousSibling;
      continue;
    }
    if (prev.type === '\n' || prev.type === ' ') {
      prev = prev.previousSibling;
      continue;
    }
    break;
  }
  return '';
}

// ── Go ───────────────────────────────────────────────────────────────────────
function extractGo(ctx: Ctx, root: TSNode): void {
  const walk = (n: TSNode): void => {
    if (n.type === 'function_declaration') {
      const nameNode = n.childForFieldName('name');
      if (nameNode) {
        const name = txt(nameNode, ctx.source);
        ctx.nodes.push(
          makeNode(
            ctx.repoId,
            name,
            'function',
            `Go function ${name}`,
            ctx.filePath,
            lineOf(n),
            ['go', 'function'],
          ),
        );
      }
    } else if (n.type === 'type_declaration') {
      const nameNode = n.childForFieldName('name');
      if (nameNode) {
        const name = txt(nameNode, ctx.source);
        ctx.nodes.push(
          makeNode(
            ctx.repoId,
            name,
            'class',
            `Go type ${name}`,
            ctx.filePath,
            lineOf(n),
            ['go', 'type'],
          ),
        );
      }
    }
    for (let i = 0; i < n.childCount; i++) {
      const c = n.child(i);
      if (c) walk(c);
    }
  };
  walk(root);
}

// ── Rust ─────────────────────────────────────────────────────────────────────
function extractRust(ctx: Ctx, root: TSNode): void {
  const walk = (n: TSNode): void => {
    if (n.type === 'function_item' || n.type === 'fn_item') {
      const nameNode = n.childForFieldName('name');
      if (nameNode) {
        const name = txt(nameNode, ctx.source);
        ctx.nodes.push(
          makeNode(
            ctx.repoId,
            name,
            'function',
            `Rust fn ${name}`,
            ctx.filePath,
            lineOf(n),
            ['rust', 'function'],
          ),
        );
      }
    } else if (
      n.type === 'struct_item' ||
      n.type === 'enum_item' ||
      n.type === 'trait_item' ||
      n.type === 'impl_item'
    ) {
      const nameNode = n.childForFieldName('name');
      if (nameNode) {
        const name = txt(nameNode, ctx.source);
        ctx.nodes.push(
          makeNode(
            ctx.repoId,
            name,
            'class',
            `Rust ${n.type} ${name}`,
            ctx.filePath,
            lineOf(n),
            ['rust', n.type],
          ),
        );
      }
    }
    for (let i = 0; i < n.childCount; i++) {
      const c = n.child(i);
      if (c) walk(c);
    }
  };
  walk(root);
}

// ── Java ─────────────────────────────────────────────────────────────────────
function extractJava(ctx: Ctx, root: TSNode): void {
  const walk = (n: TSNode): void => {
    if (n.type === 'class_declaration') {
      const nameNode = n.childForFieldName('name');
      if (nameNode) {
        const name = txt(nameNode, ctx.source);
        ctx.nodes.push(
          makeNode(
            ctx.repoId,
            name,
            'class',
            `Java class ${name}`,
            ctx.filePath,
            lineOf(n),
            ['java', 'class'],
          ),
        );
      }
    } else if (n.type === 'method_declaration') {
      const nameNode = n.childForFieldName('name');
      if (nameNode) {
        const name = txt(nameNode, ctx.source);
        ctx.nodes.push(
          makeNode(
            ctx.repoId,
            name,
            'function',
            `Java method ${name}`,
            ctx.filePath,
            lineOf(n),
            ['java', 'method'],
          ),
        );
      }
    }
    for (let i = 0; i < n.childCount; i++) {
      const c = n.child(i);
      if (c) walk(c);
    }
  };
  walk(root);
}

// ── Generic fallback (C, C++, Ruby, C#) ──────────────────────────────────────
function extractGeneric(ctx: Ctx, root: TSNode): void {
  const walk = (n: TSNode): void => {
    if (n.type.includes('function') || n.type.includes('class')) {
      const nameNode = n.childForFieldName('name');
      if (nameNode) {
        const name = txt(nameNode, ctx.source);
        const t = n.type.includes('function') ? 'function' : 'class';
        ctx.nodes.push(
          makeNode(
            ctx.repoId,
            name,
            t,
            `${t} ${name}`,
            ctx.filePath,
            lineOf(n),
            [t],
          ),
        );
      }
    }
    for (let i = 0; i < n.childCount; i++) {
      const c = n.child(i);
      if (c) walk(c);
    }
  };
  walk(root);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function extractFromTree(
  lang: Lang,
  root: TSNode,
  source: string,
  filePath: string,
  repoId: string,
): { nodes: ExtractedNode[]; edges: ExtractedEdge[] } {
  const ctx: Ctx = { repoId, source, filePath, nodes: [], edges: [] };
  switch (lang) {
    case 'python':
      extractPython(ctx, root);
      break;
    case 'typescript':
    case 'tsx':
      extractTypeScript(ctx, root, 'typescript');
      break;
    case 'javascript':
      extractTypeScript(ctx, root, 'javascript');
      break;
    case 'go':
      extractGo(ctx, root);
      break;
    case 'rust':
      extractRust(ctx, root);
      break;
    case 'java':
      extractJava(ctx, root);
      break;
    default:
      extractGeneric(ctx, root);
  }
  return { nodes: ctx.nodes, edges: ctx.edges };
}
