// Dashboard and payment page share the same sample bill records and browser status changes.
const money = value => value===null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let displayDate=new Date(2026,9,1);
const monthLabel=document.getElementById('month-label');
const search=document.getElementById('bill-search');
function monthRows(){
  return BillStore.billsFor(displayDate);
}
function paymentGroup(method){
  const normalized=method.toLowerCase();
  if(normalized.includes('auto'))return 'auto';
  if(normalized.includes('manual')||normalized.includes('savings'))return 'manual';
  return 'other';
}
function filteredBills(list){
  const query=search.value.trim().toLowerCase();
  return list.filter(r=>[r.payee,r.category,String(r.paycheck)].some(v=>v.toLowerCase().includes(query))).sort((a,b)=>a.due-b.due||a.id-b.id);
}
function render(){
  const list=monthRows();
  // Dashboard bill views show only unpaid occurrences; month planning still includes paid commitments.
  const unpaid=list.filter(r=>!r.paid);
  const funds=BillStore.quarterlyPlans(displayDate).map(plan=>FundStore.entry(plan,displayDate));
  const month=displayDate.getFullYear()+'-'+String(displayDate.getMonth()+1).padStart(2,'0');
  monthLabel.textContent=displayDate.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  for(const [id,page] of [['planned-link','planned-bills.html'],['auto-link','auto-payments.html'],['manual-link','manual-payments.html']])document.getElementById(id).href=page+'?month='+month;
  document.getElementById('fund-link').href='quarterly-funds.html?month='+month;
  document.getElementById('manage-income-link').href='income.html?month='+month;
  document.querySelector('.sidebar a[href^="income.html"]').href='income.html?month='+month;
  document.getElementById('overview-message').textContent=IncomeStore.entries(displayDate).length
    ? 'Quarterly contributions are included in paycheck commitments. Income and bill changes stay in this browser.'
    : 'Quarterly contributions are included in paycheck commitments. Add income to see what remains from each paycheck.';
  const auto=unpaid.filter(r=>paymentGroup(r.method)==='auto');
  const manual=unpaid.filter(r=>paymentGroup(r.method)==='manual');
  document.getElementById('planned-total').textContent=money(unpaid.reduce((sum,r)=>sum+(r.amount||0),0));
  document.getElementById('bill-count').textContent=unpaid.length+' unpaid bill'+(unpaid.length===1?'':'s')+(unpaid.some(r=>r.amount===null)?' · excludes blank amounts':'');
  document.getElementById('auto-total').textContent=money(auto.reduce((sum,r)=>sum+(r.amount||0),0));
  document.getElementById('auto-count').textContent=auto.length+' unpaid bill'+(auto.length===1?'':'s');
  document.getElementById('manual-total').textContent=money(manual.reduce((sum,r)=>sum+(r.amount||0),0));
  document.getElementById('manual-count').textContent=manual.length+' unpaid bill'+(manual.length===1?'':'s');
  document.getElementById('fund-total').textContent=money(funds.reduce((sum,r)=>sum+(r.contribution||0),0));
  document.getElementById('fund-count').textContent=funds.length+' monthly contribution'+(funds.length===1?'':'s');
  document.getElementById('paycheck-grid').innerHTML=[1,2,3].map(n=>{
    const group=list.filter(r=>r.paycheck===n);
    const unpaidGroup=group.filter(r=>!r.paid);
    const assignedFunds=funds.filter(r=>r.paycheck===n);
    const total=group.filter(r=>r.frequency!=='quarterly').reduce((sum,r)=>sum+(r.plannedAmount||0),0)+assignedFunds.reduce((sum,r)=>sum+(r.contribution||0),0);
    const income=IncomeStore.totals(displayDate,n);
    return `<article class="paycheck-card income-aware"><div class="paycheck-top"><span>PAYCHECK ${String(n).padStart(2,'0')}</span><span>${unpaidGroup.length} unpaid bills · ${assignedFunds.length} funds</span></div><div class="paycheck-income"><span>Expected income <b>${income.hasExpected?money(income.expected):'—'}</b></span><span>Actual income <b>${income.hasActual?money(income.actual):'—'}</b></span><span>Planned commitments <b>${money(total)}</b></span></div><div class="paycheck-remain"><span>Expected remaining</span><strong>${income.hasExpected?money(income.expected-total):'—'}</strong><small>${income.hasActual?'After actual income: '+money(income.actual-total):'Add income to calculate remaining'}</small></div><div class="paycheck-bottom"><span>${assignedFunds.length?'Includes quarterly set aside':'Regular bills'}</span><a href="income.html?month=${month}" aria-label="Manage paycheck ${n} income">↗</a></div></article>`;
  }).join('');
  const filtered=filteredBills(unpaid);
  document.getElementById('bill-rows').innerHTML=filtered.map(r=>`<tr><td class="payee">${escapeHtml(r.payee)}</td><td>${r.due}</td><td>${escapeHtml(r.category||'—')}</td><td><span class="pill">#${r.paycheck}</span></td><td><span class="payment">${escapeHtml(r.method||'—')}</span></td><td class="right amount">${money(r.plannedAmount)}</td><td class="right amount">${money(r.amount)}</td></tr>`).join('');
  document.getElementById('empty-state').hidden=filtered.length>0;
  document.getElementById('empty-state').textContent=search.value.trim()?'No unpaid bills match your search.':'All bills for this month are paid.';
}
document.getElementById('prev-month').onclick=()=>{displayDate.setMonth(displayDate.getMonth()-1);render()};
document.getElementById('next-month').onclick=()=>{displayDate.setMonth(displayDate.getMonth()+1);render()};
search.addEventListener('input',render);
document.getElementById('export-dashboard').onclick=()=>CsvExport.download('financial-freedom-dashboard-bills-'+BillStore.key(displayDate)+'.csv',
  ['Month','Payee','Due day','Paycheck','Category','Payment method','Frequency','Planned amount','Amount to pay','Actual amount paid','Payment date','Funded','Paid'],
  filteredBills(monthRows().filter(r=>!r.paid)).map(r=>[BillStore.key(displayDate),r.payee,r.due,r.paycheck,r.category,r.method,r.frequency,r.plannedAmount,r.amount,r.actualAmount,r.paidDate,r.funded?'Yes':'No',r.paid?'Yes':'No']));
render();
