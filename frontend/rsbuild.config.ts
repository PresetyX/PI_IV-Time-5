import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  server: {
    port: 3000,
  },
  html: {
    title: 'Pede Aí',
    favicon: './public/favicon.svg',
    tags: [
      { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
      { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true } },
      {
        tag: 'link',
        attrs: {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Manrope:wght@500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap',
        },
      },
    ],
  },
});
