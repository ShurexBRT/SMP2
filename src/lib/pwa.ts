import { useSyncExternalStore } from 'react';

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
type InstallState = {
  secure: boolean;
  installed: boolean;
  available: boolean;
  pending: boolean;
  error: string | null;
};
let state: InstallState = {
  secure: false,
  installed: false,
  available: false,
  pending: false,
  error: null,
};
let prompt: InstallPrompt | null = null;
let initialized = false;
const listeners = new Set<() => void>();
const update = (patch: Partial<InstallState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => state;

export function initializePwa() {
  if (initialized) return;
  initialized = true;
  const standalone = window.matchMedia('(display-mode: standalone)');
  update({
    secure: window.isSecureContext,
    installed:
      standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  });
  standalone.addEventListener('change', (event) => update({ installed: event.matches }));
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    prompt = event as InstallPrompt;
    update({ available: true, error: null });
  });
  window.addEventListener('appinstalled', () => {
    prompt = null;
    update({ installed: true, available: false, pending: false });
  });
  if (!window.isSecureContext || !('serviceWorker' in navigator)) return;
  const register = () => {
    // Relative URLs preserve both localhost and /SMP2/ GitHub Pages scopes.
    void navigator.serviceWorker
      .register(new URL('./sw.js', document.baseURI), { updateViaCache: 'none' })
      .catch(() =>
        update({ error: 'Priprema instalacije nije uspela. Osveži stranicu i pokušaj ponovo.' })
      );
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

export async function installPwa() {
  const current = prompt;
  if (!current || state.pending) return;
  prompt = null;
  update({ available: false, pending: true, error: null });
  try {
    await current.prompt();
    await current.userChoice;
  } catch {
    update({ error: 'Instalacija nije pokrenuta. Pokušaj kroz meni pregledača.' });
  } finally {
    update({ pending: false });
  }
}

export function usePwaInstall() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
