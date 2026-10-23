/** Synthetic seed records for the public demo; not operational apiary data. */
const isoDaysAgo = (now, days) => {
  const d = new Date(`${now}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

export function makeSeed(today = new Date().toISOString().slice(0,10)) {
  const ago = n => isoDaysAgo(today, n);
  const apiaries = [
    {id:'api_fern', name:'Fern Ridge', region:'Canterbury · Fictional site', description:'Sheltered mixed pasture'},
    {id:'api_orchard', name:'Coastal Orchard', region:'Canterbury · Fictional site', description:'Spring flowering and orchard forage'},
    {id:'api_hill', name:'Stonefield', region:'Canterbury · Fictional site', description:'Open hillside site'}
  ];
  const colonies = [
    {id:'col_101', code:'COL-101', apiaryId:'api_fern', status:'active', hiveType:'10-frame FD'},
    {id:'col_102', code:'COL-102', apiaryId:'api_fern', status:'active', hiveType:'10-frame FD'},
    {id:'col_103', code:'COL-103', apiaryId:'api_fern', status:'active', hiveType:'Nucleus'},
    {id:'col_201', code:'COL-201', apiaryId:'api_orchard', status:'active', hiveType:'10-frame FD'},
    {id:'col_202', code:'COL-202', apiaryId:'api_orchard', status:'active', hiveType:'10-frame FD'},
    {id:'col_301', code:'COL-301', apiaryId:'api_hill', status:'active', hiveType:'10-frame FD'}
  ];
  const inspections = [
    ['col_101',3,'seen',7,'adequate','calm','Strong brood pattern. Plenty of laying space.',null],
    ['col_101',18,'eggs',6,'adequate','calm','Building steadily after winter.',null],
    ['col_102',7,'eggs',5,'low','average','Stores reduced; revisit soon.',2],
    ['col_103',5,'not-seen',2,'adequate','calm','Young colony. Review queen evidence.',4],
    ['col_201',2,'seen',8,'high','calm','Very active colony with good stores.',null],
    ['col_201',17,'seen',6,'adequate','calm','Healthy growth.',null],
    ['col_202',10,'eggs',4,'adequate','average','Added drawn comb.',null],
    ['col_301',4,'seen',6,'adequate','calm','Consistent activity and brood.',null],
    ['col_301',22,'unknown',null,'unknown','unknown','Opening postponed because of weather.',null]
  ].map(([colonyId, days, queenEvidence, broodFrames, stores, temperament, notes, follow],index) => ({
    id:`ins_seed_${index+1}`, colonyId, date:ago(days), queenEvidence, broodFrames, stores, temperament,
    notes, followUpDate:follow===null?null:ago(-follow), createdAt:`${ago(days)}T07:30:00.000Z`, updatedAt:`${ago(days)}T07:30:00.000Z`
  }));
  const tasks = inspections.filter(i=>i.followUpDate).map(i=>({id:`task_${i.id}`, inspectionId:i.id, colonyId:i.colonyId, dueDate:i.followUpDate, title:'Review inspection findings',status:'open'}));
  // Pre-existing historical move; COL-202 has no inspection before the move in this fixture.
  const events = [{id:'evt_seed_move', colonyId:'col_202', type:'move', date:ago(25), fromApiaryId:'api_hill', toApiaryId:'api_orchard', summary:'Synthetic seasonal relocation', operationId:'seed_move', createdAt:`${ago(25)}T09:00:00.000Z`}];
  return {schemaVersion:1, revision:0, apiaries, colonies, inspections, events, tasks};
}
