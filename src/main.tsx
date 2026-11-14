import { detectLocale, loadMessages } from './i18n/load';
import './index.css';

// Keep this entry tiny: it only picks the language, then downloads the app
// bundle and that language's dictionary at the same time instead of one after
// the other. The app is mounted when both have arrived, so it never flashes in
// English.
const initialLocale = detectLocale();
void Promise.all([import('./bootstrap'), loadMessages(initialLocale)]).then(([{ mount }, messages]) =>
  mount(initialLocale, messages),
);
