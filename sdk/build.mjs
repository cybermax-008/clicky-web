import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const sharedConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: !isWatch,
  sourcemap: isWatch,
  target: ['es2020'],
};

// IIFE build for <script> tag usage
await esbuild.build({
  ...sharedConfig,
  format: 'iife',
  globalName: 'Clicky',
  outfile: 'dist/clicky-sdk.js',
});

// ESM build for npm import
await esbuild.build({
  ...sharedConfig,
  format: 'esm',
  outfile: 'dist/clicky-sdk.esm.js',
});

console.log('Build complete.');
