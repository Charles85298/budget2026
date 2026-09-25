// Individual payments belong to a bill occurrence, identified by bill and due month.
const PaymentStore=(()=>{
  const KEY='financial-freedom-payment-ledger-v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return {}}};
  const write=data=>window.CloudSync.save(KEY,data);
  const key=(id,month)=>id+':'+month;
  const list=(id,month)=>read()[key(id,month)]||[];
  function add(id,month,amount,date){
    const cents=Math.round(Number(amount)*100);
    if(!Number.isFinite(cents)||cents<=0||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(new Date(date+'T12:00:00').getTime()))throw Error('Enter a positive payment and valid date.');
    const data=read(),entry={id:Date.now()+Math.floor(Math.random()*100000),amount:cents/100,date};
    (data[key(id,month)]??=[]).push(entry);write(data);return entry;
  }
  function remove(id,month,paymentId){const data=read(),slot=key(id,month);data[slot]=(data[slot]||[]).filter(p=>p.id!==paymentId);write(data)}
  function all(){return Object.entries(read()).flatMap(([slot,payments])=>payments.map(p=>({...p,billId:Number(slot.split(':')[0]),dueMonth:slot.split(':')[1]})))}
  return {list,add,remove,all};
})();
