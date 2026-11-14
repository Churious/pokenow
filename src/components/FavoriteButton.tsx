import { Star } from 'lucide-react';
import { useI18n } from '../i18n';

interface Props {
  hotspotId: string;
  pinned: boolean;
  onToggle: (id: string) => void;
  /** Show a text label next to the icon (used on the spot page). */
  withLabel?: boolean;
}

/**
 * Star toggle for a hotspot. The state lives in localStorage only
 * (`lib/favorites.ts`), so there is no account and no server.
 */
export function FavoriteButton({ hotspotId, pinned, onToggle, withLabel = false }: Props) {
  const { t } = useI18n();

  const look = withLabel
    ? pinned
      ? 'h-12 px-4 text-gold ring-1 ring-gold/60'
      : 'h-12 px-4 text-ink ring-1 ring-rule hover:ring-dim'
    : pinned
      ? 'size-10 text-gold ring-1 ring-gold/60'
      : 'size-10 text-dim ring-1 ring-rule hover:text-ink hover:ring-dim';

  return (
    <button
      type="button"
      aria-pressed={pinned}
      aria-label={pinned ? t.favorites.unpin : t.favorites.pin}
      onClick={() => onToggle(hotspotId)}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-semibold active:translate-y-px ${look}`}
    >
      <Star className="size-4" fill={pinned ? 'currentColor' : 'none'} aria-hidden />
      {withLabel && (pinned ? t.favorites.pinned : t.favorites.pin)}
    </button>
  );
}
