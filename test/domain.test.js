import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand, DomainError, validateInspection, colonyTimeline, colonyInspections } from '../docs/domain.js';
import { makeSeed } from '../docs/seed.js';

const seed = () => makeSeed('2026-10-23');
const inspection = (colonyId='col_101',date='2026-10-23',overrides={}) => ({
  colonyId,date,queenEvidence:'not-seen',broodFrames:null,stores:'unknown',temperament:'unknown',notes:'New queen not seen; no loss inferred.',followUpDate:null,...overrides
});
const create = (state,params={},op='op_new')=>applyCommand(state,{type:'inspection.create',data:inspection('col_101','2026-10-23',params)},op);

test('synthetic seed has no live site identities and stable linked entities',()=>{
  const s=seed();assert.equal(s.apiaries.length,3);assert.equal(s.colonies.length,6);
  assert.equal(s.inspections.length,9);assert(s.colonies.every(c=>s.apiaries.some(a=>a.id===c.apiaryId)));
});
test('inspection records preserve unknown versus explicit zero brood',()=>{
  const s=create(seed());assert.equal(s.inspections.at(-1).broodFrames,null);
  const zero=create(s,{broodFrames:0},'op_zero');assert.equal(zero.inspections.at(-1).broodFrames,0);
  assert.notEqual(zero.inspections.at(-1).broodFrames,null);
});
test('inspection creates linked follow-up and audit event',()=>{
  const s=create(seed(),{followUpDate:'2026-10-26'},'op_followup');
  const record=s.inspections.at(-1);
  assert.equal(s.revision,1);assert.equal(record.id,'ins_op_followup');
  assert(s.tasks.some(t=>t.inspectionId===record.id&&t.dueDate==='2026-10-26'));
  assert(s.events.some(e=>e.operationId==='op_followup'&&e.type==='inspection'));
});
test('inspection rejects invalid calendar date, invalid enum, frames, and follow-up chronology',()=>{
  for(const payload of [
    {date:'2026-02-30'},{queenEvidence:'queen-lost'},{broodFrames:11},{broodFrames:-1},
    {broodFrames:2.5},{followUpDate:'2026-10-22'}, {notes:'X'.repeat(1001)}
  ]) assert.throws(()=>create(seed(),payload),DomainError);
});
test('move updates only current apiary, preserving original inspection and source/destination event',()=>{
  const original=seed();const count=original.inspections.length;
  const moved=applyCommand(original,{type:'colony.move',data:{colonyId:'col_101',toApiaryId:'api_hill',date:'2026-10-23',reason:'Seasonal repositioning'}},'op_move');
  assert.equal(original.colonies.find(c=>c.id==='col_101').apiaryId,'api_fern');
  assert.equal(moved.colonies.find(c=>c.id==='col_101').apiaryId,'api_hill');
  assert.equal(moved.inspections.length,count);
  assert.deepEqual(moved.inspections,original.inspections);
  const ev=moved.events.find(e=>e.operationId==='op_move');
  assert.deepEqual([ev.fromApiaryId,ev.toApiaryId,ev.date],['api_fern','api_hill','2026-10-23']);
  assert.equal(colonyTimeline(moved,'col_101')[0].type,'move');
});
test('moves cannot be backdated across latest inspection or move',()=>{
  assert.throws(()=>applyCommand(seed(),{type:'colony.move',data:{colonyId:'col_101',toApiaryId:'api_hill',date:'2026-10-19'}},'op_move'),e=>e.code==='CHRONOLOGY');
});
test('move rejects same destination and unknown destination without mutation',()=>{
  const before=seed();
  assert.throws(()=>applyCommand(before,{type:'colony.move',data:{colonyId:'col_101',toApiaryId:'api_fern',date:'2026-10-23'}},'op_a'));
  assert.throws(()=>applyCommand(before,{type:'colony.move',data:{colonyId:'col_101',toApiaryId:'api_none',date:'2026-10-23'}},'op_b'));
  assert.equal(before.revision,0);
});
test('new inspection cannot be inserted before latest move',()=>{
  assert.throws(()=>applyCommand(seed(),{type:'inspection.create',data:inspection('col_202','2026-09-01')},'op_old'),e=>e.code==='CHRONOLOGY');
});
test('edit updates follow-up and records audit without replacing identity',()=>{
  const a=create(seed(),{followUpDate:'2026-10-26'},'op_editme');
  const previous=a.inspections.at(-1);
  const b=applyCommand(a,{type:'inspection.update',id:previous.id,data:inspection('col_101','2026-10-23',{notes:'Revised observation',followUpDate:null})},'op_edit');
  assert.equal(b.inspections.length,a.inspections.length);
  assert.equal(b.inspections.at(-1).id,previous.id);
  assert.equal(b.inspections.at(-1).notes,'Revised observation');
  assert.equal(b.tasks.find(t=>t.inspectionId===previous.id).status,'cancelled');
  assert(b.events.some(e=>e.type==='inspection-edit'&&e.operationId==='op_edit'));
});
test('cannot reassign an inspection to a different colony',()=>{
  const existing=seed().inspections[0];
  assert.throws(()=>applyCommand(seed(),{type:'inspection.update',id:existing.id,data:inspection('col_102',existing.date)},'op_reassign'));
});
test('editing a historical inspection remains possible on same side of a later move',()=>{
  const s=seed();
  const historical=s.inspections.find(i=>i.colonyId==='col_101');
  const next=applyCommand(s,{type:'colony.move',data:{colonyId:'col_101',toApiaryId:'api_hill',date:'2026-10-23'}},'op_move');
  const changed=applyCommand(next,{type:'inspection.update',id:historical.id,data:{...historical,notes:'Correction to earlier field notes'}},'op_old_edit');
  assert.equal(changed.inspections.find(i=>i.id===historical.id).notes,'Correction to earlier field notes');
  assert.throws(()=>applyCommand(next,{type:'inspection.update',id:historical.id,data:{...historical,date:'2026-10-24'}},'op_cross'),e=>e.code==='CHRONOLOGY');
});
test('history and latest inspection sort by domain date',()=>{
  const s=create(seed());
  assert.equal(colonyInspections(s,'col_101')[0].date,'2026-10-23');
  assert.equal(colonyTimeline(s,'col_101')[0].date,'2026-10-23');
});
test('complete follow-up changes only its status and appends a traceable event',()=>{
  const s=create(seed(),{followUpDate:'2026-10-26'},'op_check');
  const a=applyCommand(s,{type:'followup.complete',id:'task_ins_op_check',date:'2026-10-26'},'op_complete');
  assert.equal(a.tasks.find(t=>t.id==='task_ins_op_check').status,'done');
  assert.equal(s.tasks.find(t=>t.id==='task_ins_op_check').status,'open');
  assert(a.events.some(e=>e.type==='followup-done'&&e.operationId==='op_complete'));
  assert.throws(()=>applyCommand(a,{type:'followup.complete',id:'task_ins_op_check',date:'2026-10-27'},'op_twice'),e=>e.code==='CONFLICT');
});
test('editing preserves before/after values in an append-only audit event',()=>{
  const s=create(seed(),{notes:'Original note'},'op_edit_details');
  const id=s.inspections.at(-1).id;
  const next=applyCommand(s,{type:'inspection.update',id,data:inspection('col_101','2026-10-23',{notes:'Corrected note'})},'op_revision');
  const edit=next.events.find(e=>e.operationId==='op_revision');
  assert.deepEqual(edit.changes.notes,{before:'Original note',after:'Corrected note'});
  assert(!s.events.some(e=>e.operationId==='op_revision'));
});
