const $=id=>document.getElementById(id);
const money=n=>n===null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const params=new URLSearchParams(location.search),selected=params.get('month');
const date=/^\d{4}-(0[1-9]|1[0-2])$/.test(selected||'')?new Date(Number(selected.slice(0,4)),Number(selected.slice(5))-1,1):new Date(2026,9,1);
function render(){
  const month=BillStore.key(date),plans=BillStore.quarterlyPlans(date);
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
      <div class="fund-meta"><span>Suggested this month <b>${money(entry.contribution)}</b></span><span>Opening balance <b>${money(plan.openingFundBalance)}</b></span>${payment?`<span>Bill due this month <b>${money(payment.amount)}</b></span>`:''}</div>
      <form class="fund-action" data-id="${plan.id}"><label>Amount moved to fund <input name="amount" type="number" min="0" step="0.01" value="${entry.funded?entry.fundedAmount:entry.contribution??''}" required></label><button class="button ${entry.funded?'secondary':'primary'}" type="submit">${entry.funded?'Update contribution':'Mark funded'}</button>${entry.funded?'<button class="undo-fund" type="button" data-undo="'+plan.id+'">Undo</button>':''}</form>
      ${shortfall?`<p class="fund-alert">This bill is ${money(shortfall)} above the recorded fund balance.</p>`:''}
      ${fund.unrecorded?`<p class="fund-alert">${fund.unrecorded} paid bill${fund.unrecorded===1?'':'s'} need an actual payment amount to reconcile this balance.</p>`:''}
      ${payment?`<a class="fund-bill-link" href="planned-bills.html?month=${month}">Open bill for payment →</a>`:''}</article>`;
  }).join('');
  $('target-total').textContent=money(target);$('fund-count').textContent=plans.length+' quarterly fund'+(plans.length===1?'':'s');
  $('contributed-total').textContent=money(contributed);$('balance-total').textContent=money(balance);
  $('fund-empty').hidden=plans.length>0;
}
$('fund-list').addEventListener('submit',event=>{
  const form=event.target.closest('form[data-id]');if(!form)return;
  event.preventDefault();const input=form.elements.amount;if(!input.reportValidity())return;
  try{FundStore.setContribution(Number(form.dataset.id),date,input.value,true);render()}catch(error){input.setCustomValidity(error.message);input.reportValidity();input.setCustomValidity('')}
});
$('fund-list').addEventListener('click',event=>{const button=event.target.closest('[data-undo]');if(button){FundStore.setContribution(Number(button.dataset.undo),date,0,false);render()}});
$('prev-month').onclick=()=>{date.setMonth(date.getMonth()-1);render()};
$('next-month').onclick=()=>{date.setMonth(date.getMonth()+1);render()};
render();
