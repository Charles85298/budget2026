// Monthly reserve contributions for quarterly bills. This is a browser-only preview ledger.
const FundStore=(()=>{
  const KEY='financial-freedom-quarterly-funds-v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return {}}};
  const write=data=>window.CloudSync.save(KEY,data);
  const monthNumber=value=>Number(value.slice(0,4))*12+Number(value.slice(5,7))-1;
  const monthDate=n=>new Date(Math.floor(n/12),n%12,1);
  const monthKey=date=>BillStore.key(date);
  function target(plan,date){
    if(plan.amount===null||plan.amount===undefined)return null;
    const cents=Math.round(Number(plan.amount)*100), regular=Math.round(cents/3);
    const phase=((monthNumber(monthKey(date))-monthNumber(plan.firstDueMonth))%3+3)%3;
    // The three contributions happen before the next due month.
    return (phase===2?cents-regular*2:regular)/100;
  }
  function entry(plan,date){
    const month=monthKey(date),saved=read()[plan.id+':'+month];
    return {id:plan.id,month,payee:plan.payee,paycheck:plan.fundingPaycheck,
      contribution:target(plan,date),funded:!!saved?.funded,
      fundedAmount:saved?.funded?Number(saved.amount):null,
      quarterlyAmount:plan.amount,openingFundBalance:plan.openingFundBalance};
  }
  function setContribution(id,date,amount,funded){
    const value=Number(amount);
    if(funded&&(!Number.isFinite(value)||value<0))throw Error('Enter a valid contribution amount.');
    const data=read();data[id+':'+monthKey(date)]={amount:Math.round(value*100)/100,funded:!!funded};write(data);
  }
  function balance(plan,date,{beforePayment=false}={}){
    const end=monthNumber(monthKey(date)),start=monthNumber(plan.fundStartMonth);
    let cents=Math.round(plan.openingFundBalance*100),unrecorded=0;
    const funded=read();
    const individual=PaymentStore.all().filter(p=>p.billId===plan.id);
    for(let number=start;number<=end;number++){
      const month=monthKey(monthDate(number)),record=funded[plan.id+':'+month];
      // A contribution in the bill's due month belongs to the following quarter.
      if(record?.funded&&!(beforePayment&&number===end))cents+=Math.round(Number(record.amount)*100);
      if(beforePayment&&number===end)continue;
      for(const payment of individual.filter(p=>p.date.slice(0,7)===month))cents-=Math.round(payment.amount*100);
      const paidBill=BillStore.billsFor(monthDate(number)).find(b=>b.id===plan.id&&b.paid&&b.payments.length===0);
      if(paidBill){
        if(paidBill.actualAmount===null)unrecorded++;
        else cents-=Math.round(paidBill.actualAmount*100);
      }
    }
    return {amount:cents/100,unrecorded};
  }
  function nextDue(plan,date){
    let number=monthNumber(monthKey(date)),anchor=monthNumber(plan.firstDueMonth);
    if(number<=anchor)return monthDate(anchor);
    const delta=number-anchor;
    return monthDate(anchor+(Math.ceil(delta/3)*3));
  }
  return {entry,setContribution,balance,nextDue,target};
})();
