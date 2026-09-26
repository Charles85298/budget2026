// Normalized Supabase data bootstrap.
// Financial records are read from/written to relational tables. localStorage is only a synchronous UI cache.
(async()=>{
  const scriptMap={
    'index.html':['bills-data.js','payment-store.js','bill-store.js','export-csv.js','fund-store.js','income-store.js','app.js'],
    'income.html':['bills-data.js','payment-store.js','bill-store.js','fund-store.js','income-store.js','export-csv.js','income.js'],
    'bill-management.html':['bills-data.js','payment-store.js','bill-store.js','export-csv.js','bill-management.js'],
    'quarterly-funds.html':['bills-data.js','payment-store.js','bill-store.js','export-csv.js','fund-store.js','quarterly-funds.js'],
    'pay-bills.html':['bills-data.js','payment-store.js','bill-store.js','export-csv.js','fund-store.js','pay-bills.js'],
    'planned-bills.html':['bills-data.js','payment-store.js','bill-store.js','export-csv.js','fund-store.js','pay-bills.js'],
    'auto-payments.html':['bills-data.js','payment-store.js','bill-store.js','export-csv.js','fund-store.js','pay-bills.js'],
    'manual-payments.html':['bills-data.js','payment-store.js','bill-store.js','export-csv.js','fund-store.js','pay-bills.js']
  };
  const page=location.pathname.split('/').pop()||'index.html';
  const status=document.createElement('div');status.className='cloud-status';status.setAttribute('role','status');status.textContent='Loading your budget…';document.body.prepend(status);
  const monthKey=d=>String(d||'').slice(0,7);
  const monthDate=m=>/^\d{4}-\d{2}$/.test(m||'')?m+'-01':m;
  const money=v=>v===null||v===undefined?null:Number(v);
  const legacyId=b=>Number(b.legacy_bill_id);
  try{
    if(!window.supabase?.createClient)throw Error('Could not load the Supabase client. Check your connection.');
    const cfg=window.FinancialFreedomConfig,client=window.supabase.createClient(cfg.url,cfg.publishableKey);
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user){location.replace('login.html?next='+encodeURIComponent(page+location.search));return}
    const tables=['bills','bill_changes','bill_occurrences','bill_payments','bill_funding','income_templates','income'];
    const results=await Promise.all(tables.map(t=>client.from(t).select('*')));
    const failed=results.find(r=>r.error);if(failed)throw Error('Could not load normalized budget data: '+failed.error.message);
    const [bills,changes,occurrences,payments,funding,templates,income]=results.map(r=>r.data||[]);
    const byUuid=new Map(bills.map(b=>[b.id,b])),byLegacy=new Map(bills.map(b=>[legacyId(b),b]));
    const baseBills=bills.map(b=>({
      id:legacyId(b),payee:b.payee,phone:b.phone||'',website:b.website||'',interestRate:money(b.interest_rate),payoff:money(b.payoff_balance),minimumPayment:money(b.minimum_payment),
      method:b.payment_method||'',frequency:b.frequency||'monthly',paycheck:Number(b.paycheck||1),due:Number(b.due_day||1),dueRule:b.due_rule||'day',month:'',year:'',amount:money(b.amount),category:b.category||'',funded:false,paid:false,
      startMonth:monthKey(b.start_month)||'2026-10',...(b.frequency==='quarterly'?{firstDueMonth:monthKey(b.first_due_month)||monthKey(b.start_month)||'2026-10',fundStartMonth:monthKey(b.start_month)||monthKey(b.first_due_month)||'2026-10',fundingPaycheck:Number(b.funding_paycheck||b.paycheck||1),openingFundBalance:Number(b.opening_fund_balance||0)}:{})
    }));
    // Rebuild synchronous page caches from normalized rows. These caches are not persisted back to browser_state.
    const management={added:[],changes:changes.map(c=>({id:legacyId(byUuid.get(c.bill_id)),from:monthKey(c.effective_month),fields:c.fields||{}})),removed:bills.filter(b=>b.inactive_from).map(b=>({id:legacyId(b),from:monthKey(b.inactive_from)}))};
    localStorage.setItem('paywise-demo-bill-management-v1',JSON.stringify(management));
    const occurrenceGroups={};
    for(const o of occurrences){const b=byUuid.get(o.bill_id);if(!b)continue;const m=monthKey(o.due_month),key='paywise-demo-payments-v1-'+Number(m.slice(0,4))+'-'+Number(m.slice(5,7));const slot=occurrenceGroups[key]??={};slot[legacyId(b)]={funded:!!o.funded,paid:!!o.paid,paidDate:o.paid_date||'',actualAmount:money(o.actual_amount),...(o.manual_override?{amount:money(o.override_amount??o.amount_due),due:Number(o.override_due_day??o.due_day),paycheck:Number(o.override_paycheck??o.paycheck),manualOverride:true}:{}),...(o.legacy_snapshot?{snapshot:o.legacy_snapshot}:{})};}
    for(const [k,v] of Object.entries(occurrenceGroups))localStorage.setItem(k,JSON.stringify(v));
    const ledger={};for(const p of payments){const b=byUuid.get(p.bill_id);if(!b)continue;(ledger[legacyId(b)+':'+monthKey(p.due_month)]??=[]).push({id:Number(p.legacy_payment_id||Date.now()),amount:Number(p.amount),date:p.payment_date});}localStorage.setItem('financial-freedom-payment-ledger-v1',JSON.stringify(ledger));
    const funds={};for(const f of funding){const b=byUuid.get(f.bill_id);if(b)funds[legacyId(b)+':'+monthKey(f.funding_month)]={amount:Number(f.funded_amount??f.target_amount??0),funded:!!f.funded};}localStorage.setItem('financial-freedom-quarterly-funds-v1',JSON.stringify(funds));
    const schedule={salary:null,ssdi:null};for(const t of templates){if(t.template_key==='salary15'){schedule.salary??={amount:Number(t.amount)};schedule.salary.salary15Paycheck=Number(t.paycheck||1)}else if(t.template_key==='salaryEnd'){schedule.salary??={amount:Number(t.amount)};schedule.salary.salaryEndPaycheck=Number(t.paycheck||2)}else if(t.template_key==='ssdi'){schedule.ssdi={amount:Number(t.amount),paycheck:Number(t.paycheck||3)}}}localStorage.setItem('financial-freedom-income-schedule-v1',JSON.stringify(schedule));
    const incomeCache={};for(const r of income){const m=monthKey(r.source_month);(incomeCache[m]??=[]).push({id:Number(r.legacy_income_id),source:r.source,payDate:r.pay_date,paycheck:Number(r.paycheck),actualAmount:money(r.actual_amount),expectedAmount:money(r.expected_amount)});}for(const [m,list] of Object.entries(incomeCache)){const hidden=[];if(list.some(r=>r.paycheck===1))hidden.push(-1);if(list.some(r=>r.paycheck===2))hidden.push(-2);if(list.some(r=>r.paycheck===3))hidden.push(-3);if(hidden.length)incomeCache['hidden:'+m]=hidden;}localStorage.setItem('financial-freedom-income-v1',JSON.stringify(incomeCache));
    let queue=Promise.resolve();
    const enqueue=fn=>{queue=queue.catch(()=>{}).then(fn).catch(error=>{status.hidden=false;status.textContent='Cloud save failed: '+error.message+'. Keep this tab open and retry the change.';throw error});queue.catch(()=>{});return queue};
    async function billUuid(id){const known=byLegacy.get(Number(id));if(known)return known.id;const {data,error}=await client.from('bills').select('*').eq('legacy_bill_id',Number(id)).single();if(error)throw error;byLegacy.set(Number(id),data);byUuid.set(data.id,data);return data.id}
    async function syncManagement(value){
      for(const a of value.added||[]){if(byLegacy.has(Number(a.id)))continue;const row={owner_id:user.id,legacy_bill_id:Number(a.id),payee:a.payee,phone:a.phone||'',website:a.website||'',amount:a.amount,due_day:a.due,due_rule:a.dueRule||'day',frequency:a.frequency||'monthly',paycheck:a.paycheck,category:a.category||'',payment_method:a.method||'',interest_rate:a.interestRate,payoff_balance:a.payoff,minimum_payment:a.minimumPayment,start_month:monthDate(a.startMonth),first_due_month:a.firstDueMonth?monthDate(a.firstDueMonth):null,funding_paycheck:a.fundingPaycheck||null,opening_fund_balance:Number(a.openingFundBalance||0)};const {data,error}=await client.from('bills').insert(row).select().single();if(error)throw error;byLegacy.set(Number(a.id),data);byUuid.set(data.id,data)}
      for(const c of value.changes||[]){const id=await billUuid(c.id);const {error}=await client.from('bill_changes').upsert({owner_id:user.id,bill_id:id,effective_month:monthDate(c.from),fields:c.fields},{onConflict:'owner_id,bill_id,effective_month'});if(error)throw error}
      for(const r of value.removed||[]){const id=await billUuid(r.id);const {error}=await client.from('bills').update({inactive_from:monthDate(r.from),updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error}
    }
    async function syncOccurrences(key,value){const match=key.match(/-(\d{4})-(\d{1,2})$/);if(!match)return;const m=match[1]+'-'+String(match[2]).padStart(2,'0');for(const [id,s] of Object.entries(value||{})){const uuid=await billUuid(id),row={owner_id:user.id,bill_id:uuid,due_month:monthDate(m),funded:!!s.funded,paid:!!s.paid,paid_date:s.paidDate||null,actual_amount:s.actualAmount??null,manual_override:!!s.manualOverride,override_amount:s.manualOverride?(s.amount??null):null,override_due_day:s.manualOverride?(s.due??null):null,override_paycheck:s.manualOverride?(s.paycheck??null):null,legacy_snapshot:s.snapshot||null};const {error}=await client.from('bill_occurrences').upsert(row,{onConflict:'owner_id,bill_id,due_month'});if(error)throw error}}
    async function syncLedger(value){const {error:del}=await client.from('bill_payments').delete().eq('owner_id',user.id);if(del)throw del;const rows=[];for(const [slot,list] of Object.entries(value||{})){const split=slot.indexOf(':'),id=slot.slice(0,split),m=slot.slice(split+1),uuid=await billUuid(id);for(const p of list)rows.push({owner_id:user.id,bill_id:uuid,legacy_payment_id:Number(p.id),due_month:monthDate(m),payment_date:p.date,amount:Number(p.amount)})}if(rows.length){const {error}=await client.from('bill_payments').insert(rows);if(error)throw error}}
    async function syncFunding(value){for(const [slot,f] of Object.entries(value||{})){const split=slot.indexOf(':'),id=slot.slice(0,split),m=slot.slice(split+1),uuid=await billUuid(id);const {error}=await client.from('bill_funding').upsert({owner_id:user.id,bill_id:uuid,funding_month:monthDate(m),funded_amount:Number(f.amount||0),funded:!!f.funded},{onConflict:'owner_id,bill_id,funding_month'});if(error)throw error}}
    async function syncIncome(value){for(const [m,list] of Object.entries(value||{})){if(!/^\d{4}-\d{2}$/.test(m))continue;const {error:del}=await client.from('income').delete().eq('owner_id',user.id).eq('source_month',monthDate(m));if(del)throw del;if(list.length){const rows=list.map(r=>({owner_id:user.id,legacy_income_id:Number(r.id),source:r.source,pay_date:r.payDate,paycheck:Number(r.paycheck),expected_amount:r.expectedAmount,actual_amount:r.actualAmount,recurring:!!r.recurring,source_month:monthDate(m)}));const {error}=await client.from('income').insert(rows);if(error)throw error}}}
    async function syncTemplates(v){const rows=[];if(v.salary){rows.push({owner_id:user.id,template_key:'salary15',source:'Salary',amount:Number(v.salary.amount),paycheck:Number(v.salary.salary15Paycheck||1),schedule_rule:'day_15',settings:{}},{owner_id:user.id,template_key:'salaryEnd',source:'Salary',amount:Number(v.salary.amount),paycheck:Number(v.salary.salaryEndPaycheck||2),schedule_rule:'end_of_month',settings:{}})}if(v.ssdi)rows.push({owner_id:user.id,template_key:'ssdi',source:"Wife's SSDI",amount:Number(v.ssdi.amount),paycheck:Number(v.ssdi.paycheck||3),schedule_rule:'fourth_wednesday',settings:{}});if(rows.length){const {error}=await client.from('income_templates').upsert(rows,{onConflict:'owner_id,template_key'});if(error)throw error}}
    const save=(key,value)=>{localStorage.setItem(key,JSON.stringify(value));return enqueue(async()=>{if(key==='paywise-demo-bill-management-v1')return syncManagement(value);if(/^paywise-demo-payments-v1-\d{4}-\d{1,2}$/.test(key))return syncOccurrences(key,value);if(key==='financial-freedom-payment-ledger-v1')return syncLedger(value);if(key==='financial-freedom-quarterly-funds-v1')return syncFunding(value);if(key==='financial-freedom-income-v1')return syncIncome(value);if(key==='financial-freedom-income-schedule-v1')return syncTemplates(value)})};
    window.CloudSync={save,client,user,baseBills,queue:()=>queue,normalized:true};
    for(const source of scriptMap[page]||[]){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=source;s.onload=resolve;s.onerror=()=>reject(Error('Could not load '+source));document.body.append(s)})}
    const header=document.querySelector('.topbar a[href="login.html"]');if(header){const button=document.createElement('button');button.className='auth-signout';button.type='button';button.textContent='Sign out';button.onclick=async()=>{await queue.catch(()=>{});await client.auth.signOut();location.replace('login.html')};header.replaceWith(button)}
    status.hidden=true;
  }catch(error){status.hidden=false;status.textContent=error.message;document.querySelector('.app-shell')?.remove()}
})();
