// October 2026 sample occurrences. Blank source cells remain blank in the detail view.
const rows = [
  ['concoro credit - home depot','800-228-1640','Manual','monthly',1,2,300,'',false,true,'October'],
  ['HOA','','MANUAL','quarterly',1,1,69.78,'Housing',false,true],
  ["Jen’s car - Navy Federal",'888-842-6328','Auto - bill pay','monthly',1,1,562.41,'Debt',false,true],
  ['western exterminators','3102749244','Auto - bill pay','monthly',1,3,43.60,'Housing',true,false],
  ['Siriusxm','866-635-5027','Auto - bill pay','monthly',1,4,27.98,'Subscriptions',true,false],
  ['Water and Sewer Utilities','623-222-1900','Auto - bill pay','monthly',1,4,160,'Utilities',true,false],
  ['1password','seed funding','Auto - Biz','yearly',1,10,null,'Subscriptions',true,false],
  ['resurgent capital (RCA) BestEgg','888-242-3711','Auto - bill pay','',1,10,242.49,'Debt',true,false],
  ['Amazon credit card','','BIZ Savings','',1,11,200,'Debt',true,false],
  ['APS acct 2007983195','602-371-7171','Auto - bill pay','',1,12,480,'Utilities',true,false],
  ['Green Sky (carpet)','866-936-0602','Auto - bill pay','',1,12,192.04,'Debt',true,false],
  ['Allstate','800-207-7847','Auto - bill pay','',1,13,282.36,'Auto',true,false],
  ['CitiCards (costco)','866-670-6730','MANUAL','',1,14,155,'Debt',true,false],
  ['Wyyerd internet','623-455-4500','Auto - bill pay','',1,15,200,'Mobile and Internet',true,false],
  ['Figure (heloc)','888-527-1950','Auto - bill pay','',1,29,300,'Debt',true,false],
  ['southwest gas','877-860-6020','Auto - bill pay','',1,16,42.40,'Utilities',true,false],
  ['Care Credit - Jen','','MANUAL','',1,10,100,'Debt',true,false],
  ['Happend bank','888-596-3157','MANUAL','',1,4,282.60,'Debt',true,false],
  ['BHG','','','',1,16,226.79,'Debt',true,false],
  ['Verizion','*611','Auto - bill pay','',2,4,316,'Mobile and Internet',false,false],
  ['best buy','','MANUAL','',2,12,100,'Debt',false,false],
  ['wellsfargo credit card (safekey)','833-599-0763','MANUAL','',2,14,100,'Debt',false,false],
  ["Moe’s food",'seed funding','Savings','',2,15,150,'Misc',false,false],
  ['lowes (Jen)','866-796-1609','Auto - bill pay','',2,28,169,'Debt',false,false],
  ['Figure (heloc)','888-527-1950','Auto - bill pay','',2,29,550,'Debt',false,false],
  ['Student Loan (Charles) Aidvantage','','Auto - bill pay','',2,16,276.50,'Debt',false,false],
  ['netflix','','Auto - bill pay','',2,22,29.45,'Subscriptions',false,false],
  ['Everlake (Allstate Life Insurance)','844-953-0347','MANUAL','',2,25,111.67,'Life Insurance',false,false],
  ['Gerber - Gavin','800-704-2180','Auto - bill pay','',2,25,11.66,'Life Insurance',false,false],
  ['credit card (amazon)','','MANUAL','',2,11,150,'Debt',false,false],
  ['Care Credit - Charlie','','Auto - bill pay','',2,7,200,'Debt',false,false],
  ['freedom unlimited','','MANUAL','',2,4,150,'Debt',false,false],
  ['lowes (Charlie)','','MANUAL','',2,2,117,'Debt',false,false],
  ['BHG','','','',2,16,200,'Debt',false,false],
  ['DMV','','Auto - bill pay','yearly',3,25,250,'Auto',false,false],
  ['Jen pellets','','Auto - bill pay','quarterly',3,25,350,'Misc',false,false],
  ['Figure (heloc)','888-527-1950','Auto - bill pay','',3,29,250,'Debt',false,false],
  ['Dividend Finance (solar)','844-805-7100','Auto - bill pay','',3,27,460,'Debt',false,false],
  ['Freedom Mortgage','855-690-5900','Auto - bill pay','',3,30,1883.76,'Housing',false,false]
].map(([payee,phone,method,frequency,paycheck,due,amount,category,funded,paid,month],id)=>({
  id,payee,phone,website:'',interestRate:null,payoff:null,minimumPayment:null,
  method,frequency,paycheck,due,month:month||'',year:'',amount,category,funded,paid
}));
const money=n=>n===null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=new Date(2026,9,1);
const $=id=>document.getElementById(id);
let selectedId=null;
function storageKey(){return 'paywise-demo-payments-v1-'+date.getFullYear()+'-'+(date.getMonth()+1)}
function applicable(){
  if(date.getFullYear()===2026&&date.getMonth()===9)return rows;
  // Unknown quarterly/yearly start months and blank frequencies cannot be projected reliably.
  return rows.filter(r=>r.frequency==='monthly'&&r.month==='');
}
function currentRows(){
  let saved={};
  try{saved=JSON.parse(localStorage.getItem(storageKey())||'{}')||{}}catch{}
  return applicable().map(r=>({...r,funded:false,paid:false,...(date.getFullYear()===2026&&date.getMonth()===9?{funded:r.funded,paid:r.paid}:{}),...(saved[r.id]||{})}));
}
function save(id,field,value){
  let saved={};
  try{saved=JSON.parse(localStorage.getItem(storageKey())||'{}')||{}}catch{}
  saved[id]={...(saved[id]||{}),[field]:value};
  localStorage.setItem(storageKey(),JSON.stringify(saved));
  render();
  if($('bill-dialog').open)openDetails(id);
}
function status(r){return r.paid?'paid':r.funded?'funded':'unfunded'}
function render(){
  const list=currentRows(), shown=list.filter(r=>
    r.payee.toLowerCase().includes($('search').value.trim().toLowerCase()) &&
    ($('paycheck-filter').value==='all'||r.paycheck===Number($('paycheck-filter').value)) &&
    ($('status-filter').value==='all'||status(r)===$('status-filter').value)
  ).sort((a,b)=>a.paycheck-b.paycheck||a.due-b.due||a.id-b.id);
  $('month-label').textContent=date.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  $('preview-message').textContent=date.getFullYear()===2026&&date.getMonth()===9
    ? 'October 2026 includes the statuses you provided. Changes are saved only in this browser.'
    : 'Preview months include only bills explicitly marked monthly. Quarterly, yearly, and unspecified schedules need setup.';
  for(const [key,predicate] of [['due',r=>!r.paid],['funded',r=>r.funded&&!r.paid],['paid',r=>r.paid]]){
    const group=list.filter(predicate);
    $(''+key+'-total').textContent=money(group.reduce((sum,r)=>sum+(r.amount||0),0));
    $(''+key+'-count').textContent=group.length+' bill'+(group.length===1?'':'s')+(group.some(r=>r.amount===null)?' · excludes blank amounts':'');
  }
  $('visible-count').textContent=shown.length+' of '+list.length+' bills';
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
  if(!$('bill-dialog').open)$('bill-dialog').showModal();
}
$('payment-rows').addEventListener('click',e=>{const button=e.target.closest('[data-detail]');if(button)openDetails(Number(button.dataset.detail))});
$('payment-rows').addEventListener('change',e=>{const input=e.target.closest('input[data-field]');if(input)save(Number(input.dataset.id),input.dataset.field,input.checked)});
for(const id of ['search','paycheck-filter','status-filter'])$(id).addEventListener(id==='search'?'input':'change',render);
$('prev-month').onclick=()=>{date.setMonth(date.getMonth()-1);render()};
$('next-month').onclick=()=>{date.setMonth(date.getMonth()+1);render()};
$('close-dialog').onclick=()=>$('bill-dialog').close();
$('bill-dialog').addEventListener('click',e=>{if(e.target===$('bill-dialog'))$('bill-dialog').close()});
$('detail-funded').onclick=()=>{const r=currentRows().find(x=>x.id===selectedId);if(r)save(r.id,'funded',!r.funded)};
$('detail-paid').onclick=()=>{const r=currentRows().find(x=>x.id===selectedId);if(r)save(r.id,'paid',!r.paid)};
render();
