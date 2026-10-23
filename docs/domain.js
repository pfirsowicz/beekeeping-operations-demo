/**
 * Deliberately independent portfolio domain. No connection to a live apiary or
 * the owner's production database and no imported production code.
 */
export class DomainError extends Error {
  constructor(message, code = 'INVALID_OPERATION') {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

export const QUEEN_EVIDENCE = Object.freeze({ seen: 'Queen seen', eggs: 'Eggs observed', 'not-seen': 'Not seen', unknown: 'Not assessed' });
export const STORES = Object.freeze({ low: 'Low', adequate: 'Adequate', high: 'High', unknown: 'Not assessed' });
export const TEMPERAMENT = Object.freeze({ calm: 'Calm', average: 'Average', defensive: 'Defensive', unknown: 'Not assessed' });

export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value && value >= '2000-01-01' && value <= '2100-12-31';
}
const fail = (message, code) => { throw new DomainError(message, code); };
const oneOf = (value, object, label) => Object.hasOwn(object, value) ? value : fail(`Choose a valid ${label}.`);
const date = (value, label = 'date') => validDate(value) ? value : fail(`Enter a valid ${label} (YYYY-MM-DD).`);
const text = (value, max = 500) => {
  if (typeof value !== 'string') fail('Text must be a string.');
  if (value.length > max) fail(`Text cannot exceed ${max} characters.`);
  return value.trim();
};
const idCheck = (id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{3,80}$/.test(id) ? id : fail('Invalid record identifier.');
const getColony = (state, id) => state.colonies.find((c) => c.id === idCheck(id)) ?? fail('Colony not found.', 'NOT_FOUND');
const latestMove = (state, colonyId) => state.events.filter((e) => e.colonyId === colonyId && e.type === 'move').sort((a,b)=>b.date.localeCompare(a.date))[0];
const latestOtherActivity = (state, colonyId) => [
  ...state.inspections.filter((i) => i.colonyId === colonyId).map((i) => i.date),
  ...state.events.filter((e) => e.colonyId === colonyId && e.type === 'move').map((e) => e.date)
].sort().at(-1);

export function validateInspection(state, payload, editingId = null) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('Inspection data is required.');
  const colony = getColony(state, payload.colonyId);
  if (colony.status !== 'active') fail('Cannot inspect an inactive colony.');
  const onDate = date(payload.date, 'inspection date');
  const moves = state.events.filter((e) => e.colonyId === colony.id && e.type === 'move').sort((a,b)=>a.date.localeCompare(b.date));
  if (editingId) {
    const original = state.inspections.find((i) => i.id === editingId);
    if (!original) fail('Inspection not found.', 'NOT_FOUND');
    const priorMove = moves.filter((m) => m.date <= original.date).at(-1);
    const subsequentMove = moves.find((m) => m.date > original.date);
    if ((priorMove && onDate < priorMove.date) || (subsequentMove && onDate > subsequentMove.date))
      fail('Inspection date cannot cross a recorded colony move.', 'CHRONOLOGY');
  } else {
    const moved = latestMove(state, colony.id);
    if (moved && onDate < moved.date) fail(`Inspection cannot predate this colony's last move (${moved.date}).`, 'CHRONOLOGY');
  }
  const frames = payload.broodFrames === '' || payload.broodFrames === null || payload.broodFrames === undefined ? null : Number(payload.broodFrames);
  if (frames !== null && (!Number.isInteger(frames) || frames < 0 || frames > 10)) fail('Brood frames must be 0–10, or unknown.');
  const followUpDate = payload.followUpDate ? date(payload.followUpDate, 'follow-up date') : null;
  if (followUpDate && followUpDate < onDate) fail('Follow-up cannot be before the inspection.', 'CHRONOLOGY');
  if (editingId && !state.inspections.some((i) => i.id === editingId && i.colonyId === colony.id)) fail('Inspection not found.', 'NOT_FOUND');
  return {
    colonyId: colony.id,
    date: onDate,
    queenEvidence: oneOf(payload.queenEvidence, QUEEN_EVIDENCE, 'queen observation'),
    broodFrames: frames,
    stores: oneOf(payload.stores, STORES, 'stores level'),
    temperament: oneOf(payload.temperament, TEMPERAMENT, 'temperament'),
    notes: text(payload.notes ?? '', 1000),
    followUpDate
  };
}

/** Immutable command application shared by the browser and local REST backend. */
export function applyCommand(state, command, operationId) {
  if (!state || state.schemaVersion !== 1) fail('Unsupported demo data version.');
  if (!command || typeof command !== 'object' || Array.isArray(command)) fail('Command is required.');
  idCheck(operationId);
  if (!['inspection.create', 'inspection.update', 'colony.move', 'followup.complete'].includes(command.type)) fail('Unsupported command.');
  const next = structuredClone(state);
  const time = new Date().toISOString();
  if (command.type === 'inspection.create') {
    const input = validateInspection(next, command.data);
    const id = `ins_${operationId}`;
    if (next.inspections.some((i) => i.id === id)) fail('Duplicate inspection.','CONFLICT');
    next.inspections.push({ id, ...input, createdAt: time, updatedAt: time });
    if (input.followUpDate) next.tasks.push({ id: `task_${id}`, inspectionId: id, colonyId: input.colonyId, dueDate: input.followUpDate, title: 'Review inspection findings', status: 'open' });
    next.events.push({ id: `evt_${operationId}`, colonyId: input.colonyId, type: 'inspection', date: input.date, summary: 'Inspection recorded', operationId, createdAt: time });
  } else if (command.type === 'inspection.update') {
    const id = idCheck(command.id);
    const existing = next.inspections.find((i) => i.id === id);
    if (!existing) fail('Inspection not found.', 'NOT_FOUND');
    const input = validateInspection(next, command.data, id);
    if (input.colonyId !== existing.colonyId) fail('An inspection cannot be moved to another colony.');
    const changed = Object.fromEntries(Object.keys(input).filter(k=>JSON.stringify(existing[k])!==JSON.stringify(input[k])).map(k=>[k,{before:existing[k],after:input[k]}]));
    Object.assign(existing, input, { updatedAt: time });
    const task = next.tasks.find((t) => t.inspectionId === id);
    if (input.followUpDate) {
      if (task) { task.dueDate = input.followUpDate; task.status = 'open'; }
      else next.tasks.push({ id: `task_${id}`, inspectionId: id, colonyId: input.colonyId, dueDate: input.followUpDate, title: 'Review inspection findings', status: 'open' });
    } else if (task) task.status = 'cancelled';
    next.events.push({ id: `evt_${operationId}`, colonyId: input.colonyId, type: 'inspection-edit', date: input.date, summary: 'Inspection updated', changes:changed, operationId, createdAt: time });
  } else if (command.type === 'followup.complete') {
    const task = next.tasks.find((t) => t.id === idCheck(command.id));
    if (!task) fail('Follow-up not found.', 'NOT_FOUND');
    if (task.status !== 'open') fail('Only an open follow-up can be completed.', 'CONFLICT');
    const onDate = date(command.date, 'completion date');
    const source = next.inspections.find((i) => i.id === task.inspectionId);
    if (!source || onDate < source.date) fail('Completion cannot predate its inspection.', 'CHRONOLOGY');
    task.status = 'done';
    next.events.push({ id:`evt_${operationId}`, colonyId:task.colonyId, type:'followup-done', date:onDate, summary:'Follow-up completed', operationId, createdAt:time });
  } else if (command.type === 'colony.move') {
    const input = command.data;
    if (!input || typeof input !== 'object') fail('Move data is required.');
    const colony = getColony(next, input.colonyId);
    if (colony.status !== 'active') fail('Cannot move an inactive colony.');
    const toApiaryId = idCheck(input.toApiaryId);
    if (!next.apiaries.some((a) => a.id === toApiaryId)) fail('Destination apiary not found.', 'NOT_FOUND');
    if (colony.apiaryId === toApiaryId) fail('Destination must differ from current apiary.');
    const onDate = date(input.date, 'move date');
    const latest = latestOtherActivity(next, colony.id);
    if (latest && onDate < latest) fail(`Move cannot predate later colony activity (${latest}).`, 'CHRONOLOGY');
    const fromApiaryId = colony.apiaryId;
    colony.apiaryId = toApiaryId;
    next.events.push({ id: `evt_${operationId}`, type: 'move', colonyId: colony.id, fromApiaryId, toApiaryId, date: onDate, summary: text(input.reason ?? '', 300) || 'Colony relocated', operationId, createdAt: time });
  }
  next.revision = state.revision + 1;
  return next;
}

export const findColony = (state, id) => state.colonies.find((c) => c.id === id);
export const findApiary = (state, id) => state.apiaries.find((a) => a.id === id);
export const colonyInspections = (state, id) => state.inspections.filter((i) => i.colonyId === id).sort((a,b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
export const colonyTimeline = (state, id) => [
  ...state.inspections.filter((i) => i.colonyId === id).map((i) => ({...i, type: 'inspection', summary: 'Inspection'})),
  ...state.events.filter((e) => e.colonyId === id && e.type === 'move')
].sort((a,b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
