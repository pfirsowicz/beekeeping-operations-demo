import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SQLiteStore } from '../src/sqlite-store.js';
const inspect = (colonyId='col_101',date='2026-10-23')=>({type:'inspection.create',data:{colonyId,date,queenEvidence:'eggs',broodFrames:4,stores:'adequate',temperament:'calm',notes:'Fixture inspection',followUpDate:'2026-10-25'}});

test('SQLite normalized schema persists linked inspection and follow-up across reopening',()=>{
  const dir=mkdtempSync(join(tmpdir(),'hiveledger-test-'));const path=join(dir,'test.db');
  try{
    const s=new SQLiteStore(path);s.reset('2026-10-23');
    s.execute(inspect(),{operationId:'op_a',expectedRevision:0});s.close();
    const reopened=new SQLiteStore(path);
    assert.equal(reopened.read().revision,1);
    assert(reopened.read().inspections.some(i=>i.id==='ins_op_a'));
    assert(reopened.read().tasks.some(t=>t.inspectionId==='ins_op_a'));
    assert.equal(reopened.db.prepare('PRAGMA foreign_keys').get().foreign_keys,1);
    assert.equal(reopened.db.prepare('SELECT COUNT(*) AS n FROM inspections').get().n,10);
    reopened.close();
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('operation ID replay is idempotent, even if caller retains old revision',()=>{
  const s=new SQLiteStore();try{
    const original=s.read().revision;
    const a=s.execute(inspect(),{operationId:'op_a',expectedRevision:original});
    const b=s.execute(inspect(),{operationId:'op_a',expectedRevision:original});
    assert.equal(a.replayed,false);assert.equal(b.replayed,true);
    assert.equal(b.state.revision,original+1);
    assert.equal(b.state.inspections.filter(i=>i.id==='ins_op_a').length,1);
    assert.equal(b.state.events.filter(i=>i.operationId==='op_a').length,1);
  }finally{s.close();}
});
test('operation ID cannot be reused for a changed payload',()=>{
  const s=new SQLiteStore();try{
    s.execute(inspect(),{operationId:'op_a',expectedRevision:0});
    assert.throws(()=>s.execute(inspect('col_102'),{operationId:'op_a',expectedRevision:0}),e=>e.code==='CONFLICT');
  }finally{s.close();}
});
test('optimistic revision check detects concurrent editing',()=>{
  const s=new SQLiteStore();try{
    s.execute(inspect(),{operationId:'op_a',expectedRevision:0});
    assert.throws(()=>s.execute(inspect('col_102'),{operationId:'op_b',expectedRevision:0}),e=>e.code==='REVISION_CONFLICT');
    assert.equal(s.read().revision,1);
  }finally{s.close();}
});
test('invalid operation rolls back all tables and revision',()=>{
  const s=new SQLiteStore();try{
    const before=s.read();
    assert.throws(()=>s.execute({...inspect(),data:{...inspect().data,broodFrames:200}},{operationId:'op_bad',expectedRevision:0}));
    assert.deepEqual(s.read(),before);
    assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM operations').get().n,0);
  }finally{s.close();}
});
test('colony relocation persists atomically with an immutable audit event',()=>{
  const s=new SQLiteStore();try{
    s.reset('2026-10-23');
    s.execute({type:'colony.move',data:{colonyId:'col_101',toApiaryId:'api_hill',date:'2026-10-23',reason:'Temporary relocation'}},{operationId:'op_move',expectedRevision:0});
    const read=s.read();
    assert.equal(read.colonies.find(c=>c.id==='col_101').apiaryId,'api_hill');
    assert(read.events.some(e=>e.operationId==='op_move'&&e.fromApiaryId==='api_fern'&&e.toApiaryId==='api_hill'));
  }finally{s.close();}
});
test('SQLite FK rejects unlinked inspection independent of domain code',()=>{
  const s=new SQLiteStore();try{
    assert.throws(()=>s.db.prepare("INSERT INTO inspections VALUES('bad','missing','2026-10-23','seen',4,'high','calm','',NULL,'2026-10-23','2026-10-23')").run());
  }finally{s.close();}
});
test('SQLite audit retains before/after values for later review',()=>{
  const s=new SQLiteStore();try{
    s.reset('2026-10-23');
    s.execute(inspect(),{operationId:'op_base',expectedRevision:0});
    const changed={...inspect(),type:'inspection.update',id:'ins_op_base',data:{...inspect().data,notes:'Audited correction'}};
    s.execute(changed,{operationId:'op_change',expectedRevision:1});
    const audit=s.read().events.find(e=>e.operationId==='op_change');
    assert.deepEqual(audit.changes.notes,{before:'Fixture inspection',after:'Audited correction'});
    assert.equal(s.db.prepare("SELECT changes_json AS changes FROM events WHERE operation_id='op_change'").get().changes.includes('Fixture inspection'),true);
  }finally{s.close();}
});
