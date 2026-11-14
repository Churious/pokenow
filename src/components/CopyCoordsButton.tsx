import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { Hotspot } from '../types';
import { formatCoords } from '../lib/geo';
import { useToast } from './Toast';

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
  size?: 'md' | 'lg';
}

/** The [Copy Coords] button used on the hero card and every list card. */
export function CopyCoordsButton({ hotspot, size = 'md' }: Props) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const coords = formatCoords(hotspot);

  const onClick = async () => {
    const ok = await copyText(coords);
    if (ok) {
      setCopied(true);
      toast.show(`Copied ${hotspot.city} · ${coords}`);
      window.setTimeout(() => setCopied(false), 1500);
    } else {
      toast.show('Copy failed — long-press the coordinates instead');
    }
  };

  const sizing = size === 'lg' ? 'h-12 px-5 text-base' : 'h-10 px-3.5 text-sm';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Copy coordinates for ${hotspot.city}, ${hotspot.spot}: ${coords}`}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-go ${sizing} ${
        copied
          ? 'bg-go text-night'
          : 'bg-go/15 text-emerald-300 ring-1 ring-go/40 hover:bg-go/25'
      }`}
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? 'Copied' : 'Copy Coords'}
    </button>
  );
}
