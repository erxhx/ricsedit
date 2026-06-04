/**
 * Pre-compiles the live-site JSX files to vanilla JS so the browser
 * never needs to download or run @babel/standalone (1.6 MB).
 *
 * Run automatically as part of `npm run build` (see package.json).
 * Output goes to public/site/ where Next.js serves static files.
 *
 * esbuild with bundle:false + no format option = pure JSX→JS transform,
 * no module wrappers added, global scope preserved exactly as before.
 */

import { build } from 'esbuild';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = join(__dirname, '..');

const files = ['tweaks-panel', 'animations', 'content', 'booking', 'app'];

console.log('Compiling site JSX…');

await build({
  entryPoints: files.map(f => join(root, 'editstudio.space', `${f}.jsx`)),
  outdir:      join(root, 'public', 'site'),
  bundle:      false,   // no bundling
  format:      'iife',  // wrap each file in its own scope
  minify:      true,
  keepNames:   true,    // preserve names used as window globals (HomeAnim, BarberingContent etc)
  jsx:         'transform',
  jsxFactory:  'React.createElement',
  jsxFragment: 'React.Fragment',
  target:      'es2019',
  logLevel:    'warning',
  // Override the project tsconfig "jsx": "react-jsx" (automatic transform)
  // — these files use global React from CDN, not module imports.
  tsconfigRaw: '{"compilerOptions":{"jsx":"react"}}',
});

console.log(`✓ Compiled ${files.length} files → public/site/*.js`);
