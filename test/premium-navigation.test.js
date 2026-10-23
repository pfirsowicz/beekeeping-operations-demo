import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const docs = new URL('../docs/', import.meta.url);
const premiumNames = [
  'Treatments', 'Sales &amp; Purchases', 'Weather', 'Analytics',
  'Queens', 'Mating', 'Grafting', 'Graft Lines'
];

test('premium catalogue is clearly labelled and every item is non-navigable', async () => {
  const html = await readFile(new URL('index.html', docs), 'utf8');
  const list = html.match(/<nav class="premium-option-list"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(list, 'missing premium menu');
  assert.match(html, /<details class="premium-menu" open>/);
  assert.match(html, /PREMIUM FEATURES/);
  assert.match(html, /Not available in this public demo/);
  const buttons = [...list.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map(x => x[0]);
  assert.equal(buttons.length, premiumNames.length);
  for (const [i, name] of premiumNames.entries()) {
    assert.match(buttons[i], /\sdisabled\b/, name);
    assert.match(buttons[i], /aria-label="[^"]*unavailable in the public demo"/, name);
    assert.ok(buttons[i].includes(name), name);
    assert.match(buttons[i], /class="premium-lock" aria-hidden="true"/);
    assert.doesNotMatch(buttons[i], /data-view|data-action|href=|onclick=/);
  }
});

test('locked menu has a local responsive stylesheet with no payment or API implementation', async () => {
  const html = await readFile(new URL('index.html', docs), 'utf8');
  const css = await readFile(new URL('premium.css', docs), 'utf8');
  assert.match(html, /href="\.\/premium\.css"/);
  assert.match(css, /\.premium-option:disabled/);
  assert.match(css, /\.premium-menu summary:focus-visible/);
  assert.match(css, /@media\(max-width:850px\)/);
  assert.doesNotMatch(html + css, /https?:\/\/|checkout|stripe|subscription-api/i);
});
