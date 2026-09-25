// Month-specific income records for the frontend preview.
const IncomeStore=(()=>{
  const KEY='financial-freedom-income-v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return {}}};
  const write=data=>localStorage.setItem(KEY,JSON.stringify(data));
  const monthKey=date=>date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
  const TEMPLATES='financial-freedom-income-schedule-v1';
  const templates=()=>{try{return JSON.parse(localStorage.getItem(TEMPLATES)||'{}')||{}}catch{return {}}};
  const saveTemplates=value=>localStorage.setItem(TEMPLATES,JSON.stringify(value));
  function fourthWednesday(year,month){const first=new Date(year,month,1).getDay();return 1+(3-first+7)%7+21}
  function scheduled(date){
    const month=monthKey(date),y=date.getFullYear(),m=date.getMonth(),last=new Date(y,m+1,0).getDate(),t=templates();
    return [
      ['salary15',t.salary,'Salary',15],['salaryEnd',t.salary,'Salary',last],
      ['ssdi',t.ssdi,"Wife's SSDI",fourthWednesday(y,m)]
    ].filter(([,v])=>v&&v.amount!==null&&v.amount!==undefined).map(([name,v,source,day])=>({
      id:name==='salary15'?-1:name==='salaryEnd'?-2:-3,source,payDate:month+'-'+String(day).padStart(2,'0'),
      paycheck:Number(v[name+'Paycheck']||v.paycheck||1),expectedAmount:Number(v.amount),actualAmount:null,recurring:true
    }));
  }
  const entries=date=>{const month=monthKey(date),stored=read()[month]||[],hidden=read()['hidden:'+month]||[];return [...scheduled(date).filter(r=>!hidden.includes(r.id)&&!stored.some(s=>s.id===r.id)),...stored]};
  function save(date,record){
    const data=read(),month=monthKey(date),list=data[month]||[];
    const value={...record,id:record.id??Date.now()+Math.floor(Math.random()*100000)};
    const index=list.findIndex(row=>row.id===value.id);
    if(index<0)list.push(value);else list[index]=value;
    data[month]=list;write(data);return value.id;
  }
  function remove(date,id){const data=read(),month=monthKey(date);data[month]=(data[month]||[]).filter(row=>row.id!==id);if(id<0)(data['hidden:'+month]??=[]).push(id);write(data)}
  const totals=(date,paycheck)=>{
    const list=entries(date).filter(row=>row.paycheck===paycheck);
    return {count:list.length,expected:list.reduce((sum,row)=>sum+(row.expectedAmount||0),0),actual:list.reduce((sum,row)=>sum+(row.actualAmount||0),0),hasExpected:list.some(row=>row.expectedAmount!==null),hasActual:list.some(row=>row.actualAmount!==null)};
  };
  return {entries,save,remove,totals,monthKey,templates,saveTemplates,fourthWednesday};
})();
