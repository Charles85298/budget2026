const money=n=>n===null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const params=new URLSearchParams(location.search);
const pageView=document.body.dataset.pageView||'all';
const requestedMonth=params.get('month');
const date=/^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth||'')
  ? new Date(Number(requestedMonth.slice(0,4)),Number(requestedMonth.slice(5))-1,1)
  : new Date(2026,9,1);
const $=id=>document.getElementById(id);
let selectedId=null;
function storageKey(){return 'paywise-demo-payments-v1-'+date.getFullYear()+'-'+(date.getMonth()+1)}
function currentRows(){
  return BillStore.billsFor(date);
}
function updateBill(id,fields){
  let saved={};
  try{saved=JSON.parse(localStorage.getItem(storageKey())||'{}')||{}}catch{}
  const current=currentRows().find(r=>r.id===id);
  saved[id]={...(saved[id]||{}),...fields};
  if(fields.paid===true&&current)saved[id].snapshot={...current,...fields};
  window.CloudSync.save(storageKey(),saved);
  render();
  if($('bill-dialog').open)openDetails(id);
}
function save(id,field,value){updateBill(id,{[field]:value})}
function resetMonthlyOverride(id){
  let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey())||'{}')||{}}catch{}
  if(!saved[id])return;
  for(const field of ['amount','due','paycheck','manualOverride'])delete saved[id][field];
  if(!Object.keys(saved[id]).length)delete saved[id];
  window.CloudSync.save(storageKey(),saved);render();openDetails(id);
}
function localToday(){
  const today=new Date();
  return today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
}
function status(r){return r.paid?'paid':r.payments.length?'partial':r.funded?'funded':'unfunded'}
function paymentGroup(method){
  const normalized=method.toLowerCase();
  if(normalized.includes('auto'))return 'auto';
  if(normalized.includes('manual')||normalized.includes('savings'))return 'manual';
  return 'other';
}
function scopedRows(){return currentRows().filter(r=>pageView==='all'||pageView==='planned'||paymentGroup(r.method)===pageView)}
function filteredRows(){return scopedRows().filter(r=>
    r.payee.toLowerCase().includes($('search').value.trim().toLowerCase()) &&
    ($('paycheck-filter').value==='all'||r.paycheck===Number($('paycheck-filter').value)) &&
    ($('status-filter').value==='all'||status(r)===$('status-filter').value) &&
    (pageView!=='all'||$('method-filter').value==='all'||paymentGroup(r.method)===$('method-filter').value) &&
    (pageView==='planned'||(!r.paid||pageView==='all'&&!$('unpaid-only').checked))
  ).sort((a,b)=>a.paycheck-b.paycheck||a.due-b.due||a.id-b.id)}
function render(){
  const scope=scopedRows(),shown=filteredRows();
  $('month-label').textContent=date.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const monthParam='?month='+date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
  document.querySelectorAll('.nav-group a').forEach(a=>{a.href=a.href.split('?')[0]+monthParam});
  $('preview-message').textContent=date.getFullYear()===2026&&date.getMonth()===9
    ? 'October 2026 includes your migrated statuses. Changes are saved to Supabase.'
    : 'Blank frequencies are treated as monthly in this preview. Quarterly and yearly schedules need their start months.';
  for(const [key,predicate] of [['due',r=>!r.paid],['funded',r=>r.funded&&!r.paid],['paid',r=>r.paid]]){
    const group=scope.filter(predicate);
    const value=r=>key==='paid'?r.actualAmount:r.remainingAmount;
    const missing=group.filter(r=>value(r)===null).length;
    $(''+key+'-total').textContent=money(group.reduce((sum,r)=>sum+(value(r)||0),0));
    $(''+key+'-count').textContent=group.length+' bill'+(group.length===1?'':'s')+(missing?' · '+missing+' amount'+(missing===1?'':'s')+' not recorded':'');
  }
  $('visible-count').textContent=shown.length+' of '+scope.length+' bills';
  $('payment-rows').innerHTML=shown.map(r=>`<tr>
    <td><button class="payee-button" data-detail="${r.id}">${escapeHtml(r.payee)}</button></td>
    <td>${r.due}</td><td><span class="pill">#${r.paycheck}</span></td>
    <td>${escapeHtml(r.category||'—')}</td><td>${escapeHtml(r.method||'—')}</td>
    <td class="right amount">${money(r.plannedAmount)}</td>
    <td class="right amount">${money(r.amount)}</td>
    <td class="right amount">${r.actualAmount!==null?money(r.actualAmount):'—'}</td>
    <td>${r.paidDate?escapeHtml(r.paidDate):'—'}</td>
    <td><label class="check-label"><input type="checkbox" data-id="${r.id}" data-field="funded" ${r.funded?'checked':''}><span class="sr-only">Funded: ${escapeHtml(r.payee)}, paycheck ${r.paycheck}</span></label></td>
    <td><label class="check-label"><input type="checkbox" data-id="${r.id}" data-field="paid" ${r.paid?'checked':''}><span class="sr-only">Paid: ${escapeHtml(r.payee)}, paycheck ${r.paycheck}</span></label></td>
  </tr>`).join('');
  $('empty-state').hidden=shown.length>0;
}
function detail(label,value){return `<div class="detail"><span>${label}</span><strong>${escapeHtml(value===''||value===null?'—':value)}</strong></div>`}
function openDetails(id){
  const r=currentRows().find(item=>item.id===id);if(!r)return;
  selectedId=id;$('dialog-title').textContent=r.payee;
  const phone=/^[+*\d() -]+$/.test(r.phone)&&r.phone?'<a href="tel:'+encodeURIComponent(r.phone.replace(/[^+*\d]/g,''))+'">'+escapeHtml(r.phone)+'</a>':escapeHtml(r.phone||'—');
  const plan=r.frequency==='quarterly'?BillStore.quarterlyPlans(date).find(p=>p.id===r.id):null;
  const fund=plan?FundStore.balance(plan,date,{beforePayment:true}):null;
  $('detail-grid').innerHTML=[
    detail('Planned amount',money(r.plannedAmount)),detail('Amount to pay',money(r.amount)),
    detail('Monthly override',r.manualOverride?'Yes — manual values take precedence':'No'),
    detail('Total paid',r.actualAmount===null?'—':money(r.actualAmount)),detail('Remaining to pay',money(r.remainingAmount)),
    detail('Payment date',r.paid?r.paidDate:''),
    detail('Due day',String(r.due)),
    detail('Paycheck',String(r.paycheck)),detail('Category',r.category),
    detail('Payment method',r.method),detail('Frequency',r.frequency),
    `<div class="detail"><span>Phone</span><strong>${phone}</strong></div>`,
    detail('Website',r.website),detail('Interest rate',r.interestRate),
    detail('Payoff',r.payoff),detail('Minimum payment',r.minimumPayment),
    detail('Month',r.month||date.toLocaleDateString('en-US',{month:'long'})),
    detail('Year',r.year||String(date.getFullYear())),
    detail('Funded',r.funded?'Yes':'No'),detail('Paid',r.paid?'Yes':'No'),
    ...(fund?[detail('Available in quarterly fund',money(fund.amount)),
      `<div class="detail"><span>Quarterly funding</span><strong><a href="quarterly-funds.html?month=${BillStore.key(date)}">View monthly contributions →</a></strong></div>`]:[])
  ].join('');
  $('payment-history').innerHTML='<h3>Payments</h3>'+(r.payments.length?r.payments.map(p=>`<div class="detail"><span>${escapeHtml(p.date)}</span><strong>${money(p.amount)} <button type="button" data-remove-payment="${p.id}" aria-label="Remove payment">Remove</button></strong></div>`).join(''):'<p class="muted">No individual payments recorded.</p>');
  $('detail-funded').textContent=r.funded?'Mark not funded':'Mark funded';
  $('detail-paid').textContent=r.paid?'Mark unpaid':'Mark paid';
  $('override-amount').value=r.amount===null?'':r.amount.toFixed(2);
  $('override-due').value=r.due;
  $('override-paycheck').value=String(r.paycheck);
  $('override-badge').hidden=!r.manualOverride;
  $('reset-override').hidden=!r.manualOverride;
  $('actual-paid').value=r.remainingAmount===null?'':r.remainingAmount.toFixed(2);
  $('payment-date').value=localToday();
  if(!$('bill-dialog').open)$('bill-dialog').showModal();
}
$('payment-form').addEventListener('submit',event=>{
  event.preventDefault();
  const input=$('actual-paid'),paymentDate=$('payment-date');
  if(!input.reportValidity()||!paymentDate.reportValidity()||selectedId===null)return;
  const actualAmount=Number(input.value);
  if(!Number.isFinite(actualAmount)||actualAmount<=0)return;
  PaymentStore.add(selectedId,BillStore.key(date),actualAmount,paymentDate.value);render();openDetails(selectedId);
});
$('export-bills').onclick=()=>CsvExport.download('financial-freedom-'+(pageView==='all'?'pay-bills':pageView==='planned'?'planned-bills':pageView+'-payments')+'-'+BillStore.key(date)+'.csv',
  ['Month','Payee','Due day','Paycheck','Category','Payment method','Frequency','Planned amount','Amount to pay','Actual amount paid','Remaining amount','Payment count','Payment date','Funded','Paid','Phone','Website','Interest rate','Payoff balance','Minimum payment'],
  filteredRows().map(r=>[BillStore.key(date),r.payee,r.due,r.paycheck,r.category,r.method,r.frequency,r.plannedAmount,r.amount,r.actualAmount,r.remainingAmount,r.payments.length,r.paidDate,r.funded?'Yes':'No',r.paid?'Yes':'No',r.phone,r.website,r.interestRate,r.payoff,r.minimumPayment]));
$('override-form').addEventListener('submit',event=>{
  event.preventDefault();
  if(selectedId===null)return;
  const amountInput=$('override-amount'),dueInput=$('override-due'),paycheckInput=$('override-paycheck');
  if(!amountInput.reportValidity()||!dueInput.reportValidity()||!paycheckInput.reportValidity())return;
  const amount=Number(amountInput.value),due=Number(dueInput.value),paycheck=Number(paycheckInput.value);
  if(!Number.isFinite(amount)||amount<0||!Number.isInteger(due)||due<1||due>31||![1,2,3].includes(paycheck))return;
  updateBill(selectedId,{amount:Math.round(amount*100)/100,due,paycheck,manualOverride:true});
});
$('reset-override').addEventListener('click',()=>{if(selectedId!==null)resetMonthlyOverride(selectedId)});
$('payment-rows').addEventListener('click',e=>{const button=e.target.closest('[data-detail]');if(button)openDetails(Number(button.dataset.detail))});
$('payment-rows').addEventListener('change',e=>{
  const input=e.target.closest('input[data-field]');if(!input)return;
  const id=Number(input.dataset.id);
  if(input.dataset.field==='paid'){
    if(input.checked){render();openDetails(id);$('actual-paid').focus()}
    else if(currentRows().find(r=>r.id===id)?.payments.length){render();openDetails(id)}
    else updateBill(id,{paid:false,actualAmount:null,paidDate:''});
  }else save(id,'funded',input.checked);
});
for(const id of ['search','paycheck-filter','status-filter','method-filter','unpaid-only'])$(id).addEventListener(id==='search'?'input':'change',render);
$('method-filter').value=['manual','auto'].includes(params.get('view'))?params.get('view'):'all';
$('unpaid-only').checked=['manual','auto'].includes(params.get('view'));
$('prev-month').onclick=()=>{date.setMonth(date.getMonth()-1);render()};
$('next-month').onclick=()=>{date.setMonth(date.getMonth()+1);render()};
$('close-dialog').onclick=()=>$('bill-dialog').close();
$('bill-dialog').addEventListener('click',e=>{if(e.target===$('bill-dialog'))$('bill-dialog').close()});
$('payment-history').addEventListener('click',e=>{const button=e.target.closest('[data-remove-payment]');if(!button||selectedId===null)return;PaymentStore.remove(selectedId,BillStore.key(date),Number(button.dataset.removePayment));render();openDetails(selectedId)});
$('detail-funded').onclick=()=>{const r=currentRows().find(x=>x.id===selectedId);if(r)save(r.id,'funded',!r.funded)};
$('detail-paid').onclick=()=>{
  const r=currentRows().find(x=>x.id===selectedId);
  if(!r)return;
  if(r.paid&&r.payments.length){$('payment-history').scrollIntoView({block:'nearest'});return}
  if(r.paid)updateBill(r.id,{paid:false,actualAmount:null,paidDate:''});
  else $('payment-form').requestSubmit();
};
render();
