export function getTheme(): 'light' | 'dark' {
  try {
    return localStorage.getItem('smp-theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}
export function setTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('smp-theme', theme);
  } catch {
    /* Theme remains usable without storage. */
  }
}
