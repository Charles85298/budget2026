// Frontend data adapter. Supabase can replace this localStorage implementation later.
const BillStore=(()=>{
  const KEY='paywise-demo-bill-management-v1';
  const read=()=>{try{const data=JSON.parse(localStorage.getItem(KEY)||'{}');return {added:data.added||[],changes:data.changes||[],removed:data.removed||[]}}catch{return {added:[],changes:[],removed:[]}}};
  const write=data=>window.CloudSync.save(KEY,data);
  const key=date=>date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
  const statuses=date=>{try{return JSON.parse(localStorage.getItem('paywise-demo-payments-v1-'+date.getFullYear()+'-'+(date.getMonth()+1))||'{}')||{}}catch{return {}}};
  const monthNumber=value=>Number(value.slice(0,4))*12+Number(value.slice(5,7))-1;
  const occurs=(bill,month,anchor)=>{
    const difference=monthNumber(month)-monthNumber(anchor);
    if(difference<0)return false;
    if(bill.frequency==='quarterly')return difference%3===0;
    if(bill.frequency==='yearly')return difference%12===0;
    if(bill.frequency==='one-time')return difference===0;
    return true; // Blank sample frequencies are treated as monthly.
  };
  function billsFor(date){
    const month=key(date), sample=month==='2026-10', model=read(), saved=statuses(date);
    const base=rows.filter(b=>sample||(month>='2026-10'&&(
      b.frequency==='monthly'||!b.frequency||
      (b.frequency==='quarterly'&&occurs(b,month,b.firstDueMonth||'2026-10'))||
      model.changes.some(c=>c.id===b.id&&c.from<=month)
    )));
    const custom=model.added.filter(b=>month>=b.startMonth&&(
      occurs(b,month,b.firstDueMonth||b.startMonth)||model.changes.some(c=>c.id===b.id&&c.from<=month)
    ));
    const lastDay=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
    const withPayments=bill=>{
      const payments=PaymentStore.list(bill.id,month);
      const recorded=Math.round(payments.reduce((sum,p)=>sum+Math.round(p.amount*100),0))/100;
      const legacy=payments.length===0&&bill.paid&&bill.actualAmount!==null?bill.actualAmount:0;
      const actualAmount=payments.length?recorded:bill.actualAmount;
      return {...bill,due:bill.manualOverride?Math.min(Math.max(1,Number(bill.due)||1),lastDay):(bill.dueRule==='end_of_month'?lastDay:Math.min(Number(bill.due),lastDay)),payments,actualAmount,remainingAmount:bill.amount===null?null:Math.max(0,Math.round((bill.amount-recorded-legacy)*100)/100),paid:payments.length?bill.amount!==null&&recorded>=bill.amount:bill.paid,paidDate:payments.length?payments.at(-1).date:bill.paidDate};
    };
    return [...base,...custom].flatMap(original=>{
      const paid=(saved[original.id]?.paid ?? (sample?original.paid:false));
      if(paid)return [withPayments({
        ...original,plannedAmount:original.amount,actualAmount:null,paidDate:'',
        ...(saved[original.id]?.snapshot||{}),...(saved[original.id]||{})
      })];
      const changes=model.changes.filter(c=>c.id===original.id&&c.from<=month).sort((a,b)=>a.from.localeCompare(b.from));
      const latest=changes.at(-1);
      const bill=latest?{...original,...latest.fields}:original;
      if(latest&&!occurs(bill,month,bill.firstDueMonth||latest.from))return [];
      const removal=model.removed.find(r=>r.id===original.id&&r.from<=month);
      if(removal)return [];
      return [withPayments({
        ...bill,plannedAmount:bill.amount,actualAmount:null,paidDate:'',
        funded:sample?original.funded:false,paid:sample?original.paid:false,
        ...(saved[original.id]||{})
      })];
    });
  }
  function quarterlyPlans(date){
    const month=key(date),model=read();
    return [...rows,...model.added].flatMap(original=>{
      const start=original.fundStartMonth||original.startMonth||'2026-10';
      if(month<start)return [];
      const latest=model.changes.filter(c=>c.id===original.id&&c.from<=month).sort((a,b)=>a.from.localeCompare(b.from)).at(-1);
      const bill=latest?{...original,...latest.fields}:original;
      if(bill.frequency!=='quarterly'||model.removed.some(r=>r.id===bill.id&&r.from<=month))return [];
      return [{...bill,fundStartMonth:start,firstDueMonth:bill.firstDueMonth||'2026-10',fundingPaycheck:bill.fundingPaycheck||bill.paycheck,openingFundBalance:Number(bill.openingFundBalance)||0}];
    });
  }
  function add(fields,from){const model=read();const id=Date.now()+Math.floor(Math.random()*100000);model.added.push({id,...fields,startMonth:from,funded:false,paid:false,month:'',year:''});write(model);return id}
  function change(id,fields,from){const model=read();model.changes=model.changes.filter(c=>!(c.id===id&&c.from===from));model.changes.push({id,from,fields});write(model)}
  function removeFuture(id,from){const model=read();model.removed=model.removed.filter(r=>r.id!==id);model.removed.push({id,from});write(model)}
  return {billsFor,quarterlyPlans,add,change,removeFuture,key};
})();
