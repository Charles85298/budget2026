// Shared full bill editor used by all bill-oriented pages.
const FullBillEditor=(()=>{
  let currentId=null,currentDate=null,onSaved=null;
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const dialog=document.createElement('dialog');dialog.className='bill-dialog full-bill-editor';dialog.innerHTML=`
    <div class="dialog-head"><div><span class="eyebrow">EDIT ENTIRE BILL</span><h2 id="full-edit-title">Edit bill</h2></div><button type="button" class="close-button" data-full-close aria-label="Close">×</button></div>
    <form id="full-bill-form" class="full-bill-form">
      <div class="override-grid">
        <label>Payee <input name="payee" required></label><label>Amount <input name="amount" type="number" min="0" step="0.01"></label>
        <label>Due day <input name="due" type="number" min="1" max="31" step="1" required></label><label>Due rule <select name="dueRule"><option value="day">Specific day</option><option value="end_of_month">End of month</option></select></label>
        <label>Frequency <select name="frequency"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option><option value="one-time">One-time</option></select></label>
        <label>Paycheck <select name="paycheck"><option value="1">Paycheck 1</option><option value="2">Paycheck 2</option><option value="3">Paycheck 3</option></select></label>
        <label>Category <input name="category"></label><label>Payment method <select name="method"><option value="MANUAL">Manual</option><option value="Auto - bill pay">Auto - bill pay</option><option value="Auto - debit card">Auto - debit card</option><option value="Auto - credit card">Auto - credit card</option><option value="Savings">Savings</option></select></label>
        <label>Phone <input name="phone"></label><label>Website <input name="website" type="url"></label>
        <label>Interest rate % <input name="interestRate" type="number" step="0.001"></label><label>Payoff balance <input name="payoff" type="number" min="0" step="0.01"></label>
        <label>Minimum payment <input name="minimumPayment" type="number" min="0" step="0.01"></label>
      </div>
      <fieldset id="full-quarterly-fields"><legend>Quarterly funding</legend><div class="override-grid"><label>First due month <input name="firstDueMonth" type="month"></label><label>Funding paycheck <select name="fundingPaycheck"><option value="1">Paycheck 1</option><option value="2">Paycheck 2</option><option value="3">Paycheck 3</option></select></label><label>Amount already saved <input name="openingFundBalance" type="number" min="0" step="0.01"></label></div></fieldset>
      <p class="muted">These changes update the recurring bill starting with the month you are viewing. Existing recorded payments are preserved.</p>
      <div class="dialog-actions"><button type="button" class="button secondary" data-full-close>Cancel</button><button type="submit" class="button primary">Save entire bill</button></div>
    </form>`;document.body.appendChild(dialog);
  const form=dialog.querySelector('#full-bill-form'),q=dialog.querySelector('#full-quarterly-fields');
  function toggle(){q.hidden=form.elements.frequency.value!=='quarterly'} form.elements.frequency.addEventListener('change',toggle);
  dialog.addEventListener('click',e=>{if(e.target===dialog||e.target.closest('[data-full-close]'))dialog.close()});
  function num(name){return form.elements[name].value===''?null:Number(form.elements[name].value)}
  function open(id,date,callback){const bill=BillStore.billsFor(date).find(b=>b.id===id)||BillStore.quarterlyPlans(date).find(b=>b.id===id);if(!bill)return;currentId=id;currentDate=new Date(date);onSaved=callback;dialog.querySelector('#full-edit-title').textContent=bill.payee;
    for(const name of ['payee','amount','due','dueRule','frequency','paycheck','category','method','phone','website','interestRate','payoff','minimumPayment','firstDueMonth','fundingPaycheck','openingFundBalance']){const el=form.elements[name];if(!el)continue;const v=bill[name];el.value=v===null||v===undefined?'':v}
    if(!form.elements.frequency.value)form.elements.frequency.value='monthly';if(!form.elements.dueRule.value)form.elements.dueRule.value='day';if(!form.elements.fundingPaycheck.value)form.elements.fundingPaycheck.value=String(bill.paycheck||1);toggle();dialog.showModal();form.elements.payee.focus();}
  form.addEventListener('submit',e=>{e.preventDefault();if(currentId===null)return;const fields={payee:form.elements.payee.value.trim(),amount:num('amount'),due:num('due'),dueRule:form.elements.dueRule.value,frequency:form.elements.frequency.value,paycheck:num('paycheck'),category:form.elements.category.value.trim(),method:form.elements.method.value,phone:form.elements.phone.value.trim(),website:form.elements.website.value.trim(),interestRate:num('interestRate'),payoff:num('payoff'),minimumPayment:num('minimumPayment')};if(fields.frequency==='quarterly'){fields.firstDueMonth=form.elements.firstDueMonth.value||BillStore.key(currentDate);fields.fundingPaycheck=num('fundingPaycheck')||fields.paycheck;fields.openingFundBalance=num('openingFundBalance')||0}if(!fields.payee||!Number.isInteger(fields.due)||fields.due<1||fields.due>31)return;BillStore.change(currentId,fields,BillStore.key(currentDate));dialog.close();if(onSaved)onSaved();});
  return {open};
})();
