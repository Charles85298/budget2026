// UTF-8 CSV with spreadsheet-safe text cells.
const CsvExport=(()=>{
  function cell(value){
    if(value===null||value===undefined)return '';
    if(typeof value==='number'&&Number.isFinite(value))return String(value);
    let text=String(value);
    if(/^\s*[=+@\-]/.test(text))text="'"+text;
    return '"'+text.replace(/"/g,'""')+'"';
  }
  function download(filename,headers,rows){
    const content='\ufeff'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
    const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return {download};
})();
