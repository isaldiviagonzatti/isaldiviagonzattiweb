import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.ignaciosg.com',
  output: 'static',
  redirects: {
    '/publications': '/resume/#publications',
    '/project/thesismsc': 'https://library.wur.nl/WebQuery/theses/2327484'
  },
  build: {
    format: 'directory'
  }
});
