import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Clock3, Search, TrendingUp, X } from 'lucide-react';
import { ROUTES } from '@/constants';
import { useUiStore } from '@/store/ui-store';
import { Button } from '@/components/ui/button';

const RECENT_KEY = 'felk:recent-searches';
const TRENDING = ['New arrivals', 'Jeans', 'Hoodies', 'Dresses', 'Oversized'];
/** Storefront is women-only — keep search shortcuts aligned with the live catalog. */
const POPULAR_CATEGORIES = [{ label: 'Women', href: `${ROUTES.products}?gender=women` }];

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string').slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

function writeRecent(next: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, 8)));
  } catch {
    /* ignore */
  }
}

/** Full-screen mobile search — Apple Store / Nike style. */
export function FloatingSearch() {
  const open = useUiStore((state) => state.isSearchOpen);
  const setOpen = useUiStore((state) => state.setSearchOpen);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setRecent(readRecent());
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);

  const goToSearch = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      const next = [trimmed, ...readRecent().filter((item) => item !== trimmed)];
      writeRecent(next);
      setRecent(next);
    }
    setOpen(false);
    setQuery('');
    const path = trimmed ? `${ROUTES.search}?q=${encodeURIComponent(trimmed)}` : ROUTES.search;
    void navigate({ to: path as typeof ROUTES.search });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    goToSearch(query);
  };

  const clearRecent = () => {
    writeRecent([]);
    setRecent([]);
  };

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return TRENDING.filter((t) => t.toLowerCase().includes(q)).slice(0, 5);
  }, [query]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          className="bg-background fixed inset-0 z-[120] flex flex-col"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <form
            role="search"
            onSubmit={submit}
            className="border-border/70 flex items-center gap-1 border-b px-2 py-2"
            style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
          >
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Close search"
              className="size-11 shrink-0"
              onClick={() => setOpen(false)}
            >
              <ArrowLeft className="size-5" strokeWidth={1.5} />
            </Button>
            <div className="bg-muted/70 flex min-w-0 flex-1 items-center gap-2 px-3">
              <Search className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                autoCapitalize="off"
                autoCorrect="off"
                enterKeyHint="search"
                className="placeholder:text-muted-foreground h-11 w-full bg-transparent text-[16px] outline-none"
                aria-label="Search products"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear"
                  className="text-muted-foreground flex size-8 items-center justify-center"
                  onClick={() => setQuery('')}
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </form>

          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5">
            {suggestions.length ? (
              <section className="mb-8 space-y-2">
                <h2 className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">
                  Suggestions
                </h2>
                <ul>
                  {suggestions.map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center gap-3 text-left text-[15px] font-medium tracking-wide active:opacity-70"
                        onClick={() => goToSearch(item)}
                      >
                        <Search className="text-muted-foreground size-4" aria-hidden />
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {recent.length ? (
              <section className="mb-8 space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">
                    Recent
                  </h2>
                  <button
                    type="button"
                    className="text-muted-foreground min-h-11 px-1 text-xs font-medium tracking-wide"
                    onClick={clearRecent}
                  >
                    Clear
                  </button>
                </div>
                <ul>
                  {recent.map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center gap-3 text-left text-[15px] font-medium tracking-wide active:opacity-70"
                        onClick={() => goToSearch(item)}
                      >
                        <Clock3 className="text-muted-foreground size-4" aria-hidden />
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="mb-8 space-y-2">
              <h2 className="text-muted-foreground flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]">
                <TrendingUp className="size-3.5" aria-hidden />
                Trending
              </h2>
              <div className="flex flex-wrap gap-2 pt-1">
                {TRENDING.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="border-border text-foreground min-h-11 border px-3.5 text-sm font-medium tracking-wide transition-opacity duration-150 active:opacity-70"
                    onClick={() => goToSearch(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">
                Popular categories
              </h2>
              <ul className="divide-border/60 divide-y">
                {POPULAR_CATEGORIES.map((cat) => (
                  <li key={cat.label}>
                    <Link
                      to={cat.href as never}
                      onClick={() => setOpen(false)}
                      className="font-display flex min-h-14 items-center text-base font-semibold uppercase tracking-[-0.02em] active:opacity-70"
                    >
                      {cat.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
