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
function render(){
  const list=monthRows();
  const funds=BillStore.quarterlyPlans(displayDate).map(plan=>FundStore.entry(plan,displayDate));
  const month=displayDate.getFullYear()+'-'+String(displayDate.getMonth()+1).padStart(2,'0');
  monthLabel.textContent=displayDate.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  for(const [id,page] of [['planned-link','planned-bills.html'],['auto-link','auto-payments.html'],['manual-link','manual-payments.html']])document.getElementById(id).href=page+'?month='+month;
  document.getElementById('fund-link').href='quarterly-funds.html?month='+month;
  const auto=list.filter(r=>!r.paid&&paymentGroup(r.method)==='auto');
  const manual=list.filter(r=>!r.paid&&paymentGroup(r.method)==='manual');
  document.getElementById('planned-total').textContent=money(list.reduce((sum,r)=>sum+(r.plannedAmount||0),0));
  document.getElementById('bill-count').textContent=list.length+' planned bills'+(list.some(r=>r.amount===null)?' · excludes blank amounts':'');
  document.getElementById('auto-total').textContent=money(auto.reduce((sum,r)=>sum+(r.amount||0),0));
  document.getElementById('auto-count').textContent=auto.length+' unpaid bills';
  document.getElementById('manual-total').textContent=money(manual.reduce((sum,r)=>sum+(r.amount||0),0));
  document.getElementById('manual-count').textContent=manual.length+' unpaid bills';
  document.getElementById('fund-total').textContent=money(funds.reduce((sum,r)=>sum+(r.contribution||0),0));
  document.getElementById('fund-count').textContent=funds.length+' monthly contribution'+(funds.length===1?'':'s');
  document.getElementById('paycheck-grid').innerHTML=[1,2,3].map(n=>{
    const group=list.filter(r=>r.paycheck===n);
    const assignedFunds=funds.filter(r=>r.paycheck===n);
    const total=group.filter(r=>r.frequency!=='quarterly').reduce((sum,r)=>sum+(r.plannedAmount||0),0)+assignedFunds.reduce((sum,r)=>sum+(r.contribution||0),0);
    return `<article class="paycheck-card"><div class="paycheck-top"><span>PAYCHECK ${String(n).padStart(2,'0')}</span><span>${group.filter(r=>r.frequency!=='quarterly').length} bills · ${assignedFunds.length} funds</span></div><strong>${money(total)}</strong><p>Planned from this paycheck</p><div class="paycheck-bottom"><span>${group.filter(r=>r.frequency!=='quarterly').slice(0,2).map(r=>escapeHtml(r.payee)).join(' · ')}${assignedFunds.length?' · quarterly set aside':''}</span><a href="${assignedFunds.length?'quarterly-funds.html':'pay-bills.html'}?month=${month}" aria-label="View paycheck ${n} details">↗</a></div></article>`;
  }).join('');
  const query=search.value.trim().toLowerCase();
  const filtered=list.filter(r=>[r.payee,r.category,String(r.paycheck)].some(v=>v.toLowerCase().includes(query))).sort((a,b)=>a.due-b.due||a.id-b.id);
  document.getElementById('bill-rows').innerHTML=filtered.map(r=>`<tr><td class="payee">${escapeHtml(r.payee)}</td><td>${r.due}</td><td>${escapeHtml(r.category||'—')}</td><td><span class="pill">#${r.paycheck}</span></td><td><span class="payment">${escapeHtml(r.method||'—')}</span></td><td class="right amount">${money(r.plannedAmount)}</td><td class="right amount">${money(r.amount)}</td></tr>`).join('');
  document.getElementById('empty-state').hidden=filtered.length>0;
}
document.getElementById('prev-month').onclick=()=>{displayDate.setMonth(displayDate.getMonth()-1);render()};
document.getElementById('next-month').onclick=()=>{displayDate.setMonth(displayDate.getMonth()+1);render()};
search.addEventListener('input',render);
render();
