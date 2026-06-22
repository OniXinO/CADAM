import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: { name: '@storybook/react-vite', options: {} },
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@onlook/storybook-plugin'],

  async viteFinal(config) {
    const { mergeConfig } = await import('vite');

    // Storybook auto-loads the app's vite.config.ts, which brings in
    // full-stack / build-only plugins (TanStack Start, Nitro, the fullstack
    // adapter, Sentry, the dev-only wasm middleware). They can't run inside
    // Storybook's build — TanStack Start's manifest plugin in particular
    // errors on Storybook's extra mocker entry. Strip them (they're deeply
    // nested, so flatten first) while keeping React + Storybook's own plugins.
    const dropped = [
      'tanstack',
      'nitro',
      'fullstack',
      'sentry',
      'serve-openscad-wasm-in-dev',
    ];
    config.plugins = (config.plugins ?? []).flat(Infinity).filter((p) => {
      const name =
        p && typeof p === 'object' && 'name' in p ? String(p.name) : '';
      return !dropped.some((d) => name.toLowerCase().includes(d));
    });

    return mergeConfig(config, {
      // Storybook serves from the root, not the app's `/cadam` base.
      base: '/',
      optimizeDeps: {
        include: ['lucide-react'],
      },
    });
  },
};
export default config;
