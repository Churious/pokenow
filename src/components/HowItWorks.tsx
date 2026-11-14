import { rich, useI18n } from '../i18n';

/**
 * Plain-language explanation of the ranking, shown near the bottom of the page.
 * Keeps the page useful on its own (and gives readers a reason to trust the pick).
 */
export function HowItWorks() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="how-title" className="border-b border-rule py-6">
      <h2 id="how-title" className="semi-condensed text-lg font-bold text-ink">
        {t.how.title}
      </h2>
      <div className="mt-3 max-w-prose space-y-3 text-sm leading-relaxed text-dim">
        <p>{t.how.p1}</p>
        <p>
          {rich(t.how.p2, {
            golden: <span className="text-gold">18:00–19:00</span>,
            peak: <span className="text-peak">11:00–20:00</span>,
          })}
        </p>
        <p>{t.how.p3}</p>
      </div>
    </section>
  );
}
