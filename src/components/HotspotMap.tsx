/**
 * Leaflet + OpenStreetMap map. Loaded lazily (React.lazy) so the ~40 KB map
 * library only downloads when a map scrolls into view.
 *
 * Shows hotspot locations only. PokéStop / Gym positions are deliberately not
 * shown: there is no official public data, and scraping game or scanner data
 * would break the game's Terms of Service.
 */

import 'leaflet/dist/leaflet.css';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from 'react-leaflet';
import type { ScoredHotspot } from '../types';
import { spotHref } from '../lib/routes';
import { useI18n } from '../i18n';

const COLOR = { 'raid-hour': '#f5a524', active: '#3cc796', quiet: '#4a5878' } as const;

interface Props {
  spots: ScoredHotspot[];
  /** When set, the map centres on this spot at street level. */
  focusId?: string;
  bestId?: string;
  className?: string;
}

export default function HotspotMap({ spots, focusId, bestId, className = '' }: Props) {
  const { t } = useI18n();
  const focus = focusId ? spots.find((s) => s.hotspot.id === focusId) : undefined;
  const lats = spots.map((s) => s.hotspot.lat);
  const lngs = spots.map((s) => s.hotspot.lng);
  const view = focus
    ? { center: [focus.hotspot.lat, focus.hotspot.lng] as [number, number], zoom: 15 }
    : {
        bounds: [
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)],
        ] as [[number, number], [number, number]],
        boundsOptions: { padding: [24, 24] as [number, number] },
      };

  return (
    <MapContainer
      className={`pokespot-map z-0 overflow-hidden rounded-md ring-1 ring-rule ${className}`}
      {...view}
      minZoom={0}
      zoomSnap={0.25}
      worldCopyJump
      scrollWheelZoom={false}
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {spots.map((s) => {
        const isFocus = s.hotspot.id === focusId;
        const isBest = s.hotspot.id === bestId;
        return (
          <CircleMarker
            key={s.hotspot.id}
            center={[s.hotspot.lat, s.hotspot.lng]}
            radius={isFocus ? 12 : isBest ? 9 : 6}
            pathOptions={{
              color: isFocus || isBest ? '#f06a2b' : '#0b1120',
              weight: isFocus || isBest ? 3 : 2,
              fillColor: COLOR[s.status],
              fillOpacity: 1,
            }}
          >
            {!focusId && (
              <Tooltip direction="top" offset={[0, -6]}>
                {s.hotspot.city}
              </Tooltip>
            )}
            {!isFocus && (
              <Popup>
                <strong>{s.hotspot.city}</strong>
                <br />
                {s.hotspot.spot}
                <br />
                <a href={spotHref(s.hotspot.id)}>{t.map.viewSpot}</a>
              </Popup>
            )}
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
