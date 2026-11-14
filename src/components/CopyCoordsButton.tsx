import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { Hotspot } from '../types';
import { formatCoords } from '../lib/geo';
import { useToast } from './Toast';
import { useI18n } from '../i18n';

/** Copies text, falling back to a hidden textarea for older / non-secure contexts. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

interface Props {
  hotspot: Hotspot;
  /** "primary" = filled button for the recommended spot; "quiet" = outline for list rows. */
  tone?: 'primary' | 'quiet';
}

/** The Copy coords button used on the recommendation and every list row. */
export function CopyCoordsButton({ hotspot, tone = 'quiet' }: Props) {
  const toast = useToast();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const coords = formatCoords(hotspot);

  const onClick = async () => {
    const ok = await copyText(coords);
    if (ok) {
      setCopied(true);
      toast.show(t.copy.toast(hotspot.city, coords));
      window.setTimeout(() => setCopied(false), 1500);
    } else {
      toast.show(t.copy.failed);
    }
  };

  const look =
    tone === 'primary'
      ? copied
        ? 'h-12 px-5 bg-ink text-night'
        : 'h-12 px-5 bg-hot text-night hover:bg-[#ff7a3a]'
      : copied
        ? 'h-10 px-3 text-peak ring-1 ring-peak/60'
        : 'h-10 px-3 text-ink ring-1 ring-rule hover:ring-dim';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t.copy.aria(`${hotspot.city}, ${hotspot.spot}`, coords)}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-semibold active:translate-y-px ${look}`}
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? t.copy.copied : t.copy.button}
    </button>
  );
}
