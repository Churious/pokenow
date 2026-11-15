import { Flame, CloudSun } from 'lucide-react';
import { useI18n } from '../i18n';
import { useToast } from './Toast';
import { hasVotedLocally, type SpotTagEntry, type SpotTagKind } from '../lib/tags';

interface Props {
  spotId: string;
  entries?: Partial<Record<SpotTagKind, SpotTagEntry>>;
  onVote: (spotId: string, tag: SpotTagKind) => Promise<'voted' | 'removed'>;
  compact?: boolean;
}

export function SpotTagBar({ spotId, entries, onVote, compact = false }: Props) {
  const { t } = useI18n();
  const toast = useToast();

  const handleVote = async (tag: SpotTagKind) => {
    const res = await onVote(spotId, tag);
    toast.show(res === 'voted' ? t.livePulse.tagRecorded : t.livePulse.tagRemoved);
  };

  const busyCount = entries?.busy?.count ?? 0;
  const weatherCount = entries?.weather?.count ?? 0;
  const busyVoted = hasVotedLocally(spotId, 'busy');
  const weatherVoted = hasVotedLocally(spotId, 'weather');
  const baseBtn = compact
    ? 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition active:translate-y-px'
    : 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition active:translate-y-px';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        aria-pressed={busyVoted}
        onClick={() => void handleVote('busy')}
        className={`${baseBtn} ${
          busyVoted
            ? 'border-hot bg-hot/20 text-hot'
            : busyCount > 0
              ? 'border-hot/50 bg-hot/10 text-hot hover:border-hot'
              : 'border-rule bg-deck/60 text-dim hover:border-dim hover:text-ink'
        }`}
      >
        <Flame className="size-3.5 shrink-0" aria-hidden />
        <span>{t.livePulse.busy}</span>
        {busyCount > 0 && <span className="tabular-nums font-bold">{busyCount}</span>}
      </button>

      <button
        type="button"
        aria-pressed={weatherVoted}
        onClick={() => void handleVote('weather')}
        className={`${baseBtn} ${
          weatherVoted
            ? 'border-peak bg-peak/20 text-peak'
            : weatherCount > 0
              ? 'border-peak/50 bg-peak/10 text-peak hover:border-peak'
              : 'border-rule bg-deck/60 text-dim hover:border-dim hover:text-ink'
        }`}
      >
        <CloudSun className="size-3.5 shrink-0" aria-hidden />
        <span>{t.livePulse.weather}</span>
        {weatherCount > 0 && <span className="tabular-nums font-bold">{weatherCount}</span>}
      </button>
    </div>
  );
}
