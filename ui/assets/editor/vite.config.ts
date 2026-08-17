import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

function inlineGeneratedAssets(): Plugin {
  return {
    name: 'lonanote-inline-editor-assets',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = bundle['index.html'];
      if (!html || html.type !== 'asset') return;

      let source = String(html.source);
      const remove = new Set<string>();
      const findAsset = (url: string) => {
        const name = url.replace(/^\.\//, '').replace(/^\//, '');
        return bundle[name] || Object.values(bundle).find((item) => item.fileName.endsWith(name));
      };

      source = source.replace(/<script([^>]+)src=["']([^"']+)["'][^>]*><\/script>/gi, (tag, attrs, url) => {
        const asset = findAsset(url);
        if (!asset || asset.type !== 'chunk') return tag;
        remove.add(asset.fileName);
        return `<script${attrs}>${asset.code}</script>`;
      });

      source = source.replace(/<link([^>]+)href=["']([^"']+\.css)["'][^>]*\/?\s*>/gi, (tag, attrs, url) => {
        const asset = findAsset(url);
        if (!asset || asset.type !== 'asset') return tag;
        remove.add(asset.fileName);
        return `<style>${String(asset.source)}</style>`;
      });

      html.source = source;
      for (const fileName of remove) delete bundle[fileName];
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [inlineGeneratedAssets()],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    open: false,
  },
});
