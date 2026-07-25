import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export type CategoryPickerNode = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children?: CategoryPickerNode[];
};

export type CategoryFlatOption = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  pathLabel: string;
  parentIds: string[];
};

export interface CategoryTreePickerProps {
  nodes: CategoryPickerNode[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  className?: string;
  flatOptions?: Array<{ id: string; name: string; slug: string; parentId?: string | null }>;
}

function collectDescendantIds(node: CategoryPickerNode): string[] {
  const ids: string[] = [];
  for (const child of node.children ?? []) {
    ids.push(child.id, ...collectDescendantIds(child));
  }
  return ids;
}

function findNode(
  nodes: CategoryPickerNode[],
  id: string,
): { node: CategoryPickerNode; parentIds: string[] } | null {
  for (const node of nodes) {
    if (node.id === id) return { node, parentIds: [] };
    const nested = findNode(node.children ?? [], id);
    if (nested) return { node: nested.node, parentIds: [node.id, ...nested.parentIds] };
  }
  return null;
}

function flattenTree(
  nodes: CategoryPickerNode[],
  ancestors: Array<{ id: string; name: string }> = [],
): CategoryFlatOption[] {
  const out: CategoryFlatOption[] = [];
  for (const node of nodes) {
    const pathLabel = [...ancestors.map((a) => a.name), node.name].join(' › ');
    out.push({
      id: node.id,
      name: node.name,
      slug: node.slug,
      parentId: node.parentId ?? null,
      pathLabel,
      parentIds: ancestors.map((a) => a.id),
    });
    if (node.children?.length) {
      out.push(...flattenTree(node.children, [...ancestors, { id: node.id, name: node.name }]));
    }
  }
  return out;
}

/**
 * Searchable category multi-select for the product editor.
 * Choosing a child (e.g. Long sleeves) also selects ancestors (All Tops).
 */
export function CategoryTreePicker({
  nodes,
  selectedIds,
  onChange,
  className,
  flatOptions = [],
}: CategoryTreePickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    if (nodes.length) return flattenTree(nodes);
    return flatOptions.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentId: row.parentId ?? null,
      pathLabel: row.name,
      parentIds: [] as string[],
    }));
  }, [nodes, flatOptions]);

  const idToName = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of options) map.set(option.id, option.name);
    for (const row of flatOptions) map.set(row.id, row.name);
    return map;
  }, [options, flatOptions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.name.toLowerCase().includes(q) ||
        option.slug.toLowerCase().includes(q) ||
        option.pathLabel.toLowerCase().includes(q),
    );
  }, [options, query]);

  const addCategory = (id: string) => {
    if (!id || selectedIds.includes(id)) return;
    const fromTree = findNode(nodes, id);
    const fromFlat = options.find((option) => option.id === id);
    const next = new Set(selectedIds);
    next.add(id);
    if (fromTree) {
      for (const parentId of fromTree.parentIds) next.add(parentId);
    } else if (fromFlat) {
      for (const parentId of fromFlat.parentIds) next.add(parentId);
      // Walk flat parentId chain when tree was unavailable.
      let current = flatOptions.find((row) => row.id === id);
      const guard = new Set<string>();
      while (current?.parentId && !guard.has(current.parentId)) {
        guard.add(current.parentId);
        next.add(current.parentId);
        current = flatOptions.find((row) => row.id === current?.parentId);
      }
    }
    const ordered = selectedIds.filter((value) => next.has(value));
    for (const value of next) {
      if (!ordered.includes(value)) ordered.push(value);
    }
    onChange(ordered);
    setQuery('');
    setOpen(false);
  };

  const removeCategory = (id: string) => {
    const found = findNode(nodes, id);
    if (found) {
      const removeIds = new Set([id, ...collectDescendantIds(found.node)]);
      onChange(selectedIds.filter((value) => !removeIds.has(value)));
      return;
    }
    onChange(selectedIds.filter((value) => value !== id));
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--admin-ink-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Allow option click before closing.
            window.setTimeout(() => setOpen(false), 150);
          }}
          placeholder={
            options.length ? 'Search categories (e.g. Long sleeves)…' : 'No categories loaded'
          }
          disabled={!options.length}
          className="focus:border-[var(--admin-accent)]/50 w-full rounded-none border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] py-2 pl-8 pr-3 text-sm text-[var(--admin-ink)] outline-none disabled:opacity-60"
        />

        {open && options.length ? (
          <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-none border border-[var(--admin-line)] bg-[var(--admin-surface)] shadow-lg">
            {filtered.length ? (
              filtered.map((option) => {
                const selected = selectedIds.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={cn(
                      'flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--admin-panel-soft)]',
                      selected && 'bg-[var(--admin-panel-soft)]',
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => addCategory(option.id)}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-[var(--admin-ink)]">
                        {option.name}
                      </span>
                      <span className="block truncate text-[10px] text-[var(--admin-ink-muted)]">
                        {option.pathLabel}
                      </span>
                    </span>
                    {selected ? (
                      <span className="shrink-0 text-[10px] font-semibold text-[var(--admin-accent)]">
                        Added
                      </span>
                    ) : null}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-2 text-xs text-[var(--admin-ink-muted)]">
                No categories match “{query}”.
              </p>
            )}
          </div>
        ) : null}
      </div>

      {!options.length ? (
        <p className="text-[11px] text-red-600">
          Categories could not be loaded. Check that the API is running, then refresh.
        </p>
      ) : (
        <p className="text-[11px] text-[var(--admin-ink-muted)]">
          Type to search, then click a style. Parents like <strong>All Tops</strong> are attached
          automatically.
        </p>
      )}

      {selectedIds.length ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedIds.map((id, index) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--admin-line)] bg-[var(--admin-panel-soft)] px-2 py-0.5 text-[11px] text-[var(--admin-ink)]"
            >
              {idToName.get(id) ?? id}
              {index === 0 ? (
                <span className="font-semibold text-[var(--admin-accent)]">· primary</span>
              ) : null}
              <button
                type="button"
                className="text-[var(--admin-ink-muted)] hover:text-[var(--admin-ink)]"
                aria-label={`Remove ${idToName.get(id) ?? id}`}
                onClick={() => removeCategory(id)}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
