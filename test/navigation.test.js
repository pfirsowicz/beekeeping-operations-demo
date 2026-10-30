import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../docs/', import.meta.url);
const views = ['overview', 'apiaries', 'colonies', 'activity', 'followups'];

test('navigation lists implemented views only', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  const nav = html.match(/<nav class="navigation" id="navigation"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(nav, 'main navigation missing');
  const actual = [...nav.matchAll(/<button\b[^>]*data-view="([^"]+)"[^>]*>/g)].map(match => match[1]);
  assert.deepEqual(actual, views);
  assert.doesNotMatch(nav, /nav-locked|premium-lock|aria-disabled="true"|data-tooltip|premium feature/i);
  assert.doesNotMatch(html, /href="\.\/premium\.css"/);
});

test('each visible navigation option maps to a working application view', async () => {
  const app = await readFile(new URL('app.js', root), 'utf8');
  const html = await readFile(new URL('index.html', root), 'utf8');
  for (const view of views) {
    assert.ok(html.includes(`data-view="${view}"`), `missing navigation entry: ${view}`);
    assert.ok(app.includes(view), `missing view handler reference: ${view}`);
  }
});
