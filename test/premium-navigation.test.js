import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../docs/', import.meta.url);
const premium = ['Treatments','Sales &amp; Purchases','Weather','Analytics','Queens','Mating','Grafting','Graft Lines'];
const active = ['overview','apiaries','colonies','activity','followups'];

test('locked features follow the working views inside one navigation', async () => {
  const html = await readFile(new URL('index.html',root),'utf8');
  const nav = html.match(/<nav class="navigation" id="navigation"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(nav,'main navigation missing');
  assert.doesNotMatch(html, /premium-menu|PREMIUM FEATURES|PREVIEW|premium-option-list/);
  const buttons=[...nav.matchAll(/<button\b[^>]*data-view="([^"]+)"[^>]*>/g)].map(x=>x[1]);
  assert.deepEqual(buttons,active);
  const entries=[...nav.matchAll(/<span class="nav-locked"[^>]*>[\s\S]*?<\/span><\/span>/g)].map(x=>x[0]);
  assert.equal(entries.length,8);
  assert.ok(nav.indexOf('data-view="followups"') < nav.indexOf('class="nav-locked"'));
  for(const [i,name] of premium.entries()){
    assert.ok(entries[i].includes(name),name);
    assert.match(entries[i], /role="button" tabindex="0" aria-disabled="true"/);
    assert.match(entries[i], /aria-label="[^"]*not included in the public demo"/);
    assert.match(entries[i], /data-tooltip="Available in the full application \(premium\)"/);
    assert.match(entries[i], /class="premium-lock" aria-hidden="true"/);
    assert.doesNotMatch(entries[i], /href=|data-action=|data-view=|onclick=/);
  }
});

test('locked appearance supports pointer and keyboard tooltip without premium routes', async () => {
  const html=await readFile(new URL('index.html',root),'utf8');
  const css=await readFile(new URL('premium.css',root),'utf8');
  assert.match(css,/\.navigation \.nav-locked:hover:after/);
  assert.match(css,/\.navigation \.nav-locked:focus-visible:after/);
  assert.match(css,/\.navigation \.nav-locked:focus-visible\{/);
  assert.match(css,/@media\(max-width:850px\)/);
  assert.match(html,/href="\.\/premium\.css"/);
  assert.doesNotMatch(html+css, /checkout|stripe|subscription-api|https?:\/\//i);
});
