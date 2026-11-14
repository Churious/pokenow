import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths so the same build works on GitHub Pages (/pokespot/),
  // a custom domain, or any static host.
  base: './',
  plugins: [react(), tailwindcss()],
});
