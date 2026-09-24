// Mock recurring bill templates. The backend can later replace this data source.
const bills = [
  ['Concorо Credit · Home Depot',300,2,1,'Debt','Manual','one-time',10],
  ['HOA',69.78,1,1,'Housing','Manual','quarterly',null],
  ["Jen’s car · Navy Federal",562.41,1,1,'Debt','Auto','monthly'],
  ['Western Exterminators',43.60,3,1,'Housing','Auto','monthly'],
  ['SiriusXM',27.98,4,1,'Subscriptions','Auto','monthly'],
  ['Water & Sewer',160,4,1,'Utilities','Auto','monthly'],
  ['BestEgg',242.49,10,1,'Debt','Auto','monthly'],
  ['Amazon credit card',200,11,1,'Debt','Manual','monthly'],
  ['APS',480,12,1,'Utilities','Auto','monthly'],
  ['GreenSky · Carpet',192.04,12,1,'Debt','Auto','monthly'],
  ['Allstate',282.36,13,1,'Auto','Auto','monthly'],
  ['CitiCards · Costco',155,14,1,'Debt','Manual','monthly'],
  ['Wyyerd Internet',200,15,1,'Mobile & Internet','Auto','monthly'],
  ['Southwest Gas',42.40,16,1,'Utilities','Auto','monthly'],
  ['CareCredit · Jen',100,10,1,'Debt','Manual','monthly'],
  ['Happened Bank',282.60,4,1,'Debt','Manual','monthly'],
  ['BHG',226.79,16,1,'Debt','Unspecified','monthly'],
  ['Figure · HELOC',300,29,1,'Debt','Auto','monthly'],
  ['Verizon',316,4,2,'Mobile & Internet','Auto','monthly'],
  ['Best Buy',100,12,2,'Debt','Manual','monthly'],
  ['Wells Fargo · SafeKey',100,14,2,'Debt','Manual','monthly'],
  ["Moe’s food",150,15,2,'Misc','Manual','monthly'],
  ['Lowe’s · Jen',169,28,2,'Debt','Auto','monthly'],
  ['Figure · HELOC',550,29,2,'Debt','Auto','monthly'],
  ['Student loan · Aidvantage',276.50,16,2,'Debt','Auto','monthly'],
  ['Netflix',29.45,22,2,'Subscriptions','Auto','monthly'],
  ['Everlake · Life insurance',111.67,25,2,'Life Insurance','Manual','monthly'],
  ['Gerber · Gavin',11.66,25,2,'Life Insurance','Auto','monthly'],
  ['Amazon credit card',150,11,2,'Debt','Manual','monthly'],
  ['CareCredit · Charlie',200,7,2,'Debt','Auto','monthly'],
  ['Freedom Unlimited',150,4,2,'Debt','Manual','monthly'],
  ['Lowe’s · Charlie',117,2,2,'Debt','Manual','monthly'],
  ['BHG',200,16,2,'Debt','Unspecified','monthly'],
  ['DMV',250,25,3,'Auto','Auto','yearly',null],
  ["Jen’s pellets",350,25,3,'Misc','Auto','quarterly',null],
  ['Figure · HELOC',250,29,3,'Debt','Auto','monthly'],
  ['Dividend Finance · Solar',460,27,3,'Debt','Auto','monthly'],
  ['Freedom Mortgage',1883.76,30,3,'Housing','Auto','monthly']
].map(([payee,amount,due,paycheck,category,payment,frequency,month])=>({payee,amount,due,paycheck,category,payment,frequency,month}));
const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
const today = new Date();
let displayDate = new Date(today.getFullYear(),today.getMonth(),1);
const monthLabel = document.getElementById('month-label');
const search = document.getElementById('bill-search');
function visibleBills(){
  const month = displayDate.getMonth()+1;
  // Quarter/year anchors were not supplied, so those records stay visible as planning examples.
  return bills.filter(b => b.frequency !== 'one-time' || (displayDate.getFullYear()===2026 && month===b.month));
}
function render(){
  const list = visibleBills();
  monthLabel.textContent = displayDate.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  document.getElementById('planned-total').textContent = money(list.reduce((sum,b)=>sum+b.amount,0));
  document.getElementById('bill-count').textContent = `${list.length} planned bills`;
  document.getElementById('auto-total').textContent = money(list.filter(b=>b.payment==='Auto').reduce((sum,b)=>sum+b.amount,0));
  document.getElementById('manual-total').textContent = money(list.filter(b=>b.payment==='Manual').reduce((sum,b)=>sum+b.amount,0));
  document.getElementById('paycheck-grid').innerHTML = [1,2,3].map(n=>{
    const group=list.filter(b=>b.paycheck===n);
    const total=group.reduce((sum,b)=>sum+b.amount,0);
    return `<article class="paycheck-card"><div class="paycheck-top"><span>PAYCHECK ${String(n).padStart(2,'0')}</span><span>${group.length} bills</span></div><strong>${money(total)}</strong><p>Planned for this paycheck</p><div class="paycheck-bottom"><span>${group.slice(0,2).map(b=>b.payee).join(' · ')}${group.length>2?' + more':''}</span><a href="#bills" aria-label="View bills">↗</a></div></article>`;
  }).join('');
  const query=search.value.trim().toLocaleLowerCase();
  const filtered=list.filter(b=>[b.payee,b.category,String(b.paycheck)].some(v=>v.toLocaleLowerCase().includes(query))).sort((a,b)=>a.due-b.due || a.payee.localeCompare(b.payee));
  document.getElementById('bill-rows').innerHTML=filtered.map(b=>`<tr><td class="payee">${b.payee}</td><td>${b.due}</td><td>${b.category}</td><td><span class="pill">#${b.paycheck}</span></td><td><span class="payment">${b.payment}</span></td><td class="right amount">${money(b.amount)}</td></tr>`).join('');
  document.getElementById('empty-state').hidden=filtered.length>0;
}
document.getElementById('prev-month').onclick=()=>{displayDate.setMonth(displayDate.getMonth()-1);render()};
document.getElementById('next-month').onclick=()=>{displayDate.setMonth(displayDate.getMonth()+1);render()};
search.addEventListener('input',render);
render();
