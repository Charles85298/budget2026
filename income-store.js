// Month-specific income records for the frontend preview.
const IncomeStore=(()=>{
  const KEY='financial-freedom-income-v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return {}}};
  const write=data=>localStorage.setItem(KEY,JSON.stringify(data));
  const monthKey=date=>date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
  const entries=date=>read()[monthKey(date)]||[];
  function save(date,record){
    const data=read(),month=monthKey(date),list=data[month]||[];
    const value={...record,id:record.id??Date.now()+Math.floor(Math.random()*100000)};
    const index=list.findIndex(row=>row.id===value.id);
    if(index<0)list.push(value);else list[index]=value;
    data[month]=list;write(data);return value.id;
  }
  function remove(date,id){const data=read(),month=monthKey(date);data[month]=(data[month]||[]).filter(row=>row.id!==id);write(data)}
  const totals=(date,paycheck)=>{
    const list=entries(date).filter(row=>row.paycheck===paycheck);
    return {count:list.length,expected:list.reduce((sum,row)=>sum+(row.expectedAmount||0),0),actual:list.reduce((sum,row)=>sum+(row.actualAmount||0),0),hasExpected:list.some(row=>row.expectedAmount!==null),hasActual:list.some(row=>row.actualAmount!==null)};
  };
  return {entries,save,remove,totals,monthKey};
})();
