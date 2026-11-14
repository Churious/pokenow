import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { I18nProvider, type Locale } from './i18n';
import type { Messages } from './i18n/types';

/** Mounts the app once the bundle and the visitor's dictionary have both arrived. */
export function mount(initialLocale: Locale, initialMessages: Messages): void {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider initialLocale={initialLocale} initialMessages={initialMessages}>
        <App />
      </I18nProvider>
    </StrictMode>,
  );
}
