const $=id=>document.getElementById(id);
const money=n=>n===null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const params=new URLSearchParams(location.search),selected=params.get('month');
const date=/^\d{4}-(0[1-9]|1[0-2])$/.test(selected||'')?new Date(Number(selected.slice(0,4)),Number(selected.slice(5))-1,1):new Date(2026,9,1);
function render(){
  const month=BillStore.key(date),allPlans=BillStore.quarterlyPlans(date);
  const search=($('fund-search')?.value||'').trim().toLowerCase(), paycheck=$('fund-paycheck')?.value||'all', funded=$('fund-funded')?.value||'all', sort=$('fund-sort')?.value||'payee';
  let plans=allPlans.filter(plan=>{const entry=FundStore.entry(plan,date);return plan.payee.toLowerCase().includes(search)&&(paycheck==='all'||entry.paycheck===Number(paycheck))&&(funded==='all'||entry.funded===(funded==='yes'))});
  const sortValue=plan=>{const entry=FundStore.entry(plan,date),fund=FundStore.balance(plan,date),payment=BillStore.billsFor(date).find(b=>b.id===plan.id);const due=FundStore.nextDue(plan,payment?.paid?new Date(date.getFullYear(),date.getMonth()+1,1):date);return {entry,fund,due}};
  plans.sort((a,b)=>{const av=sortValue(a),bv=sortValue(b);if(sort==='payee-desc')return b.payee.localeCompare(a.payee);if(sort==='next')return av.due-bv.due;if(sort==='amount-desc')return (b.amount||0)-(a.amount||0);if(sort==='balance-desc')return bv.fund.amount-av.fund.amount;return a.payee.localeCompare(b.payee)});
  $('month-label').textContent=date.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  document.querySelectorAll('.nav-group a').forEach(a=>a.href=a.href.split('?')[0]+'?month='+month);
  let target=0,contributed=0,balance=0;
  $('fund-list').innerHTML=plans.map(plan=>{
    const entry=FundStore.entry(plan,date),fund=FundStore.balance(plan,date);
    const payment=BillStore.billsFor(date).find(b=>b.id===plan.id);
    const due=FundStore.nextDue(plan,payment?.paid?new Date(date.getFullYear(),date.getMonth()+1,1):date);
    target+=entry.contribution||0;contributed+=entry.fundedAmount||0;balance+=fund.amount;
    const next=due.toLocaleDateString('en-US',{month:'long',year:'numeric'});
    const shortfall=payment&&!payment.paid&&payment.amount!==null?Math.max(0,Math.round((payment.amount-FundStore.balance(plan,date,{beforePayment:true}).amount)*100)/100):0;
    return `<article class="fund-card"><div class="fund-heading"><div><h3>${escapeHtml(plan.payee)}</h3><span>Paycheck ${entry.paycheck} · Next bill ${next} · Quarterly bill ${money(plan.amount)}</span></div><strong>${money(fund.amount)}<small> fund balance</small></strong></div>
      <div class="fund-meta"><span>Suggested this month <b>${money(entry.contribution)}</b></span><span>Amount already saved <b>${money(plan.openingFundBalance)}</b></span>${payment?`<span>Bill due this month <b>${money(payment.amount)}</b></span>`:''}</div>
      <form class="fund-action" data-id="${plan.id}"><label>Amount moved to fund <input name="amount" type="number" min="0" step="0.01" value="${entry.funded?entry.fundedAmount:entry.contribution??''}" required></label><button class="button ${entry.funded?'secondary':'primary'}" type="submit">${entry.funded?'Update contribution':'Mark funded'}</button>${entry.funded?'<button class="undo-fund" type="button" data-undo="'+plan.id+'">Undo</button>':''}</form>
      ${shortfall?`<p class="fund-alert">This bill is ${money(shortfall)} above the recorded fund balance.</p>`:''}
      ${fund.unrecorded?`<p class="fund-alert">${fund.unrecorded} paid bill${fund.unrecorded===1?'':'s'} need an actual payment amount to reconcile this balance.</p>`:''}
      <div class="fund-card-actions"><button class="button secondary" type="button" data-edit-bill="${plan.id}">Edit entire bill</button>${payment?`<a class="fund-bill-link" href="planned-bills.html?month=${month}">Open bill for payment →</a>`:''}</div></article>`;
  }).join('');
  $('target-total').textContent=money(target);$('fund-count').textContent=allPlans.length+' quarterly fund'+(allPlans.length===1?'':'s');$('fund-visible').textContent=plans.length+' of '+allPlans.length+' shown';
  $('contributed-total').textContent=money(contributed);$('balance-total').textContent=money(balance);
  $('fund-empty').textContent=allPlans.length?'No quarterly funds match these filters.':'No quarterly funds are active in this month.';$('fund-empty').hidden=plans.length>0;
}
$('fund-list').addEventListener('submit',event=>{
  const form=event.target.closest('form[data-id]');if(!form)return;
  event.preventDefault();const input=form.elements.amount;if(!input.reportValidity())return;
  try{FundStore.setContribution(Number(form.dataset.id),date,input.value,true);render()}catch(error){input.setCustomValidity(error.message);input.reportValidity();input.setCustomValidity('')}
});
$('fund-list').addEventListener('click',event=>{const edit=event.target.closest('[data-edit-bill]');if(edit){FullBillEditor.open(Number(edit.dataset.editBill),date,render);return}const button=event.target.closest('[data-undo]');if(button){FundStore.setContribution(Number(button.dataset.undo),date,0,false);render()}});
$('export-funds').onclick=()=>CsvExport.download('financial-freedom-quarterly-funds-'+BillStore.key(date)+'.csv',
  ['Month','Payee','Quarterly bill amount','Due day','Next due month','Funding paycheck','Suggested contribution','Funded contribution','Contribution funded','Amount already saved','Current fund balance','Bill due this month','Actual bill payment','Payment date','Unrecorded paid bills'],
  BillStore.quarterlyPlans(date).map(plan=>{
    const entry=FundStore.entry(plan,date),balance=FundStore.balance(plan,date),bill=BillStore.billsFor(date).find(r=>r.id===plan.id);
    const next=FundStore.nextDue(plan,bill?.paid?new Date(date.getFullYear(),date.getMonth()+1,1):date);
    return [BillStore.key(date),plan.payee,plan.amount,plan.due,BillStore.key(next),entry.paycheck,entry.contribution,entry.fundedAmount,entry.funded?'Yes':'No',plan.openingFundBalance,balance.amount,bill?.amount??null,bill?.actualAmount??null,bill?.paidDate??'',balance.unrecorded];
  }));
for(const id of ['fund-search','fund-paycheck','fund-funded','fund-sort'])$(id).addEventListener(id==='fund-search'?'input':'change',render);
$('fund-clear').onclick=()=>{$('fund-search').value='';$('fund-paycheck').value='all';$('fund-funded').value='all';$('fund-sort').value='payee';render()};
$('prev-month').onclick=()=>{date.setMonth(date.getMonth()-1);render()};
$('next-month').onclick=()=>{date.setMonth(date.getMonth()+1);render()};
render();
