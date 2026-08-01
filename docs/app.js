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
let state = { tab:'comprar', detail:null, modal:null, mode:'catalogo', tramo:'todo' };
let _cb = 0;

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
function compras(){ return (DATA.Compras||[]).slice().sort((a,b)=>String(a.Fecha).localeCompare(String(b.Fecha))); }
function tramoWindow(){
  if(state.tramo==='todo') return [null,null];
  const cs=compras(); const i=cs.findIndex(c=>c.Fecha===state.tramo);
  if(i<0) return [null,null];
  return [cs[i].Fecha, (i+1<cs.length)?cs[i+1].Fecha:null];
}
function includedComidas(){
  if(state.mode==='catalogo') return (DATA.Comidas||[]).map(c=>c.Comida);
  let slots=(DATA.Calendario||[]).filter(s=>s.Comida&&String(s.Comida).trim());
  const [a,b]=tramoWindow();
  if(a) slots=slots.filter(s=> String(s.Fecha)>=a && (!b || String(s.Fecha)<b));
  return [...new Set(slots.map(s=>s.Comida))];
}
function compradoIngr(){ const m={}; (DATA.ListaCompra||[]).forEach(r=>{ m[r.Ingrediente]=truthy(r.Comprado); }); return m; }

function computeShopping(){
  const ing=ingMap(), rac=raciones(), inc=new Set(includedComidas()), qty={};
  (DATA.Recetas||[]).forEach(r=>{
    if(!inc.has(r.Comida)) return;
    const meta=ing[r.Ingrediente]; if(!meta || truthy(meta.EsBasico)) return;
    qty[r.Ingrediente]=(qty[r.Ingrediente]||0)+num(r.CantidadPorComensal)*rac;
  });
  (DATA.Despensa||[]).forEach(d=>{ if(qty[d.Ingrediente]!=null) qty[d.Ingrediente]-=num(d.Cantidad); });
  const done=compradoIngr(); const byCat={};
  Object.keys(qty).forEach(name=>{
    if(qty[name]<=0.0001) return;
    const meta=ing[name]||{Categoria:'Despensa',Unidad:'g'};
    (byCat[meta.Categoria]=byCat[meta.Categoria]||[]).push({name, legible:legible(qty[name],meta.Unidad), comprado:!!done[name], cat:meta.Categoria});
  });
  const groups=Object.keys(byCat).sort((a,b)=>(CATORDER.indexOf(a)+1||99)-(CATORDER.indexOf(b)+1||99))
    .map(cat=>({cat, items:byCat[cat].sort((x,y)=>x.name.localeCompare(y.name))}));
  let total=0,doneN=0; groups.forEach(g=>g.items.forEach(it=>{ total++; if(it.comprado)doneN++; }));
  return {groups,total,done:doneN};
}

/* --------------------------------- SVG ---------------------------------- */
const IC={
  comprar:'<path d="M3 4h2l2.5 12h11l2-8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>',
  calendario:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
  recetas:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M9 8h7M9 12h7"/>',
  despensa:'<path d="M4 8l8-4 8 4-8 4z"/><path d="M4 8v8l8 4 8-4V8"/>',
  ajustes:'<circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M18.5 5.5l-2 2M7.5 16.5l-2 2"/>'
};
const TABS=[['comprar','Comprar'],['calendario','Calendario'],['recetas','Recetas'],['despensa','Despensa'],['ajustes','Ajustes']];

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
      ${cs.map(c=>`<option value="${esc(c.Fecha)}" ${state.tramo===c.Fecha?'selected':''}>Desde ${esc(c.Fecha)}${c.Etiqueta?' · '+esc(c.Etiqueta):''}</option>`).join('')}
    </select>` : '';
  const pct = sh.total? Math.round(sh.done/sh.total*100):0;
  let html = `<div class="hero"><div class="lab">${state.mode==='catalogo'?'Todo el catálogo':'Según calendario'}</div>
    <div class="big">${sh.done} / ${sh.total} comprado</div>
    <div class="sub">${sh.total-sh.done} pendientes · ${raciones()} raciones</div>
    <div class="bar"><i style="width:${pct}%"></i></div></div>
    <div class="controls"><div class="seg" style="flex:1">
      <button data-sel="mode" data-val="catalogo" class="${state.mode==='catalogo'?'on':''}">Todas las comidas</button>
      <button data-sel="mode" data-val="calendario" class="${state.mode==='calendario'?'on':''}">Por calendario</button>
    </div></div>${tramoSel?`<div class="controls">${tramoSel}</div>`:''}`;

  if(!sh.total){ html+=`<div class="banner">No hay ingredientes que comprar con esta selección. ${state.mode==='calendario'?'Asigna comidas en el Calendario o cambia a "Todas las comidas".':''}</div>`; }
  sh.groups.forEach(g=>{
    html+=`<div class="sect"><span class="dot" style="background:${CATCOLOR[g.cat]||'#888'}"></span>${esc(g.cat)}<span class="n">${g.items.length}</span></div><div class="card" style="padding:2px 12px">`;
    g.items.forEach(it=> html+=itemRow('ingr',it.name,CATEMOJI[it.cat],it.name,it.legible,it.comprado));
    html+=`</div>`;
  });
  // Basicos
  const bas=(DATA.Basicos||[]);
  if(bas.length){ html+=`<div class="sect"><span class="dot" style="background:#6b7a5e"></span>Básicos de cocina (compra única)<span class="n">${bas.length}</span></div><div class="card" style="padding:2px 12px">`;
    bas.forEach(b=> html+=itemRow('basico',b.Item,'🧂',b.Item, b.Formato||'', truthy(b.Comprado)) ); html+=`</div>`; }
  // Listas abiertas por tipo
  ['Desayuno','Bebidas','Picoteo'].forEach(tipo=>{
    const rows=(DATA.ListasAbiertas||[]).filter(r=>r.Tipo===tipo);
    if(!rows.length)return;
    const em=tipo==='Desayuno'?'🥐':tipo==='Bebidas'?'🥤':'🥜';
    html+=`<div class="sect"><span class="dot" style="background:#7A5A86"></span>${tipo}<span class="n">${rows.length}</span></div><div class="card" style="padding:2px 12px">`;
    rows.forEach(r=> html+=itemRow('lista',r.Item,em,r.Item, r.Paquetes?`${r.Paquetes} ${r.Envase||''}`:'', truthy(r.Comprado)) );
    html+=`</div>`;
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
  ).join('')+`</div>`;
}
function viewReceta(name){
  const c=(DATA.Comidas||[]).find(x=>x.Comida===name); if(!c)return 'No encontrada.';
  const rac=raciones(), ing=ingMap();
  const items=(DATA.Recetas||[]).filter(r=>r.Comida===name).map(r=>{
    const m=ing[r.Ingrediente]||{Unidad:'g'}; const q=num(r.CantidadPorComensal)*rac;
    return `<div class="item"><div class="it-main"><div class="n">${esc(r.Ingrediente)}${truthy(r.Opcional)?' <span class="chip warm" style="padding:2px 7px">opcional</span>':''}</div>
      <div class="q">${esc(legible(q,m.Unidad))}</div></div></div>`;
  }).join('');
  return `<div>
    <div>${c.Cocinero?`<span class="chip olive">👨‍🍳 ${esc(c.Cocinero)}</span>`:''}${c.MomentoSugerido?`<span class="chip">${esc(c.MomentoSugerido)}</span>`:''}</div>
    ${c.PasosPrevios?`<div class="rlabel">Pasos previos (con antelación)</div><div class="rtext">${esc(c.PasosPrevios)}</div>`:''}
    <div class="rlabel">Preparación</div><div class="rtext" id="prep">${esc(c.Preparacion)}</div>
    <div class="row-btns"><button class="btn" data-act="editprep" data-comida="${esc(name)}">✎ Editar preparación</button></div>
    ${c.Fuente?`<div style="margin:12px 4px"><a href="${esc(c.Fuente)}" target="_blank" rel="noopener">🔗 Ver receta original</a></div>`:''}
    <div class="rlabel">Ingredientes (para ${rac} raciones)</div>
    <div class="card" style="padding:2px 12px">${items||'<div class="item"><div class="it-main muted small">Sin ingredientes.</div></div>'}</div>
  </div>`;
}

function viewDespensa(){
  const rows=(DATA.Despensa||[]);
  return `<div class="banner">Lo que apuntes aquí se <b>descuenta</b> de la compra.</div>
    <div class="card" style="padding:2px 12px">${rows.length?rows.map(d=>
      `<div class="item"><div class="thumb">🥫</div><div class="it-main"><div class="n">${esc(d.Ingrediente)}</div>
      <div class="q">${esc(legible(num(d.Cantidad),d.Unidad||'g'))}${d.Notas?' · '+esc(d.Notas):''}</div></div></div>`
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
    <div class="rlabel">Fechas de compra (tramos)</div>
    <div class="card">${compras().map(c=>`<span class="chip olive">${esc(c.Fecha)}${c.Etiqueta?' · '+esc(c.Etiqueta):''}</span>`).join('')||'<span class="muted small">Sin fechas.</span>'}</div>
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
  else if(act==='editprep'){ editPrep(b.getAttribute('data-comida')); }
  else if(act==='signout'){ signout(); }
  else if(act==='closemodal'||act==='closebg'){ if(act==='closebg'&&e.target.closest('.sheet'))return; closeModal(); }
});
document.addEventListener('change',(e)=>{
  const s=e.target.closest('[data-sel="tramo"]'); if(s){ state.tramo=s.value; render(); }
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
