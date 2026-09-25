const $=id=>document.getElementById(id);
const client=window.supabase?.createClient(window.FinancialFreedomConfig.url,window.FinancialFreedomConfig.publishableKey);
const next=new URLSearchParams(location.search).get('next');
const safeNext=next&&/^(index|income|bill-management|quarterly-funds|pay-bills|planned-bills|auto-payments|manual-payments)\.html(\?month=\d{4}-\d{2})?$/.test(next)?next:'index.html';
$('show-password').onclick=()=>{const input=$('password'),show=input.type==='password';input.type=show?'text':'password';$('show-password').textContent=show?'Hide':'Show'};
const message=$('auth-message');
client?.auth.getUser().then(({data:{user}})=>{if(user)location.replace(safeNext)});
$('login-form').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!client){message.textContent='Could not load Supabase. Check your connection.';return}
  const button=event.submitter,mode=button?.value||'signin';
  const email=$('email').value.trim(),password=$('password').value;
  message.textContent='Working…';
  const {data,error}=mode==='signup'
    ?await client.auth.signUp({email,password,options:{emailRedirectTo:new URL('login.html',location.href).href}})
    :await client.auth.signInWithPassword({email,password});
  if(error){message.textContent=error.message;return}
  if(mode==='signup'&&!data.session){message.textContent='Check your email to confirm your account, then sign in.';return}
  location.replace(safeNext);
});
