import { DatabaseSync } from 'node:sqlite';
import { makeSeed } from '../docs/seed.js';
import { applyCommand, DomainError } from '../docs/domain.js';

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS apiaries (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, region TEXT NOT NULL, description TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS colonies (
 id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE,
 apiary_id TEXT NOT NULL REFERENCES apiaries(id), status TEXT NOT NULL CHECK(status IN ('active','inactive')),
 hive_type TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS inspections (
 id TEXT PRIMARY KEY, colony_id TEXT NOT NULL REFERENCES colonies(id), date TEXT NOT NULL,
 queen_evidence TEXT NOT NULL, brood_frames INTEGER CHECK(brood_frames BETWEEN 0 AND 10),
 stores TEXT NOT NULL, temperament TEXT NOT NULL, notes TEXT NOT NULL,
 follow_up_date TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inspections_colony_date ON inspections(colony_id, date DESC);
CREATE TABLE IF NOT EXISTS events (
 id TEXT PRIMARY KEY, colony_id TEXT NOT NULL REFERENCES colonies(id),
 type TEXT NOT NULL CHECK(type IN ('move','inspection','inspection-edit','followup-done')),
 date TEXT NOT NULL, summary TEXT NOT NULL, operation_id TEXT NOT NULL UNIQUE,
 from_apiary_id TEXT REFERENCES apiaries(id), to_apiary_id TEXT REFERENCES apiaries(id), created_at TEXT NOT NULL, changes_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_colony_date ON events(colony_id, date DESC);
CREATE TABLE IF NOT EXISTS tasks (
 id TEXT PRIMARY KEY, colony_id TEXT NOT NULL REFERENCES colonies(id),
 inspection_id TEXT NOT NULL UNIQUE REFERENCES inspections(id),
 due_date TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('open','cancelled','done'))
);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS operations (
 id TEXT PRIMARY KEY, payload TEXT NOT NULL, resulting_revision INTEGER NOT NULL
);
`;

export class SQLiteStore {
  constructor(filename = ':memory:') {
    this.db = new DatabaseSync(filename);
    this.db.exec(SCHEMA);
    if (!this.db.prepare("SELECT 1 FROM meta WHERE key='revision'").get()) this.reset();
  }
  close() { this.db.close(); }
  reset(today) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const t of ['operations','tasks','events','inspections','colonies','apiaries','meta']) this.db.exec(`DELETE FROM ${t}`);
      this.#writeSeed(makeSeed(today));
      this.db.exec('COMMIT');
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
    return this.read();
  }
  #writeSeed(state) {
    const d = this.db;
    const apiary = d.prepare('INSERT INTO apiaries VALUES(?,?,?,?)');
    for (const a of state.apiaries) apiary.run(a.id,a.name,a.region,a.description);
    const colony = d.prepare('INSERT INTO colonies VALUES(?,?,?,?,?)');
    for (const c of state.colonies) colony.run(c.id,c.code,c.apiaryId,c.status,c.hiveType);
    const inspection = d.prepare('INSERT INTO inspections VALUES(?,?,?,?,?,?,?,?,?,?,?)');
    for (const i of state.inspections) inspection.run(i.id,i.colonyId,i.date,i.queenEvidence,i.broodFrames,i.stores,i.temperament,i.notes,i.followUpDate,i.createdAt,i.updatedAt);
    const event = d.prepare('INSERT INTO events VALUES(?,?,?,?,?,?,?,?,?,?)');
    for (const e of state.events) event.run(e.id,e.colonyId,e.type,e.date,e.summary,e.operationId,e.fromApiaryId??null,e.toApiaryId??null,e.createdAt,e.changes?JSON.stringify(e.changes):null);
    const task = d.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?)');
    for (const t of state.tasks) task.run(t.id,t.colonyId,t.inspectionId,t.dueDate,t.title,t.status);
    d.prepare("INSERT INTO meta(key,value) VALUES('revision','0')").run();
  }
  read() {
    const d = this.db;
    return {
      schemaVersion:1,
      revision:Number(d.prepare("SELECT value FROM meta WHERE key='revision'").get().value),
      apiaries:d.prepare('SELECT id,name,region,description FROM apiaries ORDER BY name').all(),
      colonies:d.prepare('SELECT id,code,apiary_id AS apiaryId,status,hive_type AS hiveType FROM colonies ORDER BY code').all(),
      inspections:d.prepare('SELECT id,colony_id AS colonyId,date,queen_evidence AS queenEvidence,brood_frames AS broodFrames,stores,temperament,notes,follow_up_date AS followUpDate,created_at AS createdAt,updated_at AS updatedAt FROM inspections').all(),
      events:d.prepare('SELECT id,colony_id AS colonyId,type,date,summary,operation_id AS operationId,from_apiary_id AS fromApiaryId,to_apiary_id AS toApiaryId,created_at AS createdAt,changes_json AS changesJson FROM events').all().map(({changesJson,...e})=>({...e,...(changesJson?{changes:JSON.parse(changesJson)}:{})})),
      tasks:d.prepare('SELECT id,colony_id AS colonyId,inspection_id AS inspectionId,due_date AS dueDate,title,status FROM tasks').all()
    };
  }
  execute(command, {expectedRevision, operationId}) {
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new DomainError('Expected revision must be a non-negative integer.');
    if (typeof operationId !== 'string' || !/^[a-zA-Z0-9_-]{3,80}$/.test(operationId)) throw new DomainError('Invalid operation ID.');
    const payload = JSON.stringify(command);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const recorded = this.db.prepare('SELECT payload FROM operations WHERE id=?').get(operationId);
      if (recorded) {
        if (recorded.payload !== payload) throw new DomainError('Operation ID was already used for a different command.', 'CONFLICT');
        this.db.exec('COMMIT');
        return {state:this.read(), replayed:true};
      }
      const before = this.read();
      if (before.revision !== expectedRevision) throw new DomainError('State changed in another session. Refresh and retry.', 'REVISION_CONFLICT');
      const after = applyCommand(before, command, operationId);
      this.#saveDiff(before,after);
      this.db.prepare("UPDATE meta SET value=? WHERE key='revision'").run(String(after.revision));
      this.db.prepare('INSERT INTO operations VALUES(?,?,?)').run(operationId,payload,after.revision);
      this.db.exec('COMMIT');
      return {state:this.read(), replayed:false};
    } catch(e) { this.db.exec('ROLLBACK'); throw e; }
  }
  #saveDiff(before,after) {
    const d = this.db;
    const oldInspections = new Map(before.inspections.map(i=>[i.id,i]));
    const insertInspection = d.prepare('INSERT INTO inspections VALUES(?,?,?,?,?,?,?,?,?,?,?)');
    const updateInspection = d.prepare('UPDATE inspections SET date=?,queen_evidence=?,brood_frames=?,stores=?,temperament=?,notes=?,follow_up_date=?,updated_at=? WHERE id=?');
    for (const i of after.inspections) {
      if (!oldInspections.has(i.id)) insertInspection.run(i.id,i.colonyId,i.date,i.queenEvidence,i.broodFrames,i.stores,i.temperament,i.notes,i.followUpDate,i.createdAt,i.updatedAt);
      else if (JSON.stringify(oldInspections.get(i.id)) !== JSON.stringify(i)) updateInspection.run(i.date,i.queenEvidence,i.broodFrames,i.stores,i.temperament,i.notes,i.followUpDate,i.updatedAt,i.id);
    }
    const existingEvents = new Set(before.events.map(e=>e.id));
    const insertEvent = d.prepare('INSERT INTO events VALUES(?,?,?,?,?,?,?,?,?,?)');
    for (const e of after.events.filter(e=>!existingEvents.has(e.id))) insertEvent.run(e.id,e.colonyId,e.type,e.date,e.summary,e.operationId,e.fromApiaryId??null,e.toApiaryId??null,e.createdAt,e.changes?JSON.stringify(e.changes):null);
    const oldTasks = new Map(before.tasks.map(t=>[t.id,t]));
    const insertTask = d.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?)');
    const updateTask = d.prepare('UPDATE tasks SET due_date=?, status=? WHERE id=?');
    for (const t of after.tasks) {
      if (!oldTasks.has(t.id)) insertTask.run(t.id,t.colonyId,t.inspectionId,t.dueDate,t.title,t.status);
      else if (JSON.stringify(oldTasks.get(t.id))!==JSON.stringify(t)) updateTask.run(t.dueDate,t.status,t.id);
    }
    const priorLocations = new Map(before.colonies.map(c=>[c.id,c.apiaryId]));
    const changeApiary = d.prepare('UPDATE colonies SET apiary_id=? WHERE id=?');
    for (const c of after.colonies) if (priorLocations.get(c.id)!==c.apiaryId) changeApiary.run(c.apiaryId,c.id);
  }
}
