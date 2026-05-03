export const THEME_STORAGE_KEY = 'vectorgraph-theme';

export const themeInitScript = `
(() => {
  const storageKey = '${THEME_STORAGE_KEY}';
  const stored = window.localStorage.getItem(storageKey);
  const mode = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  const resolved = mode === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : mode;
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.dataset.theme = resolved;
})();`;
