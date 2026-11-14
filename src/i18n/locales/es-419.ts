import type { Messages } from '../types';
import { es } from './es';

/**
 * Latin American Spanish. Starts from the Spain Spanish file and overrides
 * only the wording that differs; add more overrides as native speakers review.
 */
export const es419: Messages = {
  ...es,
  languageName: 'Español (Latinoamérica)',
  copy: {
    ...es.copy,
    failed: 'No se pudo copiar. Mantén presionadas las coordenadas para copiarlas.',
  },
  travel: {
    ...es.travel,
    coordsError: 'Usa “latitud, longitud”, por ejemplo 19.4326, -99.1332.',
  },
  city: {
    ...es.city,
    openCampfire: 'Buscar incursiones en Campfire (app oficial)',
  },
};
