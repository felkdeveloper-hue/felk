import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/** Storefront is always light — dark mode is admin-only. */
export function ForceLightTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme('light');
    document.documentElement.classList.remove('dark');
  }, [setTheme]);

  return null;
}
