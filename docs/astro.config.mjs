import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

const REPO = 'https://github.com/AndreaAlhena/qubeejs-core';

export default defineConfig({
  integrations: [
    starlight({
      components: {
        // The only override on the site. Doc-page chrome is left stock.
        Header: './src/components/Header.astro',
        PageTitle: './src/components/PageTitle.astro',
      },
      credits: false,
      customCss: ['./src/styles/qubee.css'],
      description:
        'Framework-agnostic query builder and paginator with pluggable drivers for 18 backend querying standards.',
      editLink: { baseUrl: `${REPO}/edit/develop/docs/` },
      favicon: '/mark.png',
      lastUpdated: true,
      logo: { alt: 'qubee', src: './public/mark.png' },
      social: [{ href: REPO, icon: 'github', label: 'GitHub' }],
      sidebar: [
        {
          label: 'Guide',
          items: [
            { label: 'Introduction', slug: 'guide/introduction' },
            { label: 'Getting started', slug: 'guide/getting-started' },
            { label: 'createQubee', slug: 'guide/factory' },
            { label: 'Building a query', slug: 'guide/building-a-query' },
            { label: 'Filters and operators', slug: 'guide/filters' },
            { label: 'Pagination', slug: 'guide/pagination' },
            { label: 'Reactivity', slug: 'guide/reactivity' },
            { label: 'Errors', slug: 'guide/errors' },
            { label: 'Bundle size', slug: 'guide/bundle-size' },
          ],
        },
        {
          label: 'Drivers',
          items: [
            { label: 'Overview', slug: 'drivers' },
            { label: 'Capability matrix', slug: 'drivers/capabilities' },
            { items: [{ autogenerate: { directory: 'drivers/reference' } }], label: 'Every driver' },
          ],
        },
        {
          label: 'Extending',
          items: [
            { label: 'Writing a driver', slug: 'extending/writing-a-driver' },
            { label: 'Response strategies', slug: 'extending/response-strategies' },
          ],
        },
        {
          label: 'API',
          collapsed: true,
          items: [
            { items: [{ autogenerate: { directory: 'api/services' } }], label: 'Services' },
            { items: [{ autogenerate: { directory: 'api/models' } }], label: 'Models' },
            { items: [{ autogenerate: { directory: 'api/enums' } }], label: 'Enums' },
            { items: [{ autogenerate: { directory: 'api/types' } }], label: 'Types' },
            { items: [{ autogenerate: { directory: 'api/errors' } }], label: 'Errors' },
            { items: [{ autogenerate: { directory: 'api/strategies' } }], label: 'Strategies' },
            { items: [{ autogenerate: { directory: 'api/reference' } }], label: 'Reference' },
          ],
        },
      ],
      title: 'qubee',
    }),
  ],
  site: 'https://qubeejs.andreatantimonaco.me',
});
