import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.ignaciosg.com',
  output: 'static',
  redirects: {
    '/publications': '/resume/#publications'
  },
  build: {
    format: 'directory'
  }
});
