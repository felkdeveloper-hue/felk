import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { ROUTES } from '@/constants';
import { useUiStore } from '@/store/ui-store';
import { Button } from '@/components/ui/button';

/** Full-screen floating search overlay triggered from header / mobile nav. */
export function FloatingSearch() {
  const open = useUiStore((state) => state.isSearchOpen);
  const setOpen = useUiStore((state) => state.setSearchOpen);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
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
    setOpen(false);
    const path = value ? `${ROUTES.search}?q=${encodeURIComponent(value)}` : ROUTES.search;
    void navigate({ to: path as typeof ROUTES.search });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    goToSearch(query.trim());
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="bg-foreground/45 fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[18vh] backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.form
            role="search"
            onSubmit={submit}
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel relative w-full max-w-2xl rounded-[1.75rem] border border-white/50 p-3 shadow-[var(--shadow-elevated)]"
          >
            <div className="bg-background/80 flex items-center gap-2 rounded-2xl px-3 py-2">
              <Search className="text-muted-foreground size-5 shrink-0" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products, brands, styles…"
                className="placeholder:text-muted-foreground h-12 w-full bg-transparent text-base outline-none"
                aria-label="Search products"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Close search"
                onClick={() => setOpen(false)}
              >
                <X />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 px-2 pb-1 pt-3">
              {['New arrivals', 'Dresses', 'Sneakers', 'Sale'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                  onClick={() => goToSearch(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
