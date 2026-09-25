// Sign in, load this user's records, and only then start the existing pages.
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
  const allowed=/^(paywise-demo-bill-management-v1|paywise-demo-payments-v1-\d{4}-\d{1,2}|financial-freedom-(income-v1|income-schedule-v1|payment-ledger-v1|quarterly-funds-v1))$/;
  const status=document.createElement('div');status.className='cloud-status';status.setAttribute('role','status');status.textContent='Loading your budget…';document.body.prepend(status);
  try{
    if(!window.supabase?.createClient)throw Error('Could not load the Supabase client. Check your connection.');
    const cfg=window.FinancialFreedomConfig;
    const client=window.supabase.createClient(cfg.url,cfg.publishableKey);
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user){location.replace('login.html?next='+encodeURIComponent(page+location.search));return}
    const {data, error}=await client.from('browser_state').select('storage_key,value');
    if(error)throw Error('Could not load your budget: '+error.message+' Run both SQL migrations in Supabase first.');
    // Preserve old browser-only data for an explicit import. Never merge another user's records automatically.
    const old={};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(allowed.test(key))old[key]=localStorage.getItem(key)}
    const backupKey='financial-freedom-import-backup:'+user.id;
    if(Object.keys(old).length&&!sessionStorage.getItem(backupKey))sessionStorage.setItem(backupKey,JSON.stringify(old));
    const backup=JSON.parse(sessionStorage.getItem(backupKey)||'{}');
    const oldKeys=Object.keys(backup);
    for(const key of oldKeys)localStorage.removeItem(key);
    for(const row of data)localStorage.setItem(row.storage_key,JSON.stringify(row.value));
    let queue=Promise.resolve();
    const save=(key,value)=>{
      localStorage.setItem(key,JSON.stringify(value));
      queue=queue.catch(()=>{}).then(async()=>{
        const {error}=await client.from('browser_state').upsert({owner_id:user.id,storage_key:key,value},{onConflict:'owner_id,storage_key'});
        if(error)throw error;
      }).catch(error=>{status.hidden=false;status.textContent='Cloud save failed: '+error.message+'. Keep this tab open and retry the change.';throw error});
      // Callers are synchronous; the status banner reports asynchronous failures.
      queue.catch(()=>{});
    };
    window.CloudSync={save,client,user};
    for(const source of scriptMap[page]||[]){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=source;s.onload=resolve;s.onerror=()=>reject(Error('Could not load '+source));document.body.append(s)})}
    const header=document.querySelector('.topbar a[href="login.html"]');
    if(header){const button=document.createElement('button');button.className='auth-signout';button.type='button';button.textContent='Sign out';button.onclick=async()=>{await queue.catch(()=>{});await client.auth.signOut();for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(allowed.test(key))localStorage.removeItem(key)}location.replace('login.html')};header.replaceWith(button)}
    status.hidden=true;
    if(!data.length&&oldKeys.length){
      const importButton=document.createElement('button');importButton.type='button';importButton.className='button secondary';importButton.textContent='Import this browser’s saved budget';
      const note=document.createElement('div');note.className='cloud-import';note.textContent='Saved browser data was found. Import it into your account only if it belongs to you. ';
      note.append(importButton);document.querySelector('.content')?.prepend(note);
      importButton.onclick=async()=>{
        importButton.disabled=true;importButton.textContent='Importing…';
        try{for(const [key,raw] of Object.entries(backup))await Promise.resolve(save(key,JSON.parse(raw)));await queue;sessionStorage.removeItem(backupKey);location.reload()}
        catch(error){importButton.disabled=false;importButton.textContent='Retry import';status.hidden=false;status.textContent='Import failed: '+error.message}
      };
    }
  }catch(error){status.hidden=false;status.textContent=error.message;document.querySelector('.app-shell')?.remove()}
})();
