// ─── طرود: تثبيت التطبيق كتطبيق سطح مكتب (PWA) ────────────────────────────
import { useSyncExternalStore } from 'react';
import { toast } from './store';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let snapshot: { canInstall: boolean; installed: boolean } = { canInstall: false, installed: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function refresh() {
  const standalone =
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(display-mode: standalone)')?.matches;
  snapshot = { canInstall: !!deferred && !standalone, installed: standalone };
  emit();
}

export const useInstall = () =>
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => snapshot);

export function initInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    refresh();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    refresh();
    toast('تم تثبيت طرود على جهازك — ستجده في قائمة التطبيقات', 'success');
  });
  refresh();
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  try {
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') deferred = null;
    refresh();
    return choice.outcome === 'accepted';
  } catch {
    return false;
  }
}
