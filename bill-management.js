const $=id=>document.getElementById(id);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>n===null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const now=new Date(), currentMonth=BillStore.key(now);
$('start-month').min=currentMonth;
$('start-month').value=currentMonth<='2026-10'?'2026-10':currentMonth;
let editing=null;
const selectedDate=()=>{const [year,month]=$('start-month').value.split('-').map(Number);return new Date(year,month-1,1)};
function managedBills(){
  const due=BillStore.billsFor(selectedDate());
  const ids=new Set(due.map(b=>b.id));
  return [...due,...BillStore.quarterlyPlans(selectedDate()).filter(b=>!ids.has(b.id)).map(b=>({...b,paid:false,plannedAmount:b.amount}))];
}
function visible(){return managedBills().filter(r=>r.payee.toLowerCase().includes($('manage-search').value.trim().toLowerCase())).sort((a,b)=>a.due-b.due||a.id-b.id)}
function toggleQuarterly(){const quarterly=$('bill-form').elements.frequency.value==='quarterly';$('quarterly-fields').hidden=!quarterly;$('bill-form').elements.firstDueMonth.required=quarterly}
function render(){
  const list=visible();$('manage-count').textContent=list.length+' bills';
  $('manage-rows').innerHTML=list.map(r=>`<tr><td class="payee"><button type="button" class="payee-button" data-action="details" data-id="${r.id}" aria-label="View details for ${escapeHtml(r.payee)}">${escapeHtml(r.payee)}</button></td><td>${r.due}</td><td>${escapeHtml(r.frequency||'Monthly*')}</td><td><span class="pill">#${r.paycheck}</span></td><td class="right amount">${money(r.amount)}</td><td class="row-actions">${r.paid&&r.frequency!=='quarterly'?'<span class="muted">Paid</span>':`<button type="button" data-action="edit" data-id="${r.id}">Edit future</button><button type="button" data-action="delete" data-id="${r.id}">Delete future</button>`}</td></tr>`).join('');
  $('manage-empty').hidden=list.length>0;
}
function openForm(id=null){
  editing=id;const r=id===null?null:managedBills().find(b=>b.id===id);
  if(id!==null&&!r)return;
  $('bill-form').reset();
  $('form-title').textContent=r?'Edit future bills':'Add bill';
  $('form-scope').textContent=r?'Changes start '+$('start-month').value+' and apply to this bill from then on. Paid occurrences stay as recorded.':'The first bill starts in '+$('start-month').value+'; recurring bills continue in later months.';
  for(const key of ['payee','amount','due','frequency','paycheck','category','method','phone','website','interestRate','payoff','minimumPayment']){
    if(r&&r[key]!==null&&r[key]!==undefined)$('bill-form').elements[key].value=r[key];
  }
  if(r&&!r.frequency)$('bill-form').elements.frequency.value='monthly';
  if(r?.frequency==='quarterly'){
    $('bill-form').elements.firstDueMonth.value=r.firstDueMonth||'2026-10';
    $('bill-form').elements.fundingPaycheck.value=r.fundingPaycheck||r.paycheck;
    $('bill-form').elements.openingFundBalance.value=r.openingFundBalance||0;
  }else if(!r){
    const start=selectedDate();start.setMonth(start.getMonth()+3);
    $('bill-form').elements.firstDueMonth.value=BillStore.key(start);
    $('bill-form').elements.fundingPaycheck.value='1';
  }
  toggleQuarterly();
  $('edit-dialog').showModal();
  $('bill-form').elements.payee.focus();
}
function detail(label,value){
  return `<div class="detail"><span>${label}</span><strong>${escapeHtml(value===null||value===undefined||value===''?'—':value)}</strong></div>`;
}
function openDetails(id){
  const bill=managedBills().find(r=>r.id===id);
  if(!bill)return;
  $('details-title').textContent=bill.payee;
  const phone=/^[+*\d() .-]+$/.test(bill.phone||'')&&bill.phone
    ? `<a href="tel:${encodeURIComponent(bill.phone.replace(/[^+*\d]/g,''))}">${escapeHtml(bill.phone)}</a>`
    : escapeHtml(bill.phone||'—');
  let website=escapeHtml(bill.website||'—');
  try{const url=new URL(bill.website);if(['https:','http:'].includes(url.protocol))website=`<a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(bill.website)}</a>`}catch{}
  const [year,month]=$('start-month').value.split('-').map(Number);
  $('details-grid').innerHTML=[
    detail('Planned amount',money(bill.plannedAmount)),detail('Amount to pay',money(bill.amount)),
    detail('Actual amount paid',bill.paid?money(bill.actualAmount):'—'),
    detail('Payment date',bill.paid?bill.paidDate:''),
    ...(bill.frequency==='quarterly'?[
      detail('First due month',bill.firstDueMonth||'October 2026'),
      detail('Funding paycheck','Paycheck '+(bill.fundingPaycheck||bill.paycheck)),
      detail('Opening fund balance',money(bill.openingFundBalance||0)),
      detail('Suggested monthly contribution',bill.amount===null?'—':money(Math.round(bill.amount*100/3)/100))
    ]:[]),
    detail('Due day',bill.due),
    detail('Paycheck','Paycheck '+bill.paycheck),detail('Category',bill.category),
    detail('Payment method',bill.method),detail('Frequency',bill.frequency||'Monthly (assumed)'),
    `<div class="detail"><span>Phone</span><strong>${phone}</strong></div>`,
    `<div class="detail"><span>Website</span><strong>${website}</strong></div>`,
    detail('Interest rate',bill.interestRate===null?null:bill.interestRate+'%'),
    detail('Payoff balance',bill.payoff===null?null:money(bill.payoff)),
    detail('Minimum payment',bill.minimumPayment===null?null:money(bill.minimumPayment)),
    detail('Planned month',new Date(year,month-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'})),
    detail('Funded',bill.funded?'Yes':'No'),detail('Paid',bill.paid?'Yes':'No')
  ].join('');
  $('details-dialog').showModal();
}
$('add-bill').onclick=()=>openForm();
$('bill-form').elements.frequency.addEventListener('change',toggleQuarterly);
$('close-form').onclick=$('cancel-form').onclick=()=>$('edit-dialog').close();
$('edit-dialog').addEventListener('click',e=>{if(e.target===$('edit-dialog'))$('edit-dialog').close()});
$('close-details').onclick=$('done-details').onclick=()=>$('details-dialog').close();
$('details-dialog').addEventListener('click',e=>{if(e.target===$('details-dialog'))$('details-dialog').close()});
$('manage-rows').addEventListener('click',e=>{
  const button=e.target.closest('[data-action]');if(!button)return;
  const id=Number(button.dataset.id), bill=managedBills().find(b=>b.id===id);
  if(!bill)return;
  if(button.dataset.action==='details'){openDetails(id);return}
  if(bill.paid&&bill.frequency!=='quarterly')return;
  if(button.dataset.action==='edit')openForm(id);
  else if(confirm(`Delete future ${bill.payee} bills starting ${$('start-month').value}? Paid bills will remain.`)){BillStore.removeFuture(id,$('start-month').value);render()}
});
$('bill-form').addEventListener('submit',e=>{
  e.preventDefault();const form=e.currentTarget;
  const number=name=>form.elements[name].value===''?null:Number(form.elements[name].value);
  const fields={payee:form.elements.payee.value.trim(),amount:number('amount'),due:number('due'),frequency:form.elements.frequency.value,paycheck:number('paycheck'),category:form.elements.category.value.trim(),method:form.elements.method.value,phone:form.elements.phone.value.trim(),website:form.elements.website.value.trim(),interestRate:number('interestRate'),payoff:number('payoff'),minimumPayment:number('minimumPayment')};
  if(fields.frequency==='quarterly'){
    fields.firstDueMonth=form.elements.firstDueMonth.value;
    fields.fundingPaycheck=Number(form.elements.fundingPaycheck.value);
    fields.openingFundBalance=number('openingFundBalance')||0;
    if(editing===null&&fields.firstDueMonth<$('start-month').value){form.elements.firstDueMonth.setCustomValidity('First due month must be on or after the start month.');form.elements.firstDueMonth.reportValidity();return}
  }
  form.elements.firstDueMonth.setCustomValidity('');
  if(!fields.payee||!Number.isInteger(fields.due)||fields.due<1||fields.due>31)return;
  if(editing===null)BillStore.add(fields,$('start-month').value);else BillStore.change(editing,fields,$('start-month').value);
  $('edit-dialog').close();render();
});
$('start-month').addEventListener('change',render);
$('manage-search').addEventListener('input',render);
render();
