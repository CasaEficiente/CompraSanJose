/* ==========================================================================
   CompraSanJose — PWA (frontend)
   Rellena estas dos constantes tras el setup (ver docs/DESPLIEGUE.md):
   ========================================================================== */
const CLIENT_ID   = "1023508400728-0slk8sh110iad5hkcsbsij8v8a8hfpkl.apps.googleusercontent.com";  // OAuth Client ID de Google
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbynSERdFdP0l75ubvoKLzZe1P9zq6tiAa1A7x7q6Ym3Vmkcy99dxv7XYA2DquGOj6CXlA/exec";
/* ========================================================================== */

const CATORDER = ['Fruteria','Carniceria','Charcuteria','Pescaderia','Panaderia','Lacteos','Congelados','Despensa','Bebidas'];
const CATCOLOR = {Fruteria:'#3E6B45',Carniceria:'#C7452C',Charcuteria:'#8a3b2e',Pescaderia:'#3B7DA6',Panaderia:'#C99A5B',Lacteos:'#E0A126',Congelados:'#5aa9b5',Despensa:'#6b7a5e',Bebidas:'#4a8f8a'};
const CATEMOJI = {Fruteria:'🥬',Carniceria:'🥩',Charcuteria:'🌭',Pescaderia:'🐟',Panaderia:'🍞',Lacteos:'🧀',Congelados:'❄️',Despensa:'🥫',Bebidas:'🥤'};

let idToken=null, userEmail=null, DATA=null;
let state = { tab:'calendario', detail:null, modal:null, mode:'calendario', tramo:'todo', open:{} };
let _cb = 0, pendingDelete = null, bootSeeded = false;

/* ------------------------------- utils ---------------------------------- */
const $ = (s,e=document)=>e.querySelector(s);
const esc = (s)=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const num = (x)=>{ const n=parseFloat(String(x==null?0:x).replace(',','.')); return isNaN(n)?0:n; };
function fmt(x){ x=Math.round(x*100)/100; if(Math.abs(x-Math.round(x))<1e-9) return String(Math.round(x)); return x.toFixed(2).replace(/0+$/,'').replace(/\.$/,'').replace('.',','); }
function legible(q,u){ q=Math.round(q*100)/100; if(u==='g'&&q>=1000)return fmt(q/1000)+' kg'; if(u==='ml'&&q>=1000)return fmt(q/1000)+' L'; if(u==='ud')return Math.ceil(q)+' ud'; return fmt(q)+' '+u; }
function truthy(v){ v=String(v==null?'':v).trim().toLowerCase(); return v==='si'||v==='sí'||v==='true'||v==='x'||v==='1'; }
function jwtEmail(t){ try{ return JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).email; }catch(e){ return null; } }
function toast(msg){ const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),1800); }

/* ------------------------------ backend --------------------------------- */
function apiRead(){
  return new Promise((resolve,reject)=>{
    if(!BACKEND_URL) return reject(new Error('sin backend'));
    const cb='jsonp_'+(++_cb);
    const s=document.createElement('script');
    const to=setTimeout(()=>{ cleanup(); reject(new Error('timeout')); }, 20000);
    function cleanup(){ clearTimeout(to); delete window[cb]; s.remove(); }
    window[cb]=(res)=>{ cleanup(); resolve(res); };
    s.onerror=()=>{ cleanup(); reject(new Error('red')); };
    s.src=BACKEND_URL+'?action=read&callback='+cb+'&token='+encodeURIComponent(idToken||'');
    document.body.appendChild(s);
  });
}
function apiWrite(payload){
  if(!BACKEND_URL) return Promise.resolve();
  return fetch(BACKEND_URL,{ method:'POST', mode:'no-cors',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify(Object.assign({token:idToken}, payload)) }).catch(()=>{});
}

/* ---------------------------- data helpers ------------------------------ */
function cfg(k){ const r=(DATA.Config||[]).find(x=>x.Clave===k); return r?r.Valor:''; }
function raciones(){ return (num(cfg('AdultosM'))+num(cfg('AdultosF')))+num(cfg('Ninos'))*num(cfg('FactorNino')); }
function ingMap(){ const m={}; (DATA.Ingredientes||[]).forEach(i=>m[i.Ingrediente]=i); return m; }
function compras(){ return (DATA.Compras||[]).filter(c=>String(c.Fecha).trim()).slice().sort((a,b)=>String(a.Fecha).localeCompare(String(b.Fecha))); }
function hastaOf(c){ const n=String((c&&c.Notas)||'').trim(); return /^\d{4}-\d{2}-\d{2}$/.test(n)?n:null; }
function tramoBounds(){
  if(state.tramo==='todo') return null;
  const cs=compras(); const i=cs.findIndex(c=>c.Fecha===state.tramo);
  if(i<0) return null;
  return { start:cs[i].Fecha, hasta:hastaOf(cs[i]), nextExcl:(i+1<cs.length)?cs[i+1].Fecha:null };
}
function includedComidas(){
  if(state.mode==='catalogo') return (DATA.Comidas||[]).map(c=>c.Comida);
  let slots=(DATA.Calendario||[]).filter(s=>s.Comida&&String(s.Comida).trim());
  const t=tramoBounds();
  if(t){ slots=slots.filter(s=>{ const f=String(s.Fecha); if(f<t.start) return false; if(t.hasta) return f<=t.hasta; if(t.nextExcl) return f<t.nextExcl; return true; }); }
  return [...new Set(slots.map(s=>s.Comida))];
}
function compradoIngr(){ const m={}; (DATA.ListaCompra||[]).forEach(r=>{ m[r.Ingrediente]=truthy(r.Comprado); }); return m; }

function extraOf(name){ const r=(DATA.ListaCompra||[]).find(x=>x.Ingrediente===name); const m=/extra=([\d.]+)/i.exec((r&&r.Notas)||''); return m?parseFloat(m[1]):0; }
function computeShopping(){
  const ing=ingMap(), inc=new Set(includedComidas()), qty={};
  (DATA.Recetas||[]).forEach(r=>{
    if(!inc.has(r.Comida)) return;
    const meta=ing[r.Ingrediente]; if(meta && truthy(meta.EsBasico)) return; // sin ficha => se incluye igual (no olvidar nada)
    qty[r.Ingrediente]=(qty[r.Ingrediente]||0)+num(r.CantidadPorComensal)*racionesDe(r.Comida);
  });
  (DATA.Despensa||[]).forEach(d=>{ if(qty[d.Ingrediente]!=null) qty[d.Ingrediente]-=num(d.Cantidad); });
  const byCat={};
  Object.keys(qty).forEach(name=>{
    if(qty[name]<=0.0001) return;
    const meta=ing[name]||{Categoria:'Despensa',Unidad:'g'};
    const need=Math.round(qty[name]*100)/100, buy=Math.round((need+extraOf(name))*100)/100;
    (byCat[meta.Categoria]=byCat[meta.Categoria]||[]).push({name, cat:meta.Categoria, unit:meta.Unidad, need, buy, legible:legible(buy,meta.Unidad)});
  });
  const groups=Object.keys(byCat).sort((a,b)=>(CATORDER.indexOf(a)+1||99)-(CATORDER.indexOf(b)+1||99))
    .map(cat=>({cat, items:byCat[cat].sort((x,y)=>x.name.localeCompare(y.name))}));
  let total=0; groups.forEach(g=>total+=g.items.length);
  return {groups,total};
}

/* --------------------------------- SVG ---------------------------------- */
const IC={
  comprar:'<path d="M3 4h2l2.5 12h11l2-8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>',
  calendario:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
  recetas:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M9 8h7M9 12h7"/>',
  despensa:'<path d="M4 8l8-4 8 4-8 4z"/><path d="M4 8v8l8 4 8-4V8"/>',
  ajustes:'<circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M18.5 5.5l-2 2M7.5 16.5l-2 2"/>'
};
const TABS=[['calendario','Calendario'],['comprar','Comprar'],['recetas','Recetas'],['despensa','Despensa'],['ajustes','Ajustes']];

/* ------------------------------- render --------------------------------- */
function render(){
  const app=$('#app');
  const head = `<div class="appbar"><div><div class="kicker">${esc(TABS.find(t=>t[0]===state.tab)[1])}</div>
      <h1>${state.detail?esc(state.detail):headTitle()}</h1></div><div class="spacer"></div>
      ${state.detail?`<button class="iconbtn" data-act="back">←</button>`:`<button class="iconbtn" data-act="refresh">⟳</button>`}</div>`;
  const body = `<div class="content">${state.detail?viewReceta(state.detail):viewTab()}</div>`;
  const tabs = `<nav class="tabbar">${TABS.map(([id,label])=>`<button data-act="tab" data-tab="${id}" class="${state.tab===id?'on':''}">
      <svg viewBox="0 0 24 24">${IC[id]}</svg>${label}</button>`).join('')}</nav>`;
  app.innerHTML = head+body+tabs + (state.modalHTML||'');
}
function headTitle(){
  if(state.tab==='comprar')return 'Compra vigente';
  if(state.tab==='calendario')return '1 – 9 agosto';
  if(state.tab==='recetas')return 'Recetas';
  if(state.tab==='despensa')return 'Ya en existencias';
  return 'Ajustes';
}
function viewTab(){
  if(state.tab==='comprar')return viewComprar();
  if(state.tab==='calendario')return viewCalendario();
  if(state.tab==='recetas')return viewRecetas();
  if(state.tab==='despensa')return viewDespensa();
  return viewAjustes();
}

function itemRow(kind,key,emoji,name,q,comprado){
  return `<div class="item ${comprado?'done':''}">
    <div class="thumb">${emoji||'🛒'}</div>
    <div class="it-main"><div class="n">${esc(name)}</div>${q?`<div class="q">${esc(q)}</div>`:''}</div>
    <button class="check ${comprado?'on':''}" data-act="toggle" data-kind="${kind}" data-key="${esc(key)}" aria-label="marcar"></button>
  </div>`;
}

function viewComprar(){
  const sh=computeShopping();
  const cs=compras();
  const tramoSel = state.mode==='calendario' ? `<select data-sel="tramo" style="flex:1">
      <option value="todo" ${state.tramo==='todo'?'selected':''}>Todo el evento</option>
      ${cs.map(c=>`<option value="${esc(c.Fecha)}" ${state.tramo===c.Fecha?'selected':''}>${esc(c.Fecha)}${hastaOf(c)?' → '+esc(hastaOf(c)):''}${c.Etiqueta?' · '+esc(c.Etiqueta):''}</option>`).join('')}
    </select>` : '';
  let html = `<div class="hero"><div class="lab">${state.mode==='catalogo'?'Todo el catálogo':'Según calendario'}</div>
    <div class="big">${sh.total} para cocinar</div>
    <div class="sub">${raciones()} raciones · marca ✓ y pasa a la despensa</div></div>
    <div class="controls"><div class="seg" style="flex:1">
      <button data-sel="mode" data-val="catalogo" class="${state.mode==='catalogo'?'on':''}">Todas las comidas</button>
      <button data-sel="mode" data-val="calendario" class="${state.mode==='calendario'?'on':''}">Por calendario</button>
    </div></div>${tramoSel?`<div class="controls">${tramoSel}</div>`:''}`;

  if(!sh.total){ html+=`<div class="banner">Aún no hay comidas que generen compra automática. Abre cada categoría para ver los productos y ponles cantidad, o asigna comidas en el Calendario.</div>`; }
  const sec=(key,color,label,count,inner)=>{
    const open=!!state.open[key];
    return `<button class="sect sec-btn" data-act="togglecat" data-key="${esc(key)}">
        <span class="dot" style="background:${color}"></span>${esc(label)}<span class="n">${count}</span><span class="caret ${open?'open':''}">▾</span></button>
      ${open?`<div class="card" style="padding:2px 12px">${inner}</div>`:''}`;
  };
  const DISPLAY_CATS=[
    ['Fruteria','Frutería / Verdura','#3E6B45','🥬'],['Carniceria','Carnicería','#C7452C','🥩'],
    ['Charcuteria','Charcutería','#8a3b2e','🌭'],['Pescaderia','Pescadería','#3B7DA6','🐟'],
    ['Precocinados','Precocinados','#c98a3b','🍕'],['Panaderia','Panadería','#C99A5B','🍞'],
    ['Lacteos','Lácteos y huevos','#E0A126','🧀'],['Congelados','Congelados','#5aa9b5','❄️'],
    ['Especias','Especias y condimentos','#9c6b2e','🌿'],['Despensa','Despensa','#6b7a5e','🥫'],
    ['Bebidas','Bebidas','#4a8f8a','🥤']
  ];
  const needByName={}; sh.groups.forEach(g=>g.items.forEach(it=>needByName[it.name]=it));
  const ing=ingMap();
  const manualAll=(DATA.ListaCompra||[]).filter(r=>/manual/i.test(r.Notas||'') && String(r.Ingrediente).trim());
  DISPLAY_CATS.forEach(([key,label,color,emoji])=>{
    const names=new Set((DATA.Ingredientes||[]).filter(i=>i.Categoria===key && !truthy(i.EsBasico)).map(i=>i.Ingrediente));
    Object.values(needByName).forEach(it=>{ if(it.cat===key) names.add(it.name); }); // ingredientes de receta sin ficha
    const catIngs=[...names].sort((a,b)=>a.localeCompare(b));
    const catHTML=catIngs.map(name=>{
      const it=needByName[name], meta=ing[name]||{Unidad:'g'};
      const need=it?it.need:0, unit=it?it.unit:(meta.Unidad||'g');
      const buy=Math.round((need+extraOf(name))*100)/100, on=buy>0;
      return `<div class="item ${on?'':'off'}">
        <div class="thumb">${emoji}</div>
        <div class="it-main"><div class="n">${esc(name)}</div>
          ${need>0?`<button class="tag-cook" data-act="ingrinfo" data-ing="${esc(name)}">Incluido x receta ›</button>`:''}
          <div class="q">${need>0?esc(it.legible):(on?'para comprar':'sin pedir')}</div></div>
        <input class="qin" data-buyqty data-ing="${esc(name)}" data-need="${need}" type="number" inputmode="decimal" value="${buy}" aria-label="comprar" title="Ponle cantidad para comprarlo">
        <span class="uni">${esc(unit)}</span>
        ${on?`<button class="check" data-act="buyingr" data-ing="${esc(name)}" data-buy="${buy}" data-unit="${esc(unit)}" aria-label="a despensa"></button>`:`<span class="ckoff"></span>`}
      </div>`;
    }).join('');
    const manItems=manualAll.filter(r=>r.Categoria===key);
    const manHTML=manItems.map(r=>{const on=num(r.Cantidad)>0;return `<div class="item ${on?'':'off'}">
      <div class="thumb">${emoji}</div>
      <div class="it-main"><div class="n">${esc(r.Ingrediente)}</div><div class="q">${on?'para comprar':'toca para pedir'}</div></div>
      <input class="qin" data-manqty data-ing="${esc(r.Ingrediente)}" type="number" inputmode="decimal" value="${esc(r.Cantidad)}" aria-label="cantidad">
      <span class="uni">${esc(r.Unidad||'ud')}</span>
      ${on?`<button class="check" data-act="buymanual" data-ing="${esc(r.Ingrediente)}" aria-label="comprado, a despensa"></button>`:`<span class="ckoff"></span>`}
      <button class="delx" data-act="delmanual" data-ing="${esc(r.Ingrediente)}" aria-label="quitar">×</button>
    </div>`;}).join('');
    const active=catIngs.filter(n=>{const t=needByName[n];return ((t?t.need:0)+extraOf(n))>0;}).length + manItems.filter(r=>num(r.Cantidad)>0).length;
    const inner=catHTML+manHTML+`<div style="padding:8px 4px"><button class="btn" data-act="addmanual" data-cat="${esc(key)}">+ Añadir a ${esc(label)}</button></div>`;
    html+=sec('cat:'+key, color, label, active, inner);
  });
  const bas=(DATA.Basicos||[]).filter(b=>String(b.Item).trim());
  html+=sec('basicos','#6b7a5e','Básicos de cocina (compra única)', bas.filter(b=>num(basQty(b.Formato))>0).length,
    bas.map(b=>{ const on=num(basQty(b.Formato))>0; return `<div class="item ${truthy(b.Comprado)?'done':''} ${on?'':'off'}">
      <div class="thumb">🧂</div><div class="it-main"><div class="n">${esc(b.Item)}</div><div class="q">${esc(basFmt(b.Formato))}</div></div>
      <input class="qin" data-basqty data-item="${esc(b.Item)}" type="number" inputmode="numeric" value="${esc(basQty(b.Formato))}" aria-label="cantidad">
      ${on?`<button class="check ${truthy(b.Comprado)?'on':''}" data-act="toggle" data-kind="basico" data-key="${esc(b.Item)}" aria-label="comprado"></button>`:`<span class="ckoff"></span>`}
      <button class="delx" data-act="delbasico" data-item="${esc(b.Item)}" aria-label="quitar">×</button>
    </div>`; }).join('')
    + `<div style="padding:8px 4px"><button class="btn" data-act="addbasico">+ Añadir básico (salsa, bote…)</button></div>`);
  ['Desayuno','Bebidas','Picoteo'].forEach(tipo=>{
    const rows=(DATA.ListasAbiertas||[]).filter(r=>r.Tipo===tipo && String(r.Item).trim());
    const em=tipo==='Desayuno'?'🥐':tipo==='Bebidas'?'🥤':'🥜';
    html+=sec('tipo:'+tipo,'#7A5A86',tipo,rows.filter(r=>num(r.Paquetes)>0).length,
      rows.map(r=>{ const on=num(r.Paquetes)>0; return `<div class="item ${truthy(r.Comprado)?'done':''} ${on?'':'off'}">
        <div class="thumb">${em}</div>
        <div class="it-main"><div class="n">${esc(r.Item)}</div><div class="q">${esc(r.Envase||'')}</div></div>
        <input class="qin" data-listqty data-item="${esc(r.Item)}" type="number" inputmode="numeric" value="${esc(r.Paquetes||0)}" aria-label="cantidad">
        ${on?`<button class="check ${truthy(r.Comprado)?'on':''}" data-act="toggle" data-kind="lista" data-key="${esc(r.Item)}" aria-label="comprado"></button>`:`<span class="ckoff"></span>`}
        <button class="delx" data-act="dellista" data-item="${esc(r.Item)}" aria-label="quitar">×</button>
      </div>`; }).join('')
      + `<div style="padding:8px 4px"><button class="btn" data-act="addlista" data-tipo="${tipo}">+ Añadir a ${tipo}</button></div>`);
  });
  return html;
}

function viewCalendario(){
  const byDate={};
  (DATA.Calendario||[]).forEach(s=>{ (byDate[s.Fecha]=byDate[s.Fecha]||[]).push(s); });
  const dates=Object.keys(byDate).sort();
  return dates.map(f=>{
    const rows=byDate[f].sort((a,b)=> (a.Momento==='Almuerzo'?0:1)-(b.Momento==='Almuerzo'?0:1));
    const d=f.slice(8,10), dow=rows[0].DiaSemana||'';
    return `<div class="day"><div class="date"><div class="d">${d}</div><div class="m">${esc(dow.slice(0,3))}</div></div>
      <div class="slots">${rows.map(s=>`<button class="slot" data-act="assign" data-fecha="${esc(s.Fecha)}" data-momento="${esc(s.Momento)}" style="text-align:left;border:1px solid var(--line)">
        <span class="mo ${s.Momento==='Almuerzo'?'alm':'cen'}">${s.Momento==='Almuerzo'?'Alm.':'Cena'}</span>
        <span class="pl ${s.Comida?'':'empty'}">${s.Comida?esc(s.Comida):'Tocar para asignar…'}</span>
        ${s.Cocinero?`<span class="ck">· ${esc(s.Cocinero)}</span>`:''}</button>`).join('')}</div></div>`;
  }).join('');
}

function viewRecetas(){
  return `<div class="card" style="padding:2px 12px">`+ (DATA.Comidas||[]).map(c=>
    `<button class="item" data-act="open" data-comida="${esc(c.Comida)}" style="width:100%;text-align:left;background:none;border:none;border-bottom:1px solid var(--line)">
      <div class="thumb">🍽️</div><div class="it-main"><div class="n">${esc(c.Comida)}</div>
      <div class="q">${esc(c.MomentoSugerido||'')}${c.Cocinero?' · '+esc(c.Cocinero):''}</div></div><span class="chev">›</span></button>`
  ).join('')+`</div>
    <div class="row-btns"><button class="btn solid" data-act="newdish">+ Nueva receta / plato</button></div>`;
}
function viewReceta(name){
  const c=(DATA.Comidas||[]).find(x=>x.Comida===name); if(!c)return 'No encontrada.';
  const rac=raciones(), excl=excludedOf(c), effR=Math.max(0,rac-excl), ing=ingMap();
  const items=(DATA.Recetas||[]).filter(r=>r.Comida===name && num(r.CantidadPorComensal)>0).map(r=>{
    const m=ing[r.Ingrediente]||{Unidad:'g'}; const tot=num(r.CantidadPorComensal)*effR;
    return `<div class="item">
      <div class="it-main"><div class="n">${esc(r.Ingrediente)}${truthy(r.Opcional)?' <span class="chip warm" style="padding:1px 6px">opc.</span>':''}</div>
        <div class="q">${esc(legible(tot,m.Unidad))} en total</div></div>
      <input class="qin" data-recqty data-comida="${esc(name)}" data-ing="${esc(r.Ingrediente)}" type="number" inputmode="decimal" value="${esc(r.CantidadPorComensal)}" aria-label="por comensal">
      <span class="uni">${esc(m.Unidad)}/pers</span>
      <button class="delx" data-act="delitem" data-comida="${esc(name)}" data-ing="${esc(r.Ingrediente)}" aria-label="quitar">×</button>
    </div>`;
  }).join('');
  let gPax=0;
  (DATA.Recetas||[]).filter(r=>r.Comida===name && num(r.CantidadPorComensal)>0).forEach(r=>{
    const m=ing[r.Ingrediente]||{Unidad:'g'}; if(m.Unidad==='g') gPax+=num(r.CantidadPorComensal);
  });
  return `<div>
    <div class="rlabel">Momento</div>
    <div class="seg" style="max-width:280px">${['Almuerzo','Cena'].map(mm=>`<button data-act="setmomento" data-comida="${esc(name)}" data-val="${mm}" class="${c.MomentoSugerido===mm?'on':''}">${mm}</button>`).join('')}</div>
    <div class="rlabel">Cocinero</div>
    <div class="controls"><input id="rc-cocinero" value="${esc(c.Cocinero||'')}" placeholder="Quién cocina" style="flex:1">
      <button class="btn solid" style="width:auto;white-space:nowrap" data-act="setcocinero" data-comida="${esc(name)}">Guardar</button></div>
    ${c.PasosPrevios?`<div class="rlabel">Pasos previos (con antelación)</div><div class="rtext">${esc(c.PasosPrevios)}</div>`:''}
    <div class="rlabel">Preparación</div><div class="rtext" id="prep">${esc(c.Preparacion)}</div>
    <div class="row-btns"><button class="btn" data-act="editprep" data-comida="${esc(name)}">✎ Editar preparación</button></div>
    <div class="rlabel">Enlace de la receta (fuente)</div>
    ${c.Fuente?`<div style="margin:2px 4px 8px"><a href="${esc(c.Fuente)}" target="_blank" rel="noopener">🔗 Abrir receta original</a></div>`:''}
    <div class="controls"><input id="rc-fuente" type="url" inputmode="url" value="${esc(c.Fuente||'')}" placeholder="https://..." style="flex:1">
      <button class="btn solid" style="width:auto;white-space:nowrap" data-act="setfuente" data-comida="${esc(name)}">Guardar</button></div>
    <div class="rlabel">${/ensalada/i.test(name)?'🦗 "De lo que come el grillo, poquillo"':'Personas que no comen de esto'}</div>
    <div class="controls"><input id="rc-grillo" type="number" inputmode="numeric" value="${excl||''}" placeholder="0 (comen todos)" style="flex:1">
      <button class="btn solid" style="width:auto;white-space:nowrap" data-act="setgrillo" data-comida="${esc(name)}">Guardar</button></div>
    <p class="muted small" style="margin:2px 4px 6px">Comensales que apenas/no comen este plato (se restan del total). Ahora lo comen <b>${effR}</b> de ${rac}.</p>
    <div class="rlabel">Ingredientes (edita la cantidad por comensal · total para ${effR} raciones)</div>
    <p class="small" style="margin:-2px 4px 8px;color:${gPax>400?'var(--tomato)':'var(--muted)'}">Total sólido: <b>${fmt(gPax)} g/persona</b>${gPax>400?' ⚠️ te estás pasando':''}<br><span class="muted">Referencia: complemento/guarnición ~100-150 g · plato único ~300-400 g</span></p>
    <div class="card" style="padding:2px 12px">${items||'<div class="item"><div class="it-main muted small">Sin ingredientes.</div></div>'}</div>
    <div class="row-btns"><button class="btn" data-act="additem" data-comida="${esc(name)}">+ Añadir ingrediente / acompañamiento</button></div>
  </div>`;
}

function viewDespensa(){
  const rows=(DATA.Despensa||[]).filter(d=>num(d.Cantidad)>0);
  return `<div class="banner">Lo que apuntes aquí se <b>descuenta</b> de la compra.</div>
    <div class="card" style="padding:2px 12px">${rows.length?rows.map(d=>
      `<div class="item"><div class="thumb">🥫</div><div class="it-main"><div class="n">${esc(d.Ingrediente)}</div>
      <div class="q">${esc(legible(num(d.Cantidad),d.Unidad||'g'))}${d.Notas?' · '+esc(d.Notas):''}</div></div>
      <input class="qin" data-despqty data-ing="${esc(d.Ingrediente)}" type="number" inputmode="decimal" value="${esc(d.Cantidad)}" aria-label="cantidad">
      <span class="uni">${esc(d.Unidad||'g')}</span>
      <button class="delx" data-act="deldesp" data-ing="${esc(d.Ingrediente)}" aria-label="quitar">×</button></div>`
    ).join(''):'<div class="item"><div class="it-main muted small">Despensa vacía.</div></div>'}</div>
    <div class="row-btns"><button class="btn solid" data-act="adddesp">+ Añadir a la despensa</button></div>`;
}

function stepper(clave,label){
  return `<div class="stepper"><span class="ln">${label}</span><span class="ct">
    <button class="rnd" data-act="cfg" data-clave="${clave}" data-delta="-1">−</button>
    <b>${esc(cfg(clave))}</b>
    <button class="rnd" data-act="cfg" data-clave="${clave}" data-delta="1">+</button></span></div>`;
}
function viewAjustes(){
  return `<div class="rlabel">Comensales (afecta al cálculo)</div>
    ${stepper('AdultosM','Adultos ♂')}${stepper('AdultosF','Adultos ♀')}${stepper('Ninos','Niños')}
    <div class="rlabel">Planificador de compras</div>
    <div class="card" style="padding:2px 12px">${compras().map(c=>`<div class="item">
      <div class="thumb">🛒</div><div class="it-main"><div class="n">${esc(c.Fecha)}${hastaOf(c)?' → '+esc(hastaOf(c)):''}</div>
      <div class="q">${esc(c.Etiqueta||'')}${hastaOf(c)?'':' · sin fecha de cobertura'}</div></div>
      <button class="check" style="border:none;background:none;color:var(--olive);width:32px" data-act="editcompra" data-fecha="${esc(c.Fecha)}">✎</button>
      <button class="delx" data-act="delcompra" data-fecha="${esc(c.Fecha)}">×</button>
    </div>`).join('')||'<div class="item"><div class="it-main muted small">Sin compras planificadas.</div></div>'}</div>
    <div class="row-btns"><button class="btn solid" data-act="addcompra">+ Planificar compra</button></div>
    <p class="muted small" style="margin:2px 4px 0">Cada compra cubre desde su fecha hasta la fecha "cubrir hasta". En Comprar → "Por calendario" eliges el tramo.</p>
    <div class="rlabel">Usuarios con acceso</div>
    <div class="card" style="padding:2px 12px">${(DATA.Usuarios||[]).map(u=>`<div class="item"><div class="thumb">👤</div><div class="it-main"><div class="n">${esc(u.Email)}</div>${u.Rol?`<div class="q">${esc(u.Rol)}</div>`:''}</div></div>`).join('')||'<div class="item"><div class="it-main muted small">Sin usuarios.</div></div>'}</div>
    <div class="controls"><input id="u-email" type="email" inputmode="email" placeholder="correo@gmail.com" style="flex:1">
      <button class="btn solid" style="width:auto;white-space:nowrap" data-act="adduser">Añadir</button></div>
    <p class="muted small" style="margin:2px 4px 0">Cualquiera con acceso puede autorizar a más gente (con su Gmail).</p>
    <div class="rlabel">Cuenta</div>
    <div class="card small"><div>Sesión: <b>${esc(userEmail||'—')}</b></div></div>
    <div class="row-btns"><button class="btn" data-act="install">📲 Cómo instalar</button><button class="btn warn" data-act="signout">Cerrar sesión</button></div>
    <p class="muted small" style="margin-top:16px;text-align:center">CompraSanJose · datos en tu Google Sheet</p>`;
}

/* ------------------------------- modal ---------------------------------- */
function openModal(m){ state.modal=m; state.modalHTML=modalHTML(m); render(); }
function closeModal(){ state.modal=null; state.modalHTML=''; render(); }
function modalHTML(m){
  if(m.type==='assign'){
    const comidas=(DATA.Comidas||[]).map(c=>c.Comida);
    const cur=(DATA.Calendario||[]).find(s=>s.Fecha===m.fecha&&s.Momento===m.momento)||{};
    return `<div class="backdrop" data-act="closebg"><div class="sheet">
      <h2>${esc(m.momento)} · ${esc(m.fecha)}</h2>
      <div class="grp"><label>Comida</label><select id="m-comida"><option value="">— Sin asignar —</option>
        ${comidas.map(c=>`<option ${cur.Comida===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="grp"><label>Cocinero</label><input id="m-cocinero" value="${esc(cur.Cocinero||'')}" placeholder="Quién cocina"></div>
      <div class="row-btns"><button class="btn" data-act="closemodal">Cancelar</button>
        <button class="btn solid" data-act="saveassign" data-fecha="${esc(m.fecha)}" data-momento="${esc(m.momento)}">Guardar</button></div>
    </div></div>`;
  }
  if(m.type==='adddesp'){
    return `<div class="backdrop" data-act="closebg"><div class="sheet">
      <h2>Añadir a la despensa</h2>
      <div class="grp"><label>Ingrediente</label><input id="d-nom" placeholder="p. ej. Aceite de oliva"></div>
      <div class="grp"><label>Cantidad</label><input id="d-cant" type="number" inputmode="decimal" placeholder="0"></div>
      <div class="grp"><label>Unidad</label><select id="d-uni"><option>g</option><option>ml</option><option>ud</option></select></div>
      <div class="row-btns"><button class="btn" data-act="closemodal">Cancelar</button>
        <button class="btn solid" data-act="savedesp">Guardar</button></div></div></div>`;
  }
  if(m.type==='compra'){
    const cur=m.fecha?(DATA.Compras||[]).find(c=>c.Fecha===m.fecha):null;
    return `<div class="backdrop" data-act="closebg"><div class="sheet">
      <h2>${m.fecha?'Editar compra':'Planificar compra'}</h2>
      <div class="grp"><label>Fecha de la compra</label><input id="cp-fecha" type="date" value="${esc((cur&&cur.Fecha)||'')}"></div>
      <div class="grp"><label>Cubrir hasta (fecha incluida)</label><input id="cp-hasta" type="date" value="${esc(cur?(hastaOf(cur)||''):'')}"></div>
      <div class="grp"><label>Etiqueta (opcional)</label><input id="cp-et" value="${esc((cur&&cur.Etiqueta)||'')}" placeholder="p. ej. Compra grande, Reposición…"></div>
      <div class="row-btns"><button class="btn" data-act="closemodal">Cancelar</button>
        <button class="btn solid" data-act="savecompra" data-old="${esc(m.fecha||'')}">Guardar</button></div>
    </div></div>`;
  }
  if(m.type==='addmanual'){
    return `<div class="backdrop" data-act="closebg"><div class="sheet">
      <h2>Añadir a ${esc(m.cat)}</h2>
      <div class="grp"><label>Producto</label><input id="am-nom" placeholder="p. ej. Pizza preparada, Papel vegetal…"></div>
      <div class="grp"><label>Cantidad</label><input id="am-cant" type="number" inputmode="decimal" placeholder="1"></div>
      <div class="grp"><label>Unidad</label><select id="am-uni"><option>ud</option><option>g</option><option>kg</option><option>ml</option><option>L</option></select></div>
      <div class="row-btns"><button class="btn" data-act="closemodal">Cancelar</button>
        <button class="btn solid" data-act="savemanual" data-cat="${esc(m.cat)}">Añadir</button></div>
    </div></div>`;
  }
  if(m.type==='ingrinfo'){
    const inc=new Set(includedComidas()); const meta=ingMap()[m.ing]||{Unidad:'g'};
    const rows=(DATA.Recetas||[]).filter(r=>r.Ingrediente===m.ing && inc.has(r.Comida) && num(r.CantidadPorComensal)>0)
      .map(r=>({comida:r.Comida, per:num(r.CantidadPorComensal), tot:num(r.CantidadPorComensal)*racionesDe(r.Comida)}))
      .sort((a,b)=>b.tot-a.tot);
    return `<div class="backdrop" data-act="closebg"><div class="sheet">
      <h2>${esc(m.ing)}</h2><p class="muted small" style="margin:0 4px 10px">Recetas que lo incluyen (selección actual) y su proporción:</p>
      <div class="card" style="padding:2px 12px">${rows.map(r=>`<div class="item"><div class="it-main"><div class="n">${esc(r.comida)}</div><div class="q">${fmt(r.per)} ${esc(meta.Unidad)}/persona</div></div><div class="q">${esc(legible(r.tot,meta.Unidad))}</div></div>`).join('')||'<div class="item"><div class="it-main muted small">No interviene en la selección actual.</div></div>'}</div>
      <div class="row-btns"><button class="btn solid" data-act="closemodal">Cerrar</button></div>
    </div></div>`;
  }
  if(m.type==='addlista'){
    return `<div class="backdrop" data-act="closebg"><div class="sheet">
      <h2>Añadir a ${esc(m.tipo)}</h2>
      <div class="grp"><label>Producto</label><input id="al-nom" placeholder="p. ej. Zumo, Ron, Cerveza sin…"></div>
      <div class="grp"><label>Envase (opcional)</label><input id="al-env" placeholder="p. ej. Botella 1 L, Bolsa, Pack"></div>
      <div class="grp"><label>Cantidad (uds/paquetes)</label><input id="al-cant" type="number" inputmode="numeric" placeholder="1"></div>
      <div class="row-btns"><button class="btn" data-act="closemodal">Cancelar</button>
        <button class="btn solid" data-act="savelista" data-tipo="${esc(m.tipo)}">Añadir</button></div>
    </div></div>`;
  }
  if(m.type==='addbasico'){
    return `<div class="backdrop" data-act="closebg"><div class="sheet">
      <h2>Añadir a básicos (compra única)</h2>
      <div class="grp"><label>Producto</label><input id="ab-nom" placeholder="p. ej. Kétchup, Salsa barbacoa, Tabasco…"></div>
      <div class="grp"><label>Formato (opcional)</label><input id="ab-fmt" placeholder="p. ej. Bote, Botella 500 ml"></div>
      <div class="row-btns"><button class="btn" data-act="closemodal">Cancelar</button>
        <button class="btn solid" data-act="savebasico">Añadir</button></div>
    </div></div>`;
  }
  if(m.type==='newdish'){
    return `<div class="backdrop" data-act="closebg"><div class="sheet">
      <h2>Nueva receta / plato</h2>
      <div class="grp"><label>Nombre del plato</label><input id="nd-nom" placeholder="p. ej. Ensalada mixta"></div>
      <div class="grp"><label>Momento sugerido</label><select id="nd-mom"><option>Almuerzo</option><option>Cena</option></select></div>
      <div class="grp"><label>Cocinero (opcional)</label><input id="nd-coc" placeholder="Quién lo prepara"></div>
      <p class="muted small" style="margin:0 4px 10px">Después le añades ingredientes con "+ Añadir ingrediente".</p>
      <div class="row-btns"><button class="btn" data-act="closemodal">Cancelar</button>
        <button class="btn solid" data-act="savedish">Crear</button></div>
    </div></div>`;
  }
  if(m.type==='confirm'){
    return `<div class="backdrop" data-act="closebg"><div class="sheet">
      <h2>¿Eliminar?</h2><p class="muted" style="margin:0 4px 14px;line-height:1.4">${esc(m.msg)}</p>
      <div class="row-btns"><button class="btn" data-act="closemodal">Cancelar</button>
        <button class="btn warn" data-act="confirmyes">Eliminar</button></div></div></div>`;
  }
  if(m.type==='additem'){
    const cat=(DATA.Ingredientes||[]).map(i=>i.Ingrediente).sort((a,b)=>a.localeCompare(b));
    return `<div class="backdrop" data-act="closebg"><div class="sheet">
      <h2>Añadir a ${esc(m.comida)}</h2>
      <div class="grp"><label>Ingrediente o acompañamiento</label>
        <input id="ai-nom" list="ai-list" placeholder="Escribe o elige (p. ej. Sardinas, Melón, Chistorra…)">
        <datalist id="ai-list">${cat.map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist></div>
      <div class="grp"><label>Cantidad por comensal</label><input id="ai-cant" type="number" inputmode="decimal" placeholder="0"></div>
      <div class="grp"><label>Unidad (solo si es nuevo)</label><select id="ai-uni"><option>g</option><option>ml</option><option>ud</option></select></div>
      <div class="grp"><label>Sección del súper (solo si es nuevo)</label><select id="ai-cat">${CATORDER.map(x=>`<option>${x}</option>`).join('')}</select></div>
      <div class="row-btns"><button class="btn" data-act="closemodal">Cancelar</button>
        <button class="btn solid" data-act="saveitem" data-comida="${esc(m.comida)}">Añadir</button></div>
    </div></div>`;
  }
  if(m.type==='install'){
    return `<div class="backdrop" data-act="closebg"><div class="sheet"><h2>Instalar la app</h2>
      <p class="rlabel">Android (Chrome/Edge)</p><div class="rtext">Menú ⋮ → <b>Añadir a pantalla de inicio</b> / <b>Instalar app</b>.</div>
      <p class="rlabel">iPhone (Safari)</p><div class="rtext">Botón <b>Compartir</b> (cuadro con flecha) → <b>Añadir a pantalla de inicio</b>.</div>
      <div class="row-btns"><button class="btn solid" data-act="closemodal">Entendido</button></div></div></div>`;
  }
  return '';
}

/* ------------------------------ actions --------------------------------- */
document.addEventListener('click',(e)=>{
  const b=e.target.closest('[data-act],[data-sel]'); if(!b)return;
  const sel=b.getAttribute('data-sel');
  if(sel==='mode'){ state.mode=b.getAttribute('data-val'); render(); return; }
  const act=b.getAttribute('data-act');
  if(act==='tab'){ state.tab=b.getAttribute('data-tab'); state.detail=null; render(); }
  else if(act==='back'){ state.detail=null; render(); }
  else if(act==='refresh'){ reload(); }
  else if(act==='open'){ state.detail=b.getAttribute('data-comida'); render(); }
  else if(act==='toggle'){ toggle(b.getAttribute('data-kind'), b.getAttribute('data-key')); }
  else if(act==='assign'){ openModal({type:'assign',fecha:b.getAttribute('data-fecha'),momento:b.getAttribute('data-momento')}); }
  else if(act==='saveassign'){ saveAssign(b.getAttribute('data-fecha'),b.getAttribute('data-momento')); }
  else if(act==='cfg'){ setCfg(b.getAttribute('data-clave'), parseInt(b.getAttribute('data-delta'),10)); }
  else if(act==='adddesp'){ openModal({type:'adddesp'}); }
  else if(act==='savedesp'){ saveDesp(); }
  else if(act==='install'){ openModal({type:'install'}); }
  else if(act==='adduser'){ addUser(); }
  else if(act==='togglecat'){ const k=b.getAttribute('data-key'); state.open[k]=!state.open[k]; render(); }
  else if(act==='editprep'){ editPrep(b.getAttribute('data-comida')); }
  else if(act==='setmomento'){ setMomento(b.getAttribute('data-comida'), b.getAttribute('data-val')); }
  else if(act==='setcocinero'){ setCocinero(b.getAttribute('data-comida')); }
  else if(act==='setfuente'){ setFuente(b.getAttribute('data-comida')); }
  else if(act==='additem'){ openModal({type:'additem',comida:b.getAttribute('data-comida')}); }
  else if(act==='saveitem'){ saveItem(b.getAttribute('data-comida')); }
  else if(act==='newdish'){ openModal({type:'newdish'}); }
  else if(act==='savedish'){ saveDish(); }
  else if(act==='seedsalads'){ seedSalads(); }
  else if(act==='addcompra'){ openModal({type:'compra'}); }
  else if(act==='editcompra'){ openModal({type:'compra',fecha:b.getAttribute('data-fecha')}); }
  else if(act==='savecompra'){ saveCompra(b.getAttribute('data-old')); }
  else if(act==='delcompra'){ const f=b.getAttribute('data-fecha'); askDelete('Eliminar la compra del '+f+'.', ()=>delCompra(f)); }
  else if(act==='addbasico'){ openModal({type:'addbasico'}); }
  else if(act==='savebasico'){ saveBasico(); }
  else if(act==='ingrinfo'){ openModal({type:'ingrinfo',ing:b.getAttribute('data-ing')}); }
  else if(act==='addmanual'){ openModal({type:'addmanual',cat:b.getAttribute('data-cat')}); }
  else if(act==='savemanual'){ saveManual(b.getAttribute('data-cat')); }
  else if(act==='buymanual'){ buyManual(b.getAttribute('data-ing')); }
  else if(act==='delmanual'){ const ig=b.getAttribute('data-ing'); askDelete('Quitar "'+ig+'" de la lista.', ()=>delManual(ig)); }
  else if(act==='buyingr'){ buyIngr(b.getAttribute('data-ing'), num(b.getAttribute('data-buy')), b.getAttribute('data-unit')); }
  else if(act==='dellista'){ const it=b.getAttribute('data-item'); askDelete('Quitar "'+it+'" de la lista.', ()=>delLista(it)); }
  else if(act==='addlista'){ openModal({type:'addlista',tipo:b.getAttribute('data-tipo')}); }
  else if(act==='savelista'){ saveLista(b.getAttribute('data-tipo')); }
  else if(act==='delbasico'){ const it=b.getAttribute('data-item'); askDelete('Quitar "'+it+'" de básicos.', ()=>delBasico(it)); }
  else if(act==='seedpan'){ seedPan(); }
  else if(act==='setgrillo'){ setGrillo(b.getAttribute('data-comida')); }
  else if(act==='delitem'){ const co=b.getAttribute('data-comida'), ig=b.getAttribute('data-ing'); askDelete('Quitar "'+ig+'" de '+co+'.', ()=>setRecetaQty(co,ig,0)); }
  else if(act==='deldesp'){ const ig=b.getAttribute('data-ing'); askDelete('Quitar "'+ig+'" de la despensa.', ()=>delDespensa(ig)); }
  else if(act==='confirmyes'){ const fn=pendingDelete; pendingDelete=null; closeModal(); if(fn)fn(); }
  else if(act==='signout'){ signout(); }
  else if(act==='closemodal'||act==='closebg'){ if(act==='closebg'&&e.target.closest('.sheet'))return; closeModal(); }
});
document.addEventListener('change',(e)=>{
  const s=e.target.closest('[data-sel="tramo"]'); if(s){ state.tramo=s.value; render(); return; }
  const q=e.target.closest('[data-recqty]'); if(q){ setRecetaQty(q.getAttribute('data-comida'), q.getAttribute('data-ing'), q.value); return; }
  const l=e.target.closest('[data-listqty]'); if(l){ setListaPaquetes(l.getAttribute('data-item'), l.value); return; }
  const dq=e.target.closest('[data-despqty]'); if(dq){ setDespensaQty(dq.getAttribute('data-ing'), dq.value); return; }
  const bq=e.target.closest('[data-basqty]'); if(bq){ setBasicoQty(bq.getAttribute('data-item'), bq.value); return; }
  const by=e.target.closest('[data-buyqty]'); if(by){ setBuyQty(by.getAttribute('data-ing'), by.value, num(by.getAttribute('data-need'))); }
  const mq=e.target.closest('[data-manqty]'); if(mq){ setManualQty(mq.getAttribute('data-ing'), mq.value); return; }
});

function toggle(kind,key){
  if(kind==='ingr'){
    const row=(DATA.ListaCompra||[]).find(r=>r.Ingrediente===key);
    const val=row?!truthy(row.Comprado):true;
    if(row){ row.Comprado=val?'Si':'No'; } else { (DATA.ListaCompra=DATA.ListaCompra||[]).push({Ingrediente:key,Comprado:'Si'}); }
    apiWrite({action:'update',sheet:'ListaCompra',match:{Ingrediente:key},set:{Comprado:val?'Si':'No'},appendIfMissing:true,appendRow:{Ingrediente:key,Comprado:'Si'}});
  } else if(kind==='basico'){
    const row=(DATA.Basicos||[]).find(r=>r.Item===key); const val=!truthy(row.Comprado); row.Comprado=val?'Si':'No';
    apiWrite({action:'update',sheet:'Basicos',match:{Item:key},set:{Comprado:val?'Si':'No'}});
  } else if(kind==='lista'){
    const row=(DATA.ListasAbiertas||[]).find(r=>r.Item===key); const val=!truthy(row.Comprado); row.Comprado=val?'Si':'No';
    apiWrite({action:'update',sheet:'ListasAbiertas',match:{Item:key},set:{Comprado:val?'Si':'No'}});
  }
  render();
}
function saveAssign(fecha,momento){
  const comida=$('#m-comida').value, cocinero=$('#m-cocinero').value;
  const row=(DATA.Calendario||[]).find(s=>s.Fecha===fecha&&s.Momento===momento);
  if(row){ row.Comida=comida; row.Cocinero=cocinero; }
  apiWrite({action:'update',sheet:'Calendario',match:{Fecha:fecha,Momento:momento},set:{Comida:comida,Cocinero:cocinero}});
  closeModal(); toast('Guardado');
}
function setCfg(clave,delta){
  const row=(DATA.Config||[]).find(x=>x.Clave===clave); if(!row)return;
  let v=Math.max(0, num(row.Valor)+delta); row.Valor=String(v);
  apiWrite({action:'update',sheet:'Config',match:{Clave:clave},set:{Valor:String(v)}});
  render();
}
function saveDesp(){
  const nom=$('#d-nom').value.trim(); if(!nom){toast('Pon un nombre');return;}
  const cant=$('#d-cant').value||'0', uni=$('#d-uni').value;
  (DATA.Despensa=DATA.Despensa||[]).push({Ingrediente:nom,Cantidad:cant,Unidad:uni,Notas:''});
  apiWrite({action:'append',sheet:'Despensa',row:{Ingrediente:nom,Cantidad:cant,Unidad:uni,Notas:''}});
  closeModal(); toast('Añadido');
}
function editPrep(name){
  const cur=(DATA.Comidas||[]).find(x=>x.Comida===name); if(!cur)return;
  const box=$('#prep'); if(!box)return;
  if(box.dataset.editing){ // guardar
    const val=box.querySelector('textarea').value; cur.Preparacion=val; delete box.dataset.editing;
    apiWrite({action:'update',sheet:'Comidas',match:{Comida:name},set:{Preparacion:val}}); render(); toast('Guardado');
  } else {
    box.dataset.editing='1'; box.innerHTML=`<textarea rows="10" style="width:100%">${esc(cur.Preparacion)}</textarea>`;
  }
}
function addUser(){
  const email=(($('#u-email')||{}).value||'').trim().toLowerCase();
  if(!email || email.indexOf('@')<1){ toast('Correo no válido'); return; }
  if((DATA.Usuarios||[]).some(u=>String(u.Email).trim().toLowerCase()===email)){ toast('Ya tiene acceso'); return; }
  (DATA.Usuarios=DATA.Usuarios||[]).push({Email:email,Proveedor:'Google',Rol:'invitado'});
  apiWrite({action:'append',sheet:'Usuarios',row:{Email:email,Proveedor:'Google',Rol:'invitado'}});
  render(); toast('Autorizado: '+email);
}
function setMomento(name,val){
  const c=(DATA.Comidas||[]).find(x=>x.Comida===name); if(!c)return;
  c.MomentoSugerido=val;
  apiWrite({action:'update',sheet:'Comidas',match:{Comida:name},set:{MomentoSugerido:val}});
  render(); toast('Momento: '+val);
}
function setCocinero(name){
  const v=((($('#rc-cocinero')||{}).value)||'').trim();
  const c=(DATA.Comidas||[]).find(x=>x.Comida===name); if(!c)return;
  c.Cocinero=v;
  apiWrite({action:'update',sheet:'Comidas',match:{Comida:name},set:{Cocinero:v}});
  render(); toast('Cocinero guardado');
}
function setBuyQty(name,val,need){
  const T=num(val), extra=Math.max(0, Math.round((T-need)*100)/100);
  const r=(DATA.ListaCompra||[]).find(x=>x.Ingrediente===name);
  let notes=r? String(r.Notas||'').replace(/\s*extra=[\d.]+/ig,'').trim() : '';
  if(extra>0) notes=(notes?notes+' ':'')+'extra='+extra;
  if(r){ r.Notas=notes; }
  apiWrite({action:'update',sheet:'ListaCompra',match:{Ingrediente:name},set:{Notas:notes},appendIfMissing:true,appendRow:{Ingrediente:name,Comprado:'No',Notas:notes}});
  render();
}
function buyIngr(name,buy,unit){
  if(!(buy>0)) return;
  const d=(DATA.Despensa||[]).find(x=>x.Ingrediente===name);
  if(d){ d.Cantidad=String(Math.round((num(d.Cantidad)+buy)*100)/100); apiWrite({action:'update',sheet:'Despensa',match:{Ingrediente:name},set:{Cantidad:d.Cantidad}}); }
  else { const row={Ingrediente:name,Cantidad:String(buy),Unidad:unit,Notas:'comprado'}; (DATA.Despensa=DATA.Despensa||[]).push(row); apiWrite({action:'append',sheet:'Despensa',row:row}); }
  const lc=(DATA.ListaCompra||[]).find(x=>x.Ingrediente===name); // limpia 'extra' para que no se re-sume al añadir comidas después
  if(lc && /extra=/i.test(lc.Notas||'')){ lc.Notas=String(lc.Notas).replace(/\s*extra=[\d.]+/ig,'').trim(); apiWrite({action:'update',sheet:'ListaCompra',match:{Ingrediente:name},set:{Notas:lc.Notas}}); }
  render(); toast('✓ '+name+' → despensa');
}
function saveManual(cat){
  const nom=((($('#am-nom')||{}).value)||'').trim(); if(!nom){ toast('Pon un producto'); return; }
  const cant=String(Math.max(0,num((($('#am-cant')||{}).value)||0))), uni=(($('#am-uni')||{}).value)||'ud';
  const ex=(DATA.ListaCompra||[]).find(x=>x.Ingrediente===nom);
  if(ex){ Object.assign(ex,{Categoria:cat,Cantidad:cant,Unidad:uni,Notas:'manual'});
    apiWrite({action:'update',sheet:'ListaCompra',match:{Ingrediente:nom},set:{Categoria:cat,Cantidad:cant,Unidad:uni,Notas:'manual'}}); }
  else { const row={Categoria:cat,Ingrediente:nom,Cantidad:cant,Unidad:uni,CantidadLegible:'',Comprado:'No',Notas:'manual'};
    (DATA.ListaCompra=DATA.ListaCompra||[]).push(row); apiWrite({action:'append',sheet:'ListaCompra',row:row}); }
  closeModal(); render(); toast('Añadido: '+nom);
}
function setManualQty(ing,val){
  const v=Math.max(0,num(val)); const r=(DATA.ListaCompra||[]).find(x=>x.Ingrediente===ing); if(!r)return;
  r.Cantidad=String(v); apiWrite({action:'update',sheet:'ListaCompra',match:{Ingrediente:ing},set:{Cantidad:String(v)}}); render();
}
function buyManual(ing){
  const r=(DATA.ListaCompra||[]).find(x=>x.Ingrediente===ing); if(!r)return;
  const q=num(r.Cantidad), u=r.Unidad||'ud'; if(!(q>0)) return;
  r.Cantidad='0'; apiWrite({action:'update',sheet:'ListaCompra',match:{Ingrediente:ing},set:{Cantidad:'0'}});
  buyIngr(ing,q,u); // suma a despensa (y así resta de recetas con ese ingrediente)
}
function delManual(ing){
  const r=(DATA.ListaCompra||[]).find(x=>x.Ingrediente===ing); if(!r)return;
  r.Ingrediente=''; apiWrite({action:'update',sheet:'ListaCompra',match:{Ingrediente:ing},set:{Ingrediente:''}}); render(); toast('Quitado');
}
function delLista(item){
  const r=(DATA.ListasAbiertas||[]).find(x=>x.Item===item); if(!r)return;
  r.Item=''; apiWrite({action:'update',sheet:'ListasAbiertas',match:{Item:item},set:{Item:''}}); render(); toast('Quitado');
}
function setListaPaquetes(item,val){
  const v=Math.max(0,Math.round(num(val)));
  const r=(DATA.ListasAbiertas||[]).find(x=>x.Item===item); if(!r)return;
  r.Paquetes=String(v);
  apiWrite({action:'update',sheet:'ListasAbiertas',match:{Item:item},set:{Paquetes:String(v)}});
  render();
}
function excludedOf(c){ const m=/excluidos=(\d+)/i.exec((c&&c.Notas)||''); return m?parseInt(m[1],10):0; }
function racionesDe(comida){ const c=(DATA.Comidas||[]).find(x=>x.Comida===comida); const e=c?excludedOf(c):0; return Math.max(0, raciones()-e); }
function setGrillo(name){
  const val=((($('#rc-grillo')||{}).value)||'').trim();
  const c=(DATA.Comidas||[]).find(x=>x.Comida===name); if(!c)return;
  let notes=String(c.Notas||'').replace(/\s*excluidos=\d+/ig,'').trim();
  const e=Math.max(0,Math.round(num(val)));
  if(e>0){ notes=(notes?notes+' ':'')+'excluidos='+e; }
  c.Notas=notes;
  apiWrite({action:'update',sheet:'Comidas',match:{Comida:name},set:{Notas:notes}});
  render(); toast(e>0?('Restados '+e+' comensales'):'Lo comen todos');
}
async function seedSalads(){
  const SEED_ING=[['Pepino','Fruteria','g'],['Atun','Despensa','g'],['Pasta','Despensa','g']];
  const SEED=[
    ['Ensalada mixta','Almuerzo',[['Lechuga',40],['Tomate',60],['Cebolla',15],['Pepino',30],['Zanahoria',15],['Aceitunas negras',10],['Atun',25],['Lata de maiz',15]]],
    ['Ensalada de pasta','Almuerzo',[['Pasta',60],['Tomate',30],['Lata de maiz',20],['Atun',30],['Aceitunas negras',10],['Huevo',0.5],['Cebolla',10]]],
    ['Ensalada campera','Almuerzo',[['Patata',120],['Tomate',60],['Cebolla',20],['Pimiento verde',20],['Atun',30],['Huevo',0.5],['Aceitunas negras',15]]],
    ['Ensalada de verano','Almuerzo',[['Patata',120],['Tomate',60],['Pimiento verde',30],['Cebolla',15],['Atun',30]]]
  ];
  toast('Creando ensaladas…');
  for(const [nom,cat,uni] of SEED_ING){
    if(!(DATA.Ingredientes||[]).some(i=>i.Ingrediente===nom)){
      const row={Ingrediente:nom,Categoria:cat,Unidad:uni,EsBasico:'No',ListaBasico:''};
      (DATA.Ingredientes=DATA.Ingredientes||[]).push(row);
      await apiWrite({action:'append',sheet:'Ingredientes',row:row});
    }
  }
  for(const [com,mom,ings] of SEED){
    if(!(DATA.Comidas||[]).some(c=>c.Comida===com)){
      const drow={Comida:com,MomentoSugerido:mom,Cocinero:'',PasosPrevios:'',Preparacion:'Trocea y mezcla los ingredientes. Alina con AOVE, vinagre y sal al gusto. Sirve fria.',Fuente:'',Notas:''};
      (DATA.Comidas=DATA.Comidas||[]).push(drow);
      await apiWrite({action:'append',sheet:'Comidas',row:drow});
    }
    for(const [ing,g] of ings){
      if(!(DATA.Recetas||[]).some(r=>r.Comida===com&&r.Ingrediente===ing)){
        const rr={Comida:com,Ingrediente:ing,CantidadPorComensal:String(g),Grupo:'',PesoEnGrupo:'',Opcional:'No'};
        (DATA.Recetas=DATA.Recetas||[]).push(rr);
        await apiWrite({action:'append',sheet:'Recetas',row:rr});
      }
    }
  }
  render(); toast('Ensaladas creadas ✅');
}
function saveCompra(oldFecha){
  const fecha=((($('#cp-fecha')||{}).value)||'').trim(); if(!fecha){ toast('Pon la fecha de compra'); return; }
  const hasta=((($('#cp-hasta')||{}).value)||'').trim();
  const et=((($('#cp-et')||{}).value)||'').trim();
  if(oldFecha){
    const c=(DATA.Compras||[]).find(x=>x.Fecha===oldFecha);
    if(c){ c.Fecha=fecha; c.Etiqueta=et; c.Notas=hasta; }
    apiWrite({action:'update',sheet:'Compras',match:{Fecha:oldFecha},set:{Fecha:fecha,Etiqueta:et,Notas:hasta}});
  } else {
    const row={Fecha:fecha,Etiqueta:et,Notas:hasta};
    (DATA.Compras=DATA.Compras||[]).push(row);
    apiWrite({action:'append',sheet:'Compras',row:row});
  }
  closeModal(); toast('Compra guardada');
}
function delCompra(fecha){
  const c=(DATA.Compras||[]).find(x=>x.Fecha===fecha); if(!c)return;
  c.Fecha='';
  apiWrite({action:'update',sheet:'Compras',match:{Fecha:fecha},set:{Fecha:''}});
  render(); toast('Compra eliminada');
}
function saveLista(tipo){
  const nom=((($('#al-nom')||{}).value)||'').trim(); if(!nom){ toast('Pon un nombre'); return; }
  const env=((($('#al-env')||{}).value)||'').trim();
  const cant=String(Math.max(1,Math.round(num((($('#al-cant')||{}).value)||1))));
  const ex=(DATA.ListasAbiertas||[]).find(r=>r.Item===nom);
  if(ex){ ex.Tipo=tipo; ex.Paquetes=cant; if(env)ex.Envase=env; apiWrite({action:'update',sheet:'ListasAbiertas',match:{Item:nom},set:{Tipo:tipo,Paquetes:cant,Envase:env}}); }
  else { const row={Tipo:tipo,Item:nom,Envase:env,TamanoEnvase:'',Unidad:'',ConsumoPersonaDia:'',Paquetes:cant,Comprado:'No'};
    (DATA.ListasAbiertas=DATA.ListasAbiertas||[]).push(row); apiWrite({action:'append',sheet:'ListasAbiertas',row:row}); }
  closeModal(); toast('Añadido');
}
function setDespensaQty(ing,val){
  const v=num(val); const d=(DATA.Despensa||[]).find(x=>x.Ingrediente===ing); if(!d)return;
  d.Cantidad=String(v); apiWrite({action:'update',sheet:'Despensa',match:{Ingrediente:ing},set:{Cantidad:String(v)}}); render();
}
function basQty(fmt){ const m=/^(\d+)\b/.exec(String(fmt||'').trim()); return m?m[1]:'1'; }
function basFmt(fmt){ return String(fmt||'').trim().replace(/^\d+\s*/,''); }
function setBasicoQty(item,val){
  const n=Math.max(0,Math.round(num(val)));
  const b=(DATA.Basicos||[]).find(x=>x.Item===item); if(!b)return;
  b.Formato=(n+' '+basFmt(b.Formato)).trim();
  apiWrite({action:'update',sheet:'Basicos',match:{Item:item},set:{Formato:b.Formato}}); render();
}
function delBasico(item){
  const b=(DATA.Basicos||[]).find(x=>x.Item===item); if(!b)return;
  b.Item=''; apiWrite({action:'update',sheet:'Basicos',match:{Item:item},set:{Item:''}}); render(); toast('Quitado de básicos');
}
function saveBasico(){
  const nom=((($('#ab-nom')||{}).value)||'').trim(); if(!nom){ toast('Pon un nombre'); return; }
  if((DATA.Basicos||[]).some(b=>b.Item===nom)){ toast('Ya está en básicos'); closeModal(); return; }
  const fmt=((($('#ab-fmt')||{}).value)||'').trim();
  const row={Item:nom,Lista:'Cocina',Formato:fmt,Comprado:'No'};
  (DATA.Basicos=DATA.Basicos||[]).push(row);
  apiWrite({action:'append',sheet:'Basicos',row:row});
  closeModal(); toast('Añadido a básicos');
}
async function seedPan(){
  toast('Aplicando pan…');
  const set=[['Barbacoa 1',100],['Barbacoa 2',100],['Plato alpujarreno con huevos',50],['Pisto de verduras con huevos',100]];
  for(const [com,g] of set){
    const r=(DATA.Recetas||[]).find(x=>x.Comida===com&&x.Ingrediente==='Pan');
    if(r){ r.CantidadPorComensal=String(g); await apiWrite({action:'update',sheet:'Recetas',match:{Comida:com,Ingrediente:'Pan'},set:{CantidadPorComensal:String(g)}}); }
    else { const rr={Comida:com,Ingrediente:'Pan',CantidadPorComensal:String(g),Grupo:'',PesoEnGrupo:'',Opcional:'No'}; (DATA.Recetas=DATA.Recetas||[]).push(rr); await apiWrite({action:'append',sheet:'Recetas',row:rr}); }
  }
  render(); toast('Pan aplicado ✅');
}
async function seedMigas(){
  const newIng=[['Semola','Despensa','g'],['Sardinas','Pescaderia','g'],['Melon','Fruteria','g']];
  for(const [nom,cat,uni] of newIng){
    if(!(DATA.Ingredientes||[]).some(i=>i.Ingrediente===nom)){
      const row={Ingrediente:nom,Categoria:cat,Unidad:uni,EsBasico:'No',ListaBasico:''};
      (DATA.Ingredientes=DATA.Ingredientes||[]).push(row); await apiWrite({action:'append',sheet:'Ingredientes',row:row});
    }
  }
  const pan=(DATA.Recetas||[]).find(r=>r.Comida==='Migas'&&r.Ingrediente==='Pan del dia anterior');
  if(pan && num(pan.CantidadPorComensal)>0){ pan.CantidadPorComensal='0'; await apiWrite({action:'update',sheet:'Recetas',match:{Comida:'Migas',Ingrediente:'Pan del dia anterior'},set:{CantidadPorComensal:'0'}}); }
  const comp=[['Semola',100,'No'],['Pimiento verde',40,'No'],['Chistorra',40,'Si'],['Sardinas',60,'Si'],['Boquerones',60,'Si'],['Melon',80,'Si']];
  for(const [ing,g,opc] of comp){
    const r=(DATA.Recetas||[]).find(x=>x.Comida==='Migas'&&x.Ingrediente===ing);
    if(r){ r.CantidadPorComensal=String(g); r.Opcional=opc; await apiWrite({action:'update',sheet:'Recetas',match:{Comida:'Migas',Ingrediente:ing},set:{CantidadPorComensal:String(g),Opcional:opc}}); }
    else { const rr={Comida:'Migas',Ingrediente:ing,CantidadPorComensal:String(g),Grupo:'',PesoEnGrupo:'',Opcional:opc}; (DATA.Recetas=DATA.Recetas||[]).push(rr); await apiWrite({action:'append',sheet:'Recetas',row:rr}); }
  }
}
async function seedMousaka(){
  if(!(DATA.Ingredientes||[]).some(i=>i.Ingrediente==='Bechamel en brick')){
    const row={Ingrediente:'Bechamel en brick',Categoria:'Lacteos',Unidad:'g',EsBasico:'No',ListaBasico:''};
    (DATA.Ingredientes=DATA.Ingredientes||[]).push(row); await apiWrite({action:'append',sheet:'Ingredientes',row:row});
  }
  for(const ing of ['Leche','Mantequilla']){
    const r=(DATA.Recetas||[]).find(x=>x.Comida==='Mousaka griega'&&x.Ingrediente===ing);
    if(r && num(r.CantidadPorComensal)>0){ r.CantidadPorComensal='0'; await apiWrite({action:'update',sheet:'Recetas',match:{Comida:'Mousaka griega',Ingrediente:ing},set:{CantidadPorComensal:'0'}}); }
  }
  const adj=[['Bechamel en brick',120],['Berenjena',180],['Carne picada de ternera',140]];
  for(const [ing,g] of adj){
    const r=(DATA.Recetas||[]).find(x=>x.Comida==='Mousaka griega'&&x.Ingrediente===ing);
    if(r){ r.CantidadPorComensal=String(g); await apiWrite({action:'update',sheet:'Recetas',match:{Comida:'Mousaka griega',Ingrediente:ing},set:{CantidadPorComensal:String(g)}}); }
    else { const rr={Comida:'Mousaka griega',Ingrediente:ing,CantidadPorComensal:String(g),Grupo:'',PesoEnGrupo:'',Opcional:'No'}; (DATA.Recetas=DATA.Recetas||[]).push(rr); await apiWrite({action:'append',sheet:'Recetas',row:rr}); }
  }
}
async function seedProporciones(){
  const upd=[
    ['Arroz campero','Arroz',85],['Arroz campero','Aguja de vaca',130],
    ['Mousaka griega','Berenjena',150],
    ['Couscous','Semola couscous',70],
    ['Plato alpujarreno con huevos','Chorizo',40],['Plato alpujarreno con huevos','Longaniza',30],['Plato alpujarreno con huevos','Lomo de cerdo',60],
    ['Salmorejo con acompanamiento','Filetes de ternera',150],['Salmorejo con acompanamiento','Pan',50],
    ['Migas','Sardinas',40],['Migas','Boquerones',40],['Migas','Chistorra',30],
    ['Chili con carne','Arroz',50],['Chili con carne','Tomate natural',100],
    ['Pizzas','Masa de pizza',200],
    ['Paella de marisco','Arroz',90]
  ];
  for(const [com,ing,g] of upd){
    const r=(DATA.Recetas||[]).find(x=>x.Comida===com&&x.Ingrediente===ing);
    if(r){ r.CantidadPorComensal=String(g); await apiWrite({action:'update',sheet:'Recetas',match:{Comida:com,Ingrediente:ing},set:{CantidadPorComensal:String(g)}}); }
  }
}
async function seedV4(){
  const bebidas=[['Bebidas','Ron','Botella 1 L',2],['Bebidas','Whisky','Botella 1 L',1],['Bebidas','Lima','Malla',3],['Bebidas','Hierbabuena','Manojo',3]];
  for(const [tipo,item,env,paq] of bebidas){
    if(!(DATA.ListasAbiertas||[]).some(r=>r.Item===item)){
      const row={Tipo:tipo,Item:item,Envase:env,TamanoEnvase:'',Unidad:'',ConsumoPersonaDia:'',Paquetes:String(paq),Comprado:'No'};
      (DATA.ListasAbiertas=DATA.ListasAbiertas||[]).push(row); await apiWrite({action:'append',sheet:'ListasAbiertas',row:row});
    }
  }
  const alt=(DATA.ListasAbiertas||[]).find(r=>r.Item==='Altramuces');
  if(alt){ alt.Item=''; await apiWrite({action:'update',sheet:'ListasAbiertas',match:{Item:'Altramuces'},set:{Item:''}}); }
  const NEW='Aceite de Oliva Virgen Extra';
  if((DATA.Ingredientes||[]).some(i=>i.Ingrediente==='AOVE')){ (DATA.Ingredientes||[]).forEach(i=>{ if(i.Ingrediente==='AOVE')i.Ingrediente=NEW; }); await apiWrite({action:'update',sheet:'Ingredientes',match:{Ingrediente:'AOVE'},set:{Ingrediente:NEW}}); }
  if((DATA.Basicos||[]).some(b=>b.Item==='AOVE')){ (DATA.Basicos||[]).forEach(b=>{ if(b.Item==='AOVE')b.Item=NEW; }); await apiWrite({action:'update',sheet:'Basicos',match:{Item:'AOVE'},set:{Item:NEW}}); }
  if((DATA.Recetas||[]).some(r=>r.Ingrediente==='AOVE')){ (DATA.Recetas||[]).forEach(r=>{ if(r.Ingrediente==='AOVE')r.Ingrediente=NEW; }); await apiWrite({action:'update',sheet:'Recetas',match:{Ingrediente:'AOVE'},set:{Ingrediente:NEW}}); }
  const newIng=[['Vinagre de Modena','Despensa','ml'],['Queso feta','Lacteos','g'],['Nueces','Despensa','g']];
  for(const [nom,cat,uni] of newIng){
    if(!(DATA.Ingredientes||[]).some(i=>i.Ingrediente===nom)){
      const row={Ingrediente:nom,Categoria:cat,Unidad:uni,EsBasico:'No',ListaBasico:''};
      (DATA.Ingredientes=DATA.Ingredientes||[]).push(row); await apiWrite({action:'append',sheet:'Ingredientes',row:row});
    }
  }
  for(const salad of ['Ensalada mixta','Ensalada de verano']){
    for(const [ing,g] of [['Vinagre de Modena',5],['Queso feta',25],['Nueces',15]]){
      if(!(DATA.Recetas||[]).some(r=>r.Comida===salad&&r.Ingrediente===ing)){
        const rr={Comida:salad,Ingrediente:ing,CantidadPorComensal:String(g),Grupo:'',PesoEnGrupo:'',Opcional:'Si'};
        (DATA.Recetas=DATA.Recetas||[]).push(rr); await apiWrite({action:'append',sheet:'Recetas',row:rr});
      }
    }
  }
}
function maybeSeed(){
  if(bootSeeded) return; bootSeeded=true;
  if((userEmail||'').toLowerCase()!=='francisco.m.garcia@gmail.com') return;
  const done=(DATA.Config||[]).some(c=>c.Clave==='SemillaV7' && truthy(c.Valor));
  if(done) return;
  seedInitial();
}
async function seedInitial(){
  try{
    const has=k=>(DATA.Config||[]).some(c=>c.Clave===k && truthy(c.Valor));
    const flag=async(k,desc)=>{ const r={Clave:k,Valor:'1',Descripcion:desc}; (DATA.Config=DATA.Config||[]).push(r); await apiWrite({action:'append',sheet:'Config',row:r}); };
    if(!has('SemillaV5')){
      await seedSalads(); await seedPan(); await seedMigas(); await seedMousaka(); await seedProporciones(); await seedV4();
      await flag('SemillaV5','Ensaladas, pan, migas, mousaka, proporciones, mojitos y AOVE');
    }
    if(!has('SemillaV6')){ await seedV6(); await flag('SemillaV6','Precocinados (a 0) y cerveza por cajas'); }
    if(!has('SemillaV7')){ await seedV7(); await flag('SemillaV7','Helados a Congelados'); }
    render(); toast('Ajustes aplicados ✅');
  }catch(e){}
}
async function seedV6(){
  const pre=[['Pizza preparada','Precocinados','ud'],['Tortilla de patatas preparada','Precocinados','ud'],['Helados','Congelados','ud']];
  for(const p of pre){
    if(!(DATA.ListaCompra||[]).some(r=>r.Ingrediente===p[0])){
      const row={Categoria:p[1],Ingrediente:p[0],Cantidad:'0',Unidad:p[2],CantidadLegible:'',Comprado:'No',Notas:'manual'};
      (DATA.ListaCompra=DATA.ListaCompra||[]).push(row); await apiWrite({action:'append',sheet:'ListaCompra',row:row});
    }
  }
  const cz=(DATA.ListasAbiertas||[]).find(r=>/cerveza/i.test(r.Item||''));
  if(cz && !/caja/i.test(cz.Envase||'')){ cz.Envase='caja (24 latas)';
    await apiWrite({action:'update',sheet:'ListasAbiertas',match:{Item:cz.Item},set:{Envase:'caja (24 latas)'}}); }
}
async function seedV7(){
  const h=(DATA.ListaCompra||[]).find(r=>r.Ingrediente==='Helados');
  if(h && h.Categoria!=='Congelados'){ h.Categoria='Congelados';
    await apiWrite({action:'update',sheet:'ListaCompra',match:{Ingrediente:'Helados'},set:{Categoria:'Congelados'}}); }
}
function saveDish(){
  const nom=((($('#nd-nom')||{}).value)||'').trim(); if(!nom){ toast('Pon un nombre'); return; }
  if((DATA.Comidas||[]).some(c=>c.Comida===nom)){ toast('Ya existe ese plato'); return; }
  const mom=(($('#nd-mom')||{}).value)||'Almuerzo', coc=((($('#nd-coc')||{}).value)||'').trim();
  const row={Comida:nom,MomentoSugerido:mom,Cocinero:coc,PasosPrevios:'',Preparacion:'',Fuente:'',Notas:''};
  (DATA.Comidas=DATA.Comidas||[]).push(row);
  apiWrite({action:'append',sheet:'Comidas',row:row});
  state.modal=null; state.modalHTML=''; state.detail=nom; state.tab='recetas'; render(); toast('Creado: '+nom);
}
function askDelete(msg, fn){ pendingDelete=fn; openModal({type:'confirm',msg:msg}); }
function delDespensa(ing){
  const d=(DATA.Despensa||[]).find(x=>x.Ingrediente===ing); if(!d)return;
  d.Cantidad='0';
  apiWrite({action:'update',sheet:'Despensa',match:{Ingrediente:ing},set:{Cantidad:'0'}});
  render(); toast('Quitado de la despensa');
}
function setRecetaQty(comida,ing,val){
  const v=num(val);
  const r=(DATA.Recetas||[]).find(x=>x.Comida===comida&&x.Ingrediente===ing); if(!r)return;
  r.CantidadPorComensal=String(v);
  apiWrite({action:'update',sheet:'Recetas',match:{Comida:comida,Ingrediente:ing},set:{CantidadPorComensal:String(v)}});
  render();
}
function saveItem(comida){
  const nom=((($('#ai-nom')||{}).value)||'').trim(); if(!nom){ toast('Escribe un ingrediente'); return; }
  const cant=String(num((($('#ai-cant')||{}).value)||0));
  if(!(DATA.Ingredientes||[]).some(i=>i.Ingrediente===nom)){
    const uni=(($('#ai-uni')||{}).value)||'g', cat=(($('#ai-cat')||{}).value)||'Despensa';
    (DATA.Ingredientes=DATA.Ingredientes||[]).push({Ingrediente:nom,Categoria:cat,Unidad:uni,EsBasico:'No',ListaBasico:''});
    apiWrite({action:'append',sheet:'Ingredientes',row:{Ingrediente:nom,Categoria:cat,Unidad:uni,EsBasico:'No',ListaBasico:''}});
  }
  const r=(DATA.Recetas||[]).find(x=>x.Comida===comida&&x.Ingrediente===nom);
  if(r){ r.CantidadPorComensal=cant; apiWrite({action:'update',sheet:'Recetas',match:{Comida:comida,Ingrediente:nom},set:{CantidadPorComensal:cant}}); }
  else { const row={Comida:comida,Ingrediente:nom,CantidadPorComensal:cant,Grupo:'',PesoEnGrupo:'',Opcional:'No'};
    (DATA.Recetas=DATA.Recetas||[]).push(row); apiWrite({action:'append',sheet:'Recetas',row:row}); }
  closeModal(); toast('Añadido: '+nom);
}
function setFuente(name){
  const v=((($('#rc-fuente')||{}).value)||'').trim();
  const c=(DATA.Comidas||[]).find(x=>x.Comida===name); if(!c)return;
  c.Fuente=v;
  apiWrite({action:'update',sheet:'Comidas',match:{Comida:name},set:{Fuente:v}});
  render(); toast('Enlace guardado');
}
function signout(){ try{ google.accounts.id.disableAutoSelect(); }catch(e){} idToken=null; DATA=null; bootLogin(); }

/* ------------------------------- boot ----------------------------------- */
async function reload(){
  try{
    const res = await apiRead();
    if(res && res.ok === false){
      $('#app').innerHTML=`<div class="center"><div class="brand">Compra<em>SanJose</em></div>
        <p>Tu correo <b>${esc(userEmail||'')}</b> aún no tiene acceso.<br>Pide a alguien del grupo que te añada en Ajustes → Usuarios.</p>
        <button class="btn" style="max-width:240px" data-act="signout">Cambiar de cuenta</button></div>`;
      return;
    }
    DATA = (res && res.data) ? res.data : res;   // el backend envuelve en {ok,data}
    render();
    maybeSeed();
  }
  catch(err){ $('#app').innerHTML=`<div class="center"><div class="brand">Compra<em>SanJose</em></div>
    <p>No se pudieron cargar los datos.<br>Puede que tu sesión haya caducado.</p>
    <button class="btn solid" style="max-width:220px" onclick="bootLogin()">Reintentar / entrar</button></div>`; }
}
function onCred(resp){ idToken=resp.credential; userEmail=jwtEmail(idToken);
  $('#app').innerHTML=`<div class="center"><div class="spinner"></div><p class="muted">Entrando…</p></div>`; reload(); }

function bootLogin(){
  const app=$('#app');
  app.innerHTML=`<div class="center"><div class="brand">Compra<em>SanJose</em></div>
    <p>Lista de la compra y menú del grupo. Entra con tu cuenta de Google del grupo.</p>
    <div id="gbtn"></div><p class="muted small">Solo pueden entrar los correos autorizados.</p></div>`;
  waitGIS(()=>{
    google.accounts.id.initialize({client_id:CLIENT_ID, callback:onCred, auto_select:true});
    google.accounts.id.renderButton($('#gbtn'),{theme:'filled_blue',size:'large',text:'continue_with',shape:'pill'});
    google.accounts.id.prompt();
  });
}
function waitGIS(cb,n=0){ if(window.google&&google.accounts&&google.accounts.id) return cb();
  if(n>50) return; setTimeout(()=>waitGIS(cb,n+1),100); }

function init(){
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
  if(!CLIENT_ID || !BACKEND_URL){
    $('#app').innerHTML=`<div class="center"><div class="brand">Compra<em>SanJose</em></div>
      <p>La app está publicada pero <b>falta el paso de configuración</b> (login Google + backend).</p>
      <p class="muted small">Sigue <b>docs/DESPLIEGUE.md</b>: crea el ID de Google y despliega el Apps Script, y pásame las dos claves para activarla.</p></div>`;
    return;
  }
  bootLogin();
}
window.addEventListener('DOMContentLoaded', init);
window.bootLogin=bootLogin;
