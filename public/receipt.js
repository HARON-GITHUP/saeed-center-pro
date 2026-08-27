document.getElementById('printReceipt')?.addEventListener('click',()=>window.print());
document.getElementById('downloadReceipt')?.addEventListener('click',()=>{
  const title='إيصال سداد - سنتر سعيد التعليمي';
  const rows=[...document.querySelectorAll('.row')].map(r=>({text:[...r.children].map(x=>x.textContent.trim()).join(' : '),bold:true}));
  const note=document.querySelector('.box>p')?.textContent?.trim(); if(note) rows.push({text:'ملاحظة: '+note});
  const receipt=[...document.querySelectorAll('.row')][0]?.querySelector('span')?.textContent?.trim()||'receipt';
  window.SaeedPDF?.downloadReport(title,rows,`receipt-${receipt}.pdf`);
});
