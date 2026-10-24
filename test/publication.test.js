import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
const root = new URL('../docs/', import.meta.url);
test('GitHub Pages entrypoint uses only relative, published static assets',async()=>{
  const html=await readFile(new URL('index.html',root),'utf8');
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /src="\.\/app\.js"/);
  assert.doesNotMatch(html,/https?:\/\//);
  for (const name of ['app.js','domain.js','seed.js','styles.css']) {
    assert((await readFile(new URL(name,root))).length>100);
  }
});
test('browser-only mode does not require remote credentials or a hosted backend',async()=>{
  const app=await readFile(new URL('app.js',root),'utf8');
  assert.match(app,/!new URLSearchParams\(location.search\).has\('offline'\)/);
  assert.match(app,/localStorage/);
  assert.doesNotMatch(app,/\.supabase\.co|\/\/cdn\./);
});
