(function(){
  const cfg=window.SAEED_CONFIG||{};
  const canonical=document.querySelector('link[rel="canonical"]')||document.head.appendChild(Object.assign(document.createElement('link'),{rel:'canonical'}));
  if(location.protocol.startsWith('http')) canonical.href=(cfg.siteUrl?cfg.siteUrl.replace(/\/$/,''):'') + (cfg.siteUrl?location.pathname:location.href.split('#')[0]);
  const url=canonical.href||location.href.split('#')[0];
  const set=(sel,attr,val)=>{const el=document.querySelector(sel);if(el&&val)el.setAttribute(attr,val)};
  set('meta[property="og:url"]','content',url);
  set('meta[property="og:title"]','content',document.title);
  const desc=document.querySelector('meta[name="description"]')?.content;
  set('meta[property="og:description"]','content',desc);
  if(window.SaeedStore){SaeedStore.track('page_view',{title:document.title,referrer:document.referrer||''})}
})();
