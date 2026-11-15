import { useCallback, useEffect, useRef, useState } from 'react';
import {
  INSTALL_DONE,
  INSTALL_NOTE_KEY,
  installVariant,
  isIos,
  isMobileDevice,
  isStandalone,
  shouldShowInstallNote,
  type InstallVariant,
} from '../lib/install';

/** Chromium's install event; not part of the DOM types yet. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function read(): string | null {
  try {
    return localStorage.getItem(INSTALL_NOTE_KEY);
  } catch {
    return null;
  }
}

function write(value: string) {
  try {
    localStorage.setItem(INSTALL_NOTE_KEY, value);
  } catch {
    /* private mode: the note still works for this visit */
  }
}

export interface InstallOffer {
  /** Which note to show; null while there is nothing to offer. */
  variant: InstallVariant | null;
  /** Opens the browser's install dialog (variant 'prompt' only). */
  install: () => Promise<void>;
  /** "Not now" / close: hides the note for a month. */
  dismiss: () => void;
}

/**
 * Captures Chromium's beforeinstallprompt event so components/InstallNote.tsx can open the real install
 * dialog later, and decides whether the note is worth showing at all: never inside the installed app,
 * never after an install, and not for a month after "Not now" (lib/install.ts).
 * Phones and tablets only (PCs keep the browser's own install button). iOS Safari gets the Share-sheet steps
 * because it has no install API. The note waits 'delayMs' so it
 * does not compete with the first paint or the ad-blocker note.
 */
export function useInstallPrompt(delayMs = 8000): InstallOffer {
  const event = useRef<InstallPromptEvent | null>(null);
  const [variant, setVariant] = useState<InstallVariant | null>(null);

  useEffect(() => {
    const ios = isIos(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
    const installed = isStandalone(
      window.matchMedia('(display-mode: standalone)').matches,
      (navigator as Navigator & { standalone?: boolean }).standalone,
    );
    // PCs: no note, and beforeinstallprompt is left alone so the browser's own install button stays.
    if (!isMobileDevice(navigator.userAgent, ios)) return;
    if (installed || !shouldShowInstallNote(read(), Date.now())) return;

    let timer: number | undefined;
    const reveal = (next: InstallVariant) => {
      if (next === 'none') return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setVariant(next), delayMs);
    };

    const onPrompt = (e: Event) => {
      // Keep Chromium's own mini-infobar out of the way: this note asks instead, in the site's words.
      e.preventDefault();
      event.current = e as InstallPromptEvent;
      reveal('prompt');
    };
    const onInstalled = () => {
      write(INSTALL_DONE);
      window.clearTimeout(timer);
      setVariant(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    reveal(installVariant(false, ios));

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(timer);
    };
  }, [delayMs]);

  const install = useCallback(async () => {
    const prompt = event.current;
    if (!prompt) return;
    event.current = null; // the event can only be used once
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      write(outcome === 'accepted' ? INSTALL_DONE : String(Date.now()));
    } catch {
      write(String(Date.now()));
    }
    setVariant(null);
  }, []);

  const dismiss = useCallback(() => {
    write(String(Date.now()));
    setVariant(null);
  }, []);

  return { variant, install, dismiss };
}
