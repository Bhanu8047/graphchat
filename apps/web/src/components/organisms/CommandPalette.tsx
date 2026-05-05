'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type SVGProps,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { GraphIcon, RepoIcon, SearchIcon } from '../atoms/Icon';
import {
  staticSearchTargets,
  type StaticSearchTarget,
} from '../../features/navigation/config/static-search-targets';
import { useAuth } from '../../features/auth/providers/AuthProvider';
import { api } from '../../lib/api';
import { cn } from '../../lib/ui';

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

type ResultItem = {
  id: string;
  label: string;
  description: string;
  group: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  keywords: string[];
};

type RepoSummary = { id: string; name: string; description?: string };

function score(item: ResultItem, query: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const haystacks = [
    item.label.toLowerCase(),
    item.description.toLowerCase(),
    item.group.toLowerCase(),
    ...item.keywords.map((k) => k.toLowerCase()),
  ];
  let best = 0;
  for (const hay of haystacks) {
    if (hay === q) {
      best = Math.max(best, 100);
    } else if (hay.startsWith(q)) {
      best = Math.max(best, 80);
    } else if (hay.includes(q)) {
      best = Math.max(best, 50);
    }
  }
  return best;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Avoid SSR / hydration mismatch — portal target only exists in the browser.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state and focus input when opened.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Lazily load repositories the first time the palette opens for this session.
  const reposLoaded = useRef(false);
  useEffect(() => {
    if (!open || reposLoaded.current) return;
    reposLoaded.current = true;
    api.repos
      .list()
      .then((list: any[]) => {
        if (Array.isArray(list)) {
          setRepos(
            list.map((r) => ({
              id: r.id,
              name: r.name ?? r.fullName ?? r.id,
              description: r.description ?? r.fullName,
            })),
          );
        }
      })
      .catch(() => {
        /* silent — repos are optional in results */
      });
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Build the searchable corpus.
  const allItems = useMemo<ResultItem[]>(() => {
    const isAdmin = user?.role === 'admin';

    const staticItems: ResultItem[] = staticSearchTargets
      .filter((t: StaticSearchTarget) => !t.adminOnly || isAdmin)
      .map((t) => ({
        id: t.id,
        label: t.label,
        description: t.description,
        group: t.group,
        href: t.href,
        icon: t.icon,
        keywords: t.keywords,
      }));

    const repoItems: ResultItem[] = repos.flatMap((repo) => [
      {
        id: `repo-${repo.id}`,
        label: repo.name,
        description: repo.description ?? 'Open repository',
        group: 'Repositories',
        href: `/repos/${repo.id}`,
        icon: RepoIcon,
        keywords: ['repo', 'repository', repo.name],
      },
      {
        id: `graph-${repo.id}`,
        label: `${repo.name} · graph`,
        description: 'Open the generated graph',
        group: 'Graphs',
        href: `/graphs/${repo.id}`,
        icon: GraphIcon,
        keywords: ['graph', 'visualize', repo.name],
      },
    ]);

    return [...staticItems, ...repoItems];
  }, [repos, user?.role]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    const scored = allItems
      .map((item) => ({ item, score: score(item, trimmed) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
    return trimmed
      ? scored.slice(0, 30).map((e) => e.item)
      : scored.map((e) => e.item);
  }, [allItems, query]);

  // Group results preserving sort order.
  const grouped = useMemo(() => {
    const groups = new Map<string, ResultItem[]>();
    for (const item of results) {
      const list = groups.get(item.group) ?? [];
      list.push(item);
      groups.set(item.group, list);
    }
    return Array.from(groups.entries());
  }, [results]);

  // Flat ordered list for keyboard nav matches the rendered order.
  const flatOrdered = useMemo(
    () => grouped.flatMap(([, items]) => items),
    [grouped],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const navigate = useCallback(
    (item: ResultItem) => {
      onClose();
      router.push(item.href);
    },
    [onClose, router],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((idx) =>
        flatOrdered.length === 0 ? 0 : (idx + 1) % flatOrdered.length,
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((idx) =>
        flatOrdered.length === 0
          ? 0
          : (idx - 1 + flatOrdered.length) % flatOrdered.length,
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = flatOrdered[activeIndex];
      if (target) navigate(target);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  if (!open) return null;
  if (!mounted) return null;

  let renderedIndex = -1;

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(e) => {
        // Click-outside: close only when the user presses on the overlay itself,
        // not on bubbled events from the dialog content.
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[color-mix(in_oklab,var(--color-space-indigo-950)_55%,transparent)] px-4 pt-[12vh] pb-8 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search trchat"
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_40px_120px_-30px_color-mix(in_oklab,var(--color-space-indigo-900)_55%,transparent)]"
      >
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search graphs, repos, settings, docs…"
            className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
            aria-label="Search"
          />
          <kbd className="hidden rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-[var(--muted-foreground)] sm:inline">
            Esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {grouped.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-[var(--muted-foreground)]">
              No matches for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="mb-2 last:mb-0">
                <div className="px-3 pt-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  {group}
                </div>
                <ul>
                  {items.map((item) => {
                    renderedIndex += 1;
                    const isActive = renderedIndex === activeIndex;
                    const Icon = item.icon;
                    const indexForHandler = renderedIndex;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => navigate(item)}
                          onMouseEnter={() => setActiveIndex(indexForHandler)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition',
                            isActive
                              ? 'bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-[var(--foreground)]'
                              : 'text-[var(--foreground)] hover:bg-[var(--surface-muted)]',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                              isActive
                                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                                : 'bg-[var(--surface-muted)] text-[var(--muted-foreground)]',
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {item.label}
                            </span>
                            <span className="block truncate text-xs text-[var(--muted-foreground)]">
                              {item.description}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-[0.7rem] text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[0.65rem] font-medium">
              ↑
            </kbd>
            <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[0.65rem] font-medium">
              ↓
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[0.65rem] font-medium">
              Enter
            </kbd>
            open
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[0.65rem] font-medium uppercase tracking-wider">
              Esc
            </kbd>
            close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
