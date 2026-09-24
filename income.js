const $=id=>document.getElementById(id);
const money=n=>n===null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const requested=new URLSearchParams(location.search).get('month');
const date=/^\d{4}-(0[1-9]|1[0-2])$/.test(requested||'')?new Date(Number(requested.slice(0,4)),Number(requested.slice(5))-1,1):new Date(2026,9,1);
let editing=null;
function plan(n){
  const regular=BillStore.billsFor(date).filter(b=>b.paycheck===n&&b.frequency!=='quarterly').reduce((sum,b)=>sum+(b.plannedAmount||0),0);
  const quarterly=BillStore.quarterlyPlans(date).filter(b=>b.fundingPaycheck===n).reduce((sum,b)=>sum+(FundStore.target(b,date)||0),0);
  const income=IncomeStore.totals(date,n);
  return {paycheck:n,...income,regular,quarterly,commitment:Math.round((regular+quarterly)*100)/100};
}
function render(){
  const month=IncomeStore.monthKey(date),list=IncomeStore.entries(date).slice().sort((a,b)=>a.payDate.localeCompare(b.payDate)||a.id-b.id);
  $('month-label').textContent=date.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  document.querySelectorAll('.nav-group a').forEach(a=>a.href=a.href.split('?')[0]+'?month='+month);
  const plans=[1,2,3].map(plan);
  $('expected-total').textContent=list.some(r=>r.expectedAmount!==null)?money(plans.reduce((sum,p)=>sum+p.expected,0)):'—';
  $('actual-total').textContent=list.some(r=>r.actualAmount!==null)?money(plans.reduce((sum,p)=>sum+p.actual,0)):'—';
  $('income-count').textContent=list.length+' income entr'+(list.length===1?'y':'ies');
  $('commitment-total').textContent=money(plans.reduce((sum,p)=>sum+p.commitment,0));
  $('income-paycheck-grid').innerHTML=plans.map(p=>`<article class="paycheck-card income-card"><div class="paycheck-top"><span>PAYCHECK ${String(p.paycheck).padStart(2,'0')}</span><span>${p.count} income entries</span></div>
    <div class="income-card-lines"><span>Expected income <b>${p.hasExpected?money(p.expected):'—'}</b></span><span>Actual received <b>${p.hasActual?money(p.actual):'—'}</b></span><span>Regular bills <b>${money(p.regular)}</b></span><span>Quarterly set aside <b>${money(p.quarterly)}</b></span></div>
    <div class="income-card-remain"><span>Expected remaining</span><strong>${p.hasExpected?money(p.expected-p.commitment):'—'}</strong><small>${p.hasActual?'After actual income: '+money(p.actual-p.commitment):'Enter income to calculate the remainder'}</small></div></article>`).join('');
  $('income-rows').innerHTML=list.map(r=>`<tr><td class="payee">${escapeHtml(r.source)}</td><td>${escapeHtml(r.payDate)}</td><td><span class="pill">#${r.paycheck}</span></td><td class="right amount">${money(r.expectedAmount)}</td><td class="right amount">${money(r.actualAmount)}</td><td class="row-actions"><button type="button" data-edit="${r.id}">Edit</button><button type="button" data-delete="${r.id}">Delete</button></td></tr>`).join('');
  $('income-empty').hidden=list.length>0;
}
function openForm(id=null){
  editing=id;const r=IncomeStore.entries(date).find(item=>item.id===id);
  $('income-form').reset();$('income-form-title').textContent=r?'Edit income':'Add income';
  if(r)for(const key of ['source','payDate','paycheck','expectedAmount','actualAmount'])if(r[key]!==null&&r[key]!==undefined)$('income-form').elements[key].value=r[key];
  if(!r)$('income-form').elements.payDate.value=IncomeStore.monthKey(date)+'-15';
  $('income-dialog').showModal();$('income-form').elements.source.focus();
}
$('add-income').onclick=()=>openForm();
$('close-income').onclick=$('cancel-income').onclick=()=>$('income-dialog').close();
$('income-dialog').addEventListener('click',e=>{if(e.target===$('income-dialog'))$('income-dialog').close()});
$('income-rows').addEventListener('click',e=>{
  const edit=e.target.closest('[data-edit]'),remove=e.target.closest('[data-delete]');
  if(edit)openForm(Number(edit.dataset.edit));
  if(remove){const id=Number(remove.dataset.delete),record=IncomeStore.entries(date).find(r=>r.id===id);if(record&&confirm('Delete '+record.source+' from this month?')){IncomeStore.remove(date,id);render()}}
});
$('income-form').addEventListener('submit',e=>{
  e.preventDefault();const form=e.currentTarget,month=IncomeStore.monthKey(date);
  if(!form.elements.payDate.value.startsWith(month+'-')){form.elements.payDate.setCustomValidity('Choose a date in '+month+'.');form.elements.payDate.reportValidity();return}
  form.elements.payDate.setCustomValidity('');
  const number=name=>form.elements[name].value===''?null:Math.round(Number(form.elements[name].value)*100)/100;
  IncomeStore.save(date,{id:editing,source:form.elements.source.value.trim(),payDate:form.elements.payDate.value,paycheck:Number(form.elements.paycheck.value),expectedAmount:number('expectedAmount'),actualAmount:number('actualAmount')});
  $('income-dialog').close();render();
});
$('income-form').elements.payDate.addEventListener('input',()=> $('income-form').elements.payDate.setCustomValidity(''));
$('export-income').onclick=()=>CsvExport.download('financial-freedom-income-'+IncomeStore.monthKey(date)+'.csv',
  ['Month','Source','Pay date','Paycheck','Expected amount','Actual amount'],
  IncomeStore.entries(date).map(r=>[IncomeStore.monthKey(date),r.source,r.payDate,r.paycheck,r.expectedAmount,r.actualAmount]));
$('export-summary').onclick=()=>CsvExport.download('financial-freedom-paycheck-summary-'+IncomeStore.monthKey(date)+'.csv',
  ['Month','Paycheck','Expected income','Actual income','Regular bills','Quarterly set aside','Planned commitments','Expected remaining','Remaining from actual income'],
  [1,2,3].map(n=>{const p=plan(n);return [IncomeStore.monthKey(date),n,p.hasExpected?p.expected:null,p.hasActual?p.actual:null,p.regular,p.quarterly,p.commitment,p.hasExpected?p.expected-p.commitment:null,p.hasActual?p.actual-p.commitment:null]}));
$('prev-month').onclick=()=>{date.setMonth(date.getMonth()-1);render()};
$('next-month').onclick=()=>{date.setMonth(date.getMonth()+1);render()};
render();
