import { lazy, Suspense, useEffect, useRef, useState, type ComponentProps } from 'react';
import { useI18n } from '../i18n';

const HotspotMap = lazy(() => import('./HotspotMap'));

/**
 * Renders the map only once its box is near the viewport, so the map
 * library and tiles never load for people who don't scroll that far.
 */
export function LazyMap(props: ComponentProps<typeof HotspotMap> & { heightClass: string }) {
  const { heightClass, ...mapProps } = props;
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el || visible) return;
    if (!('IntersectionObserver' in window)) return setVisible(true);
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), {
      rootMargin: '200px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  const placeholder = (
    <div className={`grid place-items-center rounded-md bg-deck text-sm text-dim ring-1 ring-rule ${heightClass}`}>
      {t.map.loading}
    </div>
  );

  return (
    <div ref={box}>
      {visible ? (
        <Suspense fallback={placeholder}>
          <HotspotMap {...mapProps} className={heightClass} />
        </Suspense>
      ) : (
        placeholder
      )}
    </div>
  );
}
