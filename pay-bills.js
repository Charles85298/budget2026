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
function save(id,field,value){
  let saved={};
  try{saved=JSON.parse(localStorage.getItem(storageKey())||'{}')||{}}catch{}
  const current=currentRows().find(r=>r.id===id);
  saved[id]={...(saved[id]||{}),[field]:value};
  if(field==='paid'&&value&&current)saved[id].snapshot={...current,paid:true};
  localStorage.setItem(storageKey(),JSON.stringify(saved));
  render();
  if($('bill-dialog').open)openDetails(id);
}
function status(r){return r.paid?'paid':r.funded?'funded':'unfunded'}
function paymentGroup(method){
  const normalized=method.toLowerCase();
  if(normalized.includes('auto'))return 'auto';
  if(normalized.includes('manual')||normalized.includes('savings'))return 'manual';
  return 'other';
}
function render(){
  const list=currentRows(), scope=list.filter(r=>pageView==='all'||pageView==='planned'||paymentGroup(r.method)===pageView);
  const shown=scope.filter(r=>
    r.payee.toLowerCase().includes($('search').value.trim().toLowerCase()) &&
    ($('paycheck-filter').value==='all'||r.paycheck===Number($('paycheck-filter').value)) &&
    ($('status-filter').value==='all'||status(r)===$('status-filter').value) &&
    (pageView!=='all'||$('method-filter').value==='all'||paymentGroup(r.method)===$('method-filter').value) &&
    (pageView==='planned'||(!r.paid||pageView==='all'&&!$('unpaid-only').checked))
  ).sort((a,b)=>a.paycheck-b.paycheck||a.due-b.due||a.id-b.id);
  $('month-label').textContent=date.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const monthParam='?month='+date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
  document.querySelectorAll('.nav-group a').forEach(a=>{a.href=a.href.split('?')[0]+monthParam});
  $('preview-message').textContent=date.getFullYear()===2026&&date.getMonth()===9
    ? 'October 2026 includes the statuses you provided. Changes are saved only in this browser.'
    : 'Blank frequencies are treated as monthly in this preview. Quarterly and yearly schedules need their start months.';
  for(const [key,predicate] of [['due',r=>!r.paid],['funded',r=>r.funded&&!r.paid],['paid',r=>r.paid]]){
    const group=scope.filter(predicate);
    $(''+key+'-total').textContent=money(group.reduce((sum,r)=>sum+(r.amount||0),0));
    $(''+key+'-count').textContent=group.length+' bill'+(group.length===1?'':'s')+(group.some(r=>r.amount===null)?' · excludes blank amounts':'');
  }
  $('visible-count').textContent=shown.length+' of '+scope.length+' bills';
  $('payment-rows').innerHTML=shown.map(r=>`<tr>
    <td><button class="payee-button" data-detail="${r.id}">${escapeHtml(r.payee)}</button></td>
    <td>${r.due}</td><td><span class="pill">#${r.paycheck}</span></td>
    <td>${escapeHtml(r.category||'—')}</td><td>${escapeHtml(r.method||'—')}</td>
    <td class="right amount">${money(r.amount)}</td>
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
  $('detail-grid').innerHTML=[
    detail('Amount',money(r.amount)),detail('Due day',String(r.due)),
    detail('Paycheck',String(r.paycheck)),detail('Category',r.category),
    detail('Payment method',r.method),detail('Frequency',r.frequency),
    `<div class="detail"><span>Phone</span><strong>${phone}</strong></div>`,
    detail('Website',r.website),detail('Interest rate',r.interestRate),
    detail('Payoff',r.payoff),detail('Minimum payment',r.minimumPayment),
    detail('Month',r.month||date.toLocaleDateString('en-US',{month:'long'})),
    detail('Year',r.year||String(date.getFullYear())),
    detail('Funded',r.funded?'Yes':'No'),detail('Paid',r.paid?'Yes':'No')
  ].join('');
  $('detail-funded').textContent=r.funded?'Mark not funded':'Mark funded';
  $('detail-paid').textContent=r.paid?'Mark unpaid':'Mark paid';
  $('amount-to-pay').value=r.amount===null?'':r.amount.toFixed(2);
  if(!$('bill-dialog').open)$('bill-dialog').showModal();
}
$('amount-form').addEventListener('submit',event=>{
  event.preventDefault();
  const input=$('amount-to-pay');
  if(!input.reportValidity()||selectedId===null)return;
  const amount=Number(input.value);
  if(!Number.isFinite(amount)||amount<0)return;
  save(selectedId,'amount',Math.round(amount*100)/100);
});
$('payment-rows').addEventListener('click',e=>{const button=e.target.closest('[data-detail]');if(button)openDetails(Number(button.dataset.detail))});
$('payment-rows').addEventListener('change',e=>{const input=e.target.closest('input[data-field]');if(input)save(Number(input.dataset.id),input.dataset.field,input.checked)});
for(const id of ['search','paycheck-filter','status-filter','method-filter','unpaid-only'])$(id).addEventListener(id==='search'?'input':'change',render);
$('method-filter').value=['manual','auto'].includes(params.get('view'))?params.get('view'):'all';
$('unpaid-only').checked=['manual','auto'].includes(params.get('view'));
$('prev-month').onclick=()=>{date.setMonth(date.getMonth()-1);render()};
$('next-month').onclick=()=>{date.setMonth(date.getMonth()+1);render()};
$('close-dialog').onclick=()=>$('bill-dialog').close();
$('bill-dialog').addEventListener('click',e=>{if(e.target===$('bill-dialog'))$('bill-dialog').close()});
$('detail-funded').onclick=()=>{const r=currentRows().find(x=>x.id===selectedId);if(r)save(r.id,'funded',!r.funded)};
$('detail-paid').onclick=()=>{const r=currentRows().find(x=>x.id===selectedId);if(r)save(r.id,'paid',!r.paid)};
render();
