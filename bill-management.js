const $=id=>document.getElementById(id);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>n===null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const now=new Date(), currentMonth=BillStore.key(now);
$('start-month').min=currentMonth;
$('start-month').value=currentMonth<='2026-10'?'2026-10':currentMonth;
let editing=null;
const selectedDate=()=>{const [year,month]=$('start-month').value.split('-').map(Number);return new Date(year,month-1,1)};
function visible(){return BillStore.billsFor(selectedDate()).filter(r=>r.payee.toLowerCase().includes($('manage-search').value.trim().toLowerCase())).sort((a,b)=>a.due-b.due||a.id-b.id)}
function render(){
  const list=visible();$('manage-count').textContent=list.length+' bills';
  $('manage-rows').innerHTML=list.map(r=>`<tr><td class="payee">${escapeHtml(r.payee)}</td><td>${r.due}</td><td>${escapeHtml(r.frequency||'Monthly*')}</td><td><span class="pill">#${r.paycheck}</span></td><td class="right amount">${money(r.amount)}</td><td class="row-actions">${r.paid?'<span class="muted">Paid</span>':`<button type="button" data-action="edit" data-id="${r.id}">Edit future</button><button type="button" data-action="delete" data-id="${r.id}">Delete future</button>`}</td></tr>`).join('');
  $('manage-empty').hidden=list.length>0;
}
function openForm(id=null){
  editing=id;const r=id===null?null:BillStore.billsFor(selectedDate()).find(b=>b.id===id);
  if(id!==null&&!r)return;
  $('bill-form').reset();
  $('form-title').textContent=r?'Edit future bills':'Add bill';
  $('form-scope').textContent=r?'Changes start '+$('start-month').value+' and apply to this bill from then on. Paid occurrences stay as recorded.':'The first bill starts in '+$('start-month').value+'; recurring bills continue in later months.';
  for(const key of ['payee','amount','due','frequency','paycheck','category','method','phone','website','interestRate','payoff','minimumPayment']){
    if(r&&r[key]!==null&&r[key]!==undefined)$('bill-form').elements[key].value=r[key];
  }
  if(r&&!r.frequency)$('bill-form').elements.frequency.value='monthly';
  $('edit-dialog').showModal();
  $('bill-form').elements.payee.focus();
}
$('add-bill').onclick=()=>openForm();
$('close-form').onclick=$('cancel-form').onclick=()=>$('edit-dialog').close();
$('edit-dialog').addEventListener('click',e=>{if(e.target===$('edit-dialog'))$('edit-dialog').close()});
$('manage-rows').addEventListener('click',e=>{
  const button=e.target.closest('[data-action]');if(!button)return;
  const id=Number(button.dataset.id), bill=BillStore.billsFor(selectedDate()).find(b=>b.id===id);
  if(!bill||bill.paid)return;
  if(button.dataset.action==='edit')openForm(id);
  else if(confirm(`Delete future ${bill.payee} bills starting ${$('start-month').value}? Paid bills will remain.`)){BillStore.removeFuture(id,$('start-month').value);render()}
});
$('bill-form').addEventListener('submit',e=>{
  e.preventDefault();const form=e.currentTarget;
  const number=name=>form.elements[name].value===''?null:Number(form.elements[name].value);
  const fields={payee:form.elements.payee.value.trim(),amount:number('amount'),due:number('due'),frequency:form.elements.frequency.value,paycheck:number('paycheck'),category:form.elements.category.value.trim(),method:form.elements.method.value,phone:form.elements.phone.value.trim(),website:form.elements.website.value.trim(),interestRate:number('interestRate'),payoff:number('payoff'),minimumPayment:number('minimumPayment')};
  if(!fields.payee||!Number.isInteger(fields.due)||fields.due<1||fields.due>31)return;
  if(editing===null)BillStore.add(fields,$('start-month').value);else BillStore.change(editing,fields,$('start-month').value);
  $('edit-dialog').close();render();
});
$('start-month').addEventListener('change',render);
$('manage-search').addEventListener('input',render);
render();
