import { applyCommand, DomainError, QUEEN_EVIDENCE, STORES, TEMPERAMENT, colonyInspections, colonyTimeline, findApiary, findColony } from './domain.js';
import { makeSeed } from './seed.js';

const STORE_KEY = 'hiveledger-synthetic-v1';
const backend = ['localhost','127.0.0.1'].includes(location.hostname) && ['http:','https:'].includes(location.protocol) && !new URLSearchParams(location.search).has('offline');
const content = document.querySelector('#content');
const nav = document.querySelector('#navigation');
const dialog = document.querySelector('#editor');
const form = document.querySelector('#editor-form');
const fields = document.querySelector('#form-fields');
let state;
let view = 'overview';
let selectedColony = null;
let selectedApiary = '';
let filterText = '';
let editor = null;

const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = iso => iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}) : 'Never';
const todayLocal = () => { const n = new Date(); return new Date(n.getTime()-n.getTimezoneOffset()*60000).toISOString().slice(0,10); };
const nameOf = id => findApiary(state,id)?.name ?? 'Unknown apiary';
const codeOf = id => findColony(state,id)?.code ?? 'Unknown colony';
const newest = id => colonyInspections(state,id)[0];
const query = (endpoint,options) => fetch(`./api/${endpoint}`, options).then(async r => { const data=await r.json(); if(!r.ok) throw new DomainError(data.error || 'Request failed',data.code); return data; });
const id = () => crypto.randomUUID();

async function loadState() {
  if (backend) return await query('state');
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if(saved && saved.schemaVersion === 1 && Array.isArray(saved.colonies) && Array.isArray(saved.events)) return saved;
  } catch { /* Malformed prior demo state: reset below */ }
  const fresh = makeSeed(todayLocal());
  localStorage.setItem(STORE_KEY,JSON.stringify(fresh));
  return fresh;
}
async function saveCommand(command) {
  const op = `op_${id()}`;
  if(backend) {
    const r = await query('commands',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command,expectedRevision:state.revision,operationId:op})});
    return r.state;
  }
  const current = await loadState();
  if(current.revision !== state.revision) throw new DomainError('Demo data changed in another tab. Reload first.','REVISION_CONFLICT');
  const updated = applyCommand(current,command,op);
  localStorage.setItem(STORE_KEY,JSON.stringify(updated));
  return updated;
}
function notify(message,error=false) {
  const node = document.querySelector('#notice');
  node.textContent = message;
  node.classList.toggle('error',error);
  node.hidden = false;
}
const pill = (text,variant='') => `<span class="pill ${variant}">${esc(text)}</span>`;
function inspectionPill(inspection) {
  if(!inspection) return pill('Not assessed','neutral');
  return pill(QUEEN_EVIDENCE[inspection.queenEvidence], ['seen','eggs'].includes(inspection.queenEvidence)?'':'caution');
}
const section = (title,subtitle) => `<h2 class="section-title">${esc(title)}</h2><p class="section-subtitle">${esc(subtitle)}</p>`;
const empty = message => `<div class="empty"><div class="empty-icon">◇</div>${esc(message)}</div>`;
function eventRows(max=8,colonyId=null) {
  const items = [
    ...state.inspections.filter(i=>!colonyId||i.colonyId===colonyId).map(i=>({...i,kind:'inspection',detail:`${QUEEN_EVIDENCE[i.queenEvidence]} · ${i.broodFrames===null?'Brood unknown':`${i.broodFrames} brood frames`}`})),
    ...state.events.filter(e=>['move','inspection-edit','followup-done'].includes(e.type)&&(!colonyId||e.colonyId===colonyId)).map(e=>({...e,kind:e.type==='move'?'move':e.type==='followup-done'?'done':'edit',detail:e.type==='move'?`${nameOf(e.fromApiaryId)} → ${nameOf(e.toApiaryId)}`:e.type==='inspection-edit'?`${Object.keys(e.changes??{}).join(', ')||'No fields'} recorded in audit`:'Follow-up closed'}))
  ].sort((a,b)=>b.date.localeCompare(a.date) || (b.createdAt??'').localeCompare(a.createdAt??'')).slice(0,max);
  if(!items.length) return empty('No activity recorded');
  return items.map(e=>`<div class="activity-row"><span class="event-icon ${e.kind==='move'?'move':''}" aria-hidden="true">${e.kind==='move'?'⇄':'✎'}</span><div class="activity-copy"><strong>${esc(codeOf(e.colonyId))} · ${e.kind==='move'?'Colony moved':e.kind==='edit'?'Inspection edited':e.kind==='done'?'Follow-up completed':'Inspection recorded'}</strong><span>${esc(e.detail)}</span></div><time class="activity-date" datetime="${esc(e.date)}">${dateLabel(e.date)}</time></div>`).join('');
}
function taskRows(limit=20) {
  const list = state.tasks.filter(t=>t.status==='open').sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,limit);
  if(!list.length) return empty('No open follow-ups');
  return list.map(t=>`<div class="task-row"><span class="event-icon" aria-hidden="true">◷</span><div class="activity-copy"><strong>${esc(codeOf(t.colonyId))} · ${esc(t.title)}</strong><span>Due ${dateLabel(t.dueDate)}</span><button class="inline-link" type="button" data-action="colony" data-id="${esc(t.colonyId)}">View colony →</button> <button class="inline-link" type="button" data-action="complete-task" data-id="${esc(t.id)}">Mark done ✓</button></div><span class="task-tag">${t.dueDate<todayLocal()?'OVERDUE':'OPEN'}</span></div>`).join('');
}
function apiaryCards(apiaries=state.apiaries) {
  return `<div class="apiary-grid">${apiaries.map(a=>{
    const n=state.colonies.filter(c=>c.apiaryId===a.id&&c.status==='active').length;
    return `<button class="apiary-card" type="button" data-action="apiary" data-id="${esc(a.id)}"><div class="apiary-top"><span class="apiary-icon" aria-hidden="true">◇</span><span class="apiary-count">${n} ${n===1?'colony':'colonies'}</span></div><h3>${esc(a.name)}</h3><p>${esc(a.description)}</p><div class="apiary-meta">${esc(a.region)} &nbsp;→</div></button>`;
  }).join('')}</div>`;
}
function overview() {
  const recent=state.inspections.filter(i=>i.date>=new Date(Date.now()-30*86400000).toISOString().slice(0,10)).length;
  const tasks=state.tasks.filter(t=>t.status==='open').length;
  return `<section class="hero"><div><span class="eyebrow">FIELD OPERATIONS · FICTIONAL WORKSPACE</span><h2>A clearer picture of every colony.</h2><p>Record inspections, track follow-up work and maintain an auditable history of moves between apiaries.</p></div><div class="hero-stat"><b>${state.colonies.filter(c=>c.status==='active').length}</b><small>Active colonies tracked</small></div></section>
  <div class="metric-grid"><div class="metric-card"><span class="metric-label">Active colonies</span><strong class="metric-value">${state.colonies.filter(c=>c.status==='active').length}</strong><span class="metric-foot">Across all sample locations</span></div><div class="metric-card"><span class="metric-label">Apiaries</span><strong class="metric-value">${state.apiaries.length}</strong><span class="metric-foot">Fictional sites</span></div><div class="metric-card"><span class="metric-label">Inspections · last 30d</span><strong class="metric-value">${recent}</strong><span class="metric-foot">Structured observations</span></div><div class="metric-card"><span class="metric-label">Open follow-ups</span><strong class="metric-value">${tasks}</strong><span class="metric-foot">Generated from inspections</span></div></div>
  <div class="content-grid"><div><div class="panel"><div class="panel-head"><div><h2>Apiary overview</h2><p>Choose a site to explore its colonies</p></div><button class="inline-link" data-view="apiaries">All apiaries →</button></div>${apiaryCards()}</div><div class="panel"><div class="panel-head"><div><h2>Recent field activity</h2><p>Inspections and traceable lifecycle events</p></div><button class="inline-link" data-view="activity">View history →</button></div>${eventRows(5)}</div></div><div><div class="panel"><div class="panel-head"><div><h2>Follow-ups</h2><p>Outstanding checks from recent inspections</p></div><button class="inline-link" data-view="followups">See all →</button></div>${taskRows(5)}</div><div class="panel"><div class="panel-head"><div><h2>What this demo shows</h2></div></div><p class="section-subtitle">Stable colony identity, structured validation, immutable move history, optimistic concurrency and a local SQLite-backed API.</p><button class="button secondary" data-view="colonies">Explore colonies →</button></div></div></div>`;
}
function apiariesView() {return `${section('Apiary sites','Synthetic locations; selecting a site opens its colony list.')}${apiaryCards()}`;}
function coloniesView() {
  const list=state.colonies.filter(c=>(!selectedApiary||c.apiaryId===selectedApiary)&&(!filterText||`${c.code} ${nameOf(c.apiaryId)}`.toLowerCase().includes(filterText.toLowerCase())));
  return `<div class="toolbar"><div><h2 class="section-title">Colony register</h2><p class="section-subtitle">Stable IDs across inspections and apiary transfers</p></div><div class="filters"><input id="colony-search" class="search-input" type="search" placeholder="Search colony or apiary" aria-label="Search colonies" value="${esc(filterText)}" /><select class="filter-select" id="apiary-filter" aria-label="Filter by apiary"><option value="">All apiaries</option>${state.apiaries.map(a=>`<option value="${esc(a.id)}" ${selectedApiary===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></div></div><div class="colony-grid">${list.map(c=>{
    const last=newest(c.id);
    return `<button type="button" class="colony-card" data-action="colony" data-id="${esc(c.id)}"><span class="pill">ACTIVE</span><strong class="colony-number">${esc(c.code)}</strong><span class="colony-location">${esc(nameOf(c.apiaryId))} · ${esc(c.hiveType)}</span><div class="colony-bottom"><div><small>QUEEN EVIDENCE</small>${inspectionPill(last)}</div><div><small>LAST INSPECTED</small><strong>${dateLabel(last?.date)}</strong></div></div></button>`;
  }).join('')}</div>${list.length?'':empty('No colonies match these filters')}`;
}
function detailView() {
  const colony=findColony(state,selectedColony);
  if(!colony){view='colonies'; return coloniesView();}
  const last=newest(colony.id);
  const history=[...colonyTimeline(state,colony.id),...state.events.filter(e=>['inspection-edit','followup-done'].includes(e.type)&&e.colonyId===colony.id)].sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt??'').localeCompare(a.createdAt??''));
  return `<button type="button" class="inline-link" data-view="colonies">← Back to colonies</button><div class="detail-head detail-after-back"><div><span class="eyebrow">COLONY RECORD</span><h2>${esc(colony.code)}</h2><p>${esc(nameOf(colony.apiaryId))} · ${esc(colony.hiveType)}</p></div><div class="detail-actions"><button type="button" class="button secondary" data-action="move" data-id="${esc(colony.id)}">⇄ Move colony</button><button type="button" class="button primary" data-action="new-inspection" data-id="${esc(colony.id)}">+ Inspect colony</button></div></div>
  <div class="detail-facts"><div class="fact"><small>Current apiary</small><strong>${esc(nameOf(colony.apiaryId))}</strong></div><div class="fact"><small>Latest queen observation</small><strong>${esc(last?QUEEN_EVIDENCE[last.queenEvidence]:'Not assessed')}</strong></div><div class="fact"><small>Latest brood frames</small><strong>${last?.broodFrames===null||last===undefined?'Unknown':last.broodFrames}</strong></div></div>
  <div class="panel"><div class="panel-head"><div><h2>Colony history</h2><p>Past inspections and location moves are retained under the same stable colony ID</p></div></div>${history.length?history.map(x=>{
    const moved=x.type==='move'; const edited=x.type==='inspection-edit'; const followup=x.type==='followup-done';
    return `<div class="timeline-row"><div class="timeline-indicator"></div><div class="timeline-item"><div class="timeline-heading"><strong>${moved?'Colony moved':edited?'Inspection updated':followup?'Follow-up completed':'Inspection'}</strong><time datetime="${esc(x.date)}">${dateLabel(x.date)}</time></div>${moved?`<p><strong>${esc(nameOf(x.fromApiaryId))} → ${esc(nameOf(x.toApiaryId))}</strong></p><p>${esc(x.summary)}</p>`:edited?`<p>Audit event: ${esc(Object.keys(x.changes??{}).join(', ')||'No values')} changed. Previous and updated values are retained in the local SQLite event record.</p>`:followup?`<p>Outstanding follow-up marked completed.</p>`:`<p>${esc(QUEEN_EVIDENCE[x.queenEvidence])} · ${x.broodFrames===null?'Unknown brood':`${x.broodFrames} brood frames`} · Stores: ${esc(STORES[x.stores])} · Temperament: ${esc(TEMPERAMENT[x.temperament])}</p><p>${esc(x.notes||'No notes recorded.')}</p>${x.followUpDate?`<p class="metadata">Follow-up: ${dateLabel(x.followUpDate)}</p>`:''}<button type="button" class="inline-link" data-action="edit-inspection" data-id="${esc(x.id)}">Edit inspection →</button>`}</div></div>`;
  }).join(''):empty('This colony has no recorded history')}</div>`;
}
function activityView() {return `${section('Activity history','Inspection records and moves across the fictional workspace, newest first.')}<div class="panel">${eventRows(100)}</div>`;}
function tasksView() {return `${section('Follow-up queue','Due dates derive from structured inspections. Edit an inspection to change its follow-up.')}<div class="panel">${taskRows(100)}</div>`;}
function render() {
  const title={overview:'Overview',apiaries:'Apiaries',colonies:'Colonies',detail:'Colony details',activity:'Activity',followups:'Follow-ups'}[view]||'Overview';
  document.querySelector('#page-title').textContent=title;
  nav.querySelectorAll('button').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===(view==='detail'?'colonies':view)));
  content.innerHTML={overview,apiaries:apiariesView,colonies:coloniesView,detail:detailView,activity:activityView,followups:tasksView}[view]?.()??overview();
}
function selectOptions(source,selected) {
  return Object.entries(source).map(([value,label])=>`<option value="${esc(value)}" ${value===selected?'selected':''}>${esc(label)}</option>`).join('');
}
function field(label,name,value,type='text',extras='') {
  return `<div class="field"><label for="f-${esc(name)}">${esc(label)}</label><input id="f-${esc(name)}" name="${esc(name)}" type="${esc(type)}" value="${esc(value??'')}" ${extras}></div>`;
}
function choose(label,name,options,selected) {
  return `<div class="field"><label for="f-${esc(name)}">${esc(label)}</label><select id="f-${esc(name)}" name="${esc(name)}">${selectOptions(options,selected)}</select></div>`;
}
function openEditor(kind,entityId) {
  editor={kind,entityId};
  const editing = kind==='edit-inspection' ? state.inspections.find(i=>i.id===entityId) : null;
  if(kind==='edit-inspection' && !editing){notify('Inspection not found.',true);return;}
  const colonyId = editing?.colonyId || (kind==='new-inspection'&&state.colonies.some(c=>c.id===entityId)?entityId:state.colonies[0]?.id);
  const on = editing?.date || todayLocal();
  const isMove = kind==='move';
  document.querySelector('#dialog-title').textContent=isMove?'Move colony':editing?'Edit inspection':'Record inspection';
  document.querySelector('#submit-form').textContent=isMove?'Confirm move':editing?'Save changes':'Save inspection';
  fields.innerHTML=isMove?`
    <div class="form-fields"><p class="form-hint">The move updates the current site and preserves an immutable source→destination history event.</p>
    ${field('Colony','colony',codeOf(entityId),'text','disabled')}
    <div class="field-grid">${field('Move date','date',todayLocal(),'date','required')}${choose('Destination apiary','toApiaryId',Object.fromEntries(state.apiaries.filter(a=>a.id!==findColony(state,entityId)?.apiaryId).map(a=>[a.id,a.name])),state.apiaries.find(a=>a.id!==findColony(state,entityId)?.apiaryId)?.id)}</div>
    <div class="field"><label for="f-reason">Reason</label><textarea id="f-reason" name="reason" maxlength="300" placeholder="Reason for relocation"></textarea></div></div>` : `
    <div class="form-fields"><div class="field-grid">${choose('Colony','colonyId',Object.fromEntries(state.colonies.map(c=>[c.id,`${c.code} · ${nameOf(c.apiaryId)}`])),colonyId)}${field('Inspection date','date',on,'date','required')}</div>
    <div class="field-grid">${choose('Queen observation','queenEvidence',QUEEN_EVIDENCE,editing?.queenEvidence??'unknown')}${field('Brood frames (0–10)','broodFrames',editing?.broodFrames??'','number','min="0" max="10" step="1" placeholder="Unknown"')}</div>
    <div class="field-grid">${choose('Stores','stores',STORES,editing?.stores??'unknown')}${choose('Temperament','temperament',TEMPERAMENT,editing?.temperament??'unknown')}</div>
    <div class="field"><label for="f-notes">Inspection notes</label><textarea id="f-notes" name="notes" maxlength="1000" placeholder="Observed conditions, next actions…">${esc(editing?.notes??'')}</textarea></div>
    ${field('Follow-up date (optional)','followUpDate',editing?.followUpDate??'','date')}
    <p class="form-hint">Observations are evidence, not inferred queen identities. Empty brood count means unknown, not zero.</p></div>`;
  fields.querySelector('.form-fields')?.classList.add('form-fields');
  if(editing) fields.querySelector('#f-colonyId').disabled=true;
  dialog.showModal();
}
async function handleSubmit(event) {
  event.preventDefault();
  if(!editor) return;
  const data=new FormData(form);
  try {
    const command=editor.kind==='move' ? {type:'colony.move',data:{colonyId:editor.entityId,toApiaryId:data.get('toApiaryId'),date:data.get('date'),reason:data.get('reason')}} : {
      type:editor.kind==='edit-inspection'?'inspection.update':'inspection.create',
      ...(editor.kind==='edit-inspection'?{id:editor.entityId}:{}),
      data:{colonyId:editor.kind==='edit-inspection'?state.inspections.find(i=>i.id===editor.entityId).colonyId:data.get('colonyId'),date:data.get('date'),queenEvidence:data.get('queenEvidence'),broodFrames:data.get('broodFrames'),stores:data.get('stores'),temperament:data.get('temperament'),notes:data.get('notes'),followUpDate:data.get('followUpDate')}
    };
    state=await saveCommand(command);
    if(editor.kind==='move') selectedColony=editor.entityId;
    else selectedColony=command.data.colonyId;
    view='detail';
    dialog.close();editor=null;render();
    notify(command.type==='colony.move'?'Colony moved; original site preserved in the timeline.':command.type==='inspection.update'?'Inspection updated; audit event retained.':'Inspection saved and follow-up updated.');
  }catch(e){notify(e.message||'Save failed.',true);}
}

document.body.addEventListener('click',async event=>{
  const button=event.target.closest('button[data-view],button[data-action]');
  if(!button) return;
  if(button.dataset.view){view=button.dataset.view;selectedApiary='';filterText='';render();return;}
  const action=button.dataset.action;
  if(action==='apiary'){selectedApiary=button.dataset.id;filterText='';view='colonies';render();}
  else if(action==='colony'){selectedColony=button.dataset.id;view='detail';render();}
  else if(action==='complete-task') {
    try {state=await saveCommand({type:'followup.complete',id:button.dataset.id,date:todayLocal()});render();notify('Follow-up completed; audit event retained.');}
    catch(e){notify(e.message||'Unable to complete follow-up.',true);}
  }
  else if(['new-inspection','edit-inspection','move'].includes(action)) openEditor(action,button.dataset.id);
});
content.addEventListener('input', e=>{
  if(e.target.id==='colony-search'){
    const pos=e.target.selectionStart;
    filterText=e.target.value;
    render();
    const input=document.querySelector('#colony-search');input?.focus();input?.setSelectionRange(pos,pos);
  }
});
content.addEventListener('change',e=>{
  if(e.target.id==='apiary-filter'){selectedApiary=e.target.value;render();}
});
document.querySelector('#close-dialog').addEventListener('click',()=>dialog.close());
document.querySelector('#cancel-dialog').addEventListener('click',()=>dialog.close());
form.addEventListener('submit',handleSubmit);
document.querySelector('#reset-demo').addEventListener('click',async()=>{
  if(!confirm('Reset every change and restore the fictional sample data?')) return;
  try{
    if(backend) state=await query('reset',{method:'POST'});
    else {localStorage.removeItem(STORE_KEY);state=await loadState();}
    selectedApiary='';selectedColony=null;filterText='';view='overview';render();notify('Synthetic sample data restored.');
  }catch(e){notify(e.message,true);}
});
window.addEventListener('storage',e=>{if(!backend && e.key===STORE_KEY) notify('Demo data changed in another tab. Refresh this page before saving.',true);});
(async()=>{
  try{state=await loadState();document.querySelector('#mode-label').textContent=backend?'LOCAL SQLITE API':'BROWSER-LOCAL DEMO';render();}
  catch(e){content.textContent=`Unable to load demo data: ${e.message}`;notify('Local demo startup failed.',true);}
})();
