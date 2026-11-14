import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { I18nProvider, detectLocale, loadMessages } from './i18n';
import './index.css';

// Fetch the visitor's language first so the app never flashes in English.
const initialLocale = detectLocale();
void loadMessages(initialLocale).then((initialMessages) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider initialLocale={initialLocale} initialMessages={initialMessages}>
        <App />
      </I18nProvider>
    </StrictMode>,
  );
});
