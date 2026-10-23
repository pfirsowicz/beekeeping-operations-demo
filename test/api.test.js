import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/server.js';

async function launch(t) {
  const {server,store}=createApp();
  store.reset('2026-10-23');
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve())));
  return `http://127.0.0.1:${server.address().port}`;
}
const body = (command,operationId='op_api',expectedRevision=0)=>({command,operationId,expectedRevision});
const inspect = () => ({type:'inspection.create',data:{colonyId:'col_101',date:'2026-10-23',queenEvidence:'seen',broodFrames:6,stores:'high',temperament:'calm',notes:'API test',followUpDate:null}});
const post = (url,data) => fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});

test('HTTP health and static entrypoint serve without external dependencies',async t=>{
  const base=await launch(t);
  const health=await fetch(`${base}/api/health`); assert.equal(health.status,200);
  assert.equal((await health.json()).demo,true);
  const doc=await fetch(base);assert.equal(doc.status,200);assert.match(await doc.text(),/HiveLedger/);
  assert.match(doc.headers.get('content-security-policy'),/default-src 'self'/);
  assert.equal((await fetch(`${base}/domain.js`)).status,200);
});
test('HTTP API persists inspection and returns revision',async t=>{
  const base=await launch(t);
  const r=await post(`${base}/api/commands`,body(inspect()));assert.equal(r.status,200);
  const payload=await r.json();assert.equal(payload.state.revision,1);
  const state=await (await fetch(`${base}/api/state`)).json();
  assert(state.inspections.some(i=>i.id==='ins_op_api'));
});
test('HTTP API returns conflict and leaves history unchanged on stale write',async t=>{
  const base=await launch(t);
  await post(`${base}/api/commands`,body(inspect(),'op_1'));
  const r=await post(`${base}/api/commands`,body(inspect(),'op_2'));
  assert.equal(r.status,409);assert.equal((await r.json()).code,'REVISION_CONFLICT');
  assert.equal((await (await fetch(`${base}/api/state`)).json()).revision,1);
});
test('HTTP API blocks path traversal and unsupported route',async t=>{
  const base=await launch(t);
  const r=await fetch(`${base}/src/sqlite-store.js`);assert.equal(r.status,404);
  const bad=await fetch(`${base}/api/secret`);assert.equal(bad.status,404);
});
test('HTTP API rejects invalid content-type and malformed JSON',async t=>{
  const base=await launch(t);
  const r=await fetch(`${base}/api/commands`,{method:'POST',body:'{}'});assert.equal(r.status,400);
  const malformed=await fetch(`${base}/api/commands`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{' });assert.equal(malformed.status,400);
});
test('HTTP API reset restores synthetic baseline',async t=>{
  const base=await launch(t);
  await post(`${base}/api/commands`,body(inspect()));
  const reset=await fetch(`${base}/api/reset`,{method:'POST'});
  assert.equal(reset.status,200);
  const restored=await reset.json();assert.equal(restored.revision,0);
  assert.equal(restored.inspections.length,9);
});
test('HTTP API completes scheduled follow-up with a retained event',async t=>{
  const base=await launch(t);
  // Seed already includes follow-ups generated for COL-102 and COL-103.
  const before=await (await fetch(`${base}/api/state`)).json();
  const target=before.tasks.find(t=>t.status==='open');
  assert(target);
  const response=await post(`${base}/api/commands`,body({type:'followup.complete',id:target.id,date:'2026-10-23'},'op_close',before.revision));
  assert.equal(response.status,200);
  const updated=(await response.json()).state;
  assert.equal(updated.tasks.find(t=>t.id===target.id).status,'done');
  assert(updated.events.some(e=>e.type==='followup-done'&&e.operationId==='op_close'));
});
