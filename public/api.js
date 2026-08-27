(function(){
  const cfg=window.SAEED_CONFIG||{};
  const apiBase=String(cfg.apiBaseUrl||'').trim().replace(/\/+$/,'');
  const isAbsolute=u=>/^https?:\/\//i.test(String(u||''));
  const apiUrl=u=>isAbsolute(u)?u:(apiBase?apiBase+(String(u).startsWith('/')?'':'/')+u:u);
  const authUrl=u=>{const raw=String(u),target=apiUrl(raw),token=raw.startsWith('/api/portal/')?sessionStorage.getItem(portalKey):sessionStorage.getItem(adminKey);if(!token)return target;const x=new URL(target,location.href);x.searchParams.set('saeed_token',token);return x.toString()};
  const adminKey='saeed_admin_token',portalKey='saeed_portal_token';

  function assetUrl(v){
    if(typeof v!=='string'||!v.startsWith('/uploads/'))return v;
    return apiBase?apiBase+v:v;
  }
  function normalizeAssets(v){
    if(Array.isArray(v))return v.map(normalizeAssets);
    if(v&&typeof v==='object'){for(const k of Object.keys(v))v[k]=normalizeAssets(v[k]);return v}
    return assetUrl(v);
  }
  async function request(url,opts={}){
    const originalUrl=String(url);
    const target=apiUrl(originalUrl);
    const method=String(opts.method||'GET').toUpperCase();
    const headers={...(opts.body instanceof FormData?{}:{'Content-Type':'application/json'}),...(opts.headers||{})};
    const adminToken=sessionStorage.getItem(adminKey);
    const portalToken=sessionStorage.getItem(portalKey);
    if(originalUrl.startsWith('/api/admin/')||originalUrl.startsWith('/api/auth/')){
      if(adminToken)headers['X-Saeed-Admin-Token']=adminToken;
    }
    if(originalUrl.startsWith('/api/portal/')){
      if(portalToken)headers['X-Saeed-Portal-Token']=portalToken;
    }
    if(!['GET','HEAD'].includes(method)&&originalUrl.startsWith('/api/admin/'))headers['X-Saeed-Request']='1';
    const o={...opts,method,headers,credentials:apiBase?'omit':'same-origin'};
    if(o.body&&!(o.body instanceof FormData)&&typeof o.body!=='string')o.body=JSON.stringify(o.body);
    let r;
    try{r=await fetch(target,o)}
    catch{
      throw new Error(apiBase?'تعذر الاتصال بخادم البيانات. راجع apiBaseUrl وتأكد أن الـ Backend يعمل.':'تعذر الاتصال بخادم الموقع.')
    }
    const type=r.headers.get('content-type')||'';let data;
    if(type.includes('application/json'))data=await r.json();else data=await r.text();
    if(!r.ok){
      let message=data?.error||data||`HTTP ${r.status}`;
      if(typeof data==='string'&&(/Cannot\s+(GET|POST|PATCH|DELETE)\s+\/api\//i.test(data)||/<\!DOCTYPE html/i.test(data))){
        message='الواجهة تعمل لكن خادم البيانات غير متصل. إذا كانت الواجهة على Firebase اضبط apiBaseUrl في public/config.js على رابط الـ Backend.'
      }
      const e=new Error(message);e.status=r.status;e.data=data;throw e
    }
    if(data&&typeof data==='object'){
      if(data.adminToken)sessionStorage.setItem(adminKey,data.adminToken);
      if(data.portalToken)sessionStorage.setItem(portalKey,data.portalToken);
      normalizeAssets(data);
    }
    if(originalUrl==='/api/auth/logout'&&r.ok)sessionStorage.removeItem(adminKey);
    if(originalUrl==='/api/portal/logout'&&r.ok)sessionStorage.removeItem(portalKey);
    return data
  }
  const qs=o=>{const p=new URLSearchParams();Object.entries(o||{}).forEach(([k,v])=>{if(v!==''&&v!=null)p.set(k,v)});const s=p.toString();return s?'?'+s:''};
  window.SaeedAPI={
    request,qs,url:apiUrl,authUrl,assetUrl,
    get:(u,q)=>request(u+qs(q)),
    post:(u,b)=>request(u,{method:'POST',body:b}),
    patch:(u,b)=>request(u,{method:'PATCH',body:b}),
    del:u=>request(u,{method:'DELETE'}),
    upload:async(u,file,fields={})=>{const fd=new FormData();fd.append('file',file);Object.entries(fields).forEach(([k,v])=>fd.append(k,v));return request(u,{method:'POST',body:fd})}
  };
})();
