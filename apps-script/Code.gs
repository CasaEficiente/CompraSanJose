/**
 * CompraSanJose — Backend (Google Apps Script) para la PWA.
 *
 * CÓMO USAR (ver docs/DESPLIEGUE.md):
 *  1. Abre el Google Sheet "CompraSanJose" → Extensiones → Apps Script.
 *  2. Pega TODO este archivo.
 *  3. Implementar → Nueva implementación → Aplicación web:
 *       - Ejecutar como: Yo
 *       - Quién tiene acceso: Cualquier usuario (incluso anónimos)
 *     Autoriza y copia la URL que termina en /exec.
 *
 * Seguridad: cada petición lleva el token de Google del usuario; se verifica y
 * solo se responde si su correo está en la hoja "Usuarios" (o es el propietario).
 */

var OWNER = 'francisco.m.garcia@gmail.com';   // siempre permitido
var CLIENT_ID = '1023508400728-0slk8sh110iad5hkcsbsij8v8a8hfpkl.apps.googleusercontent.com';  // se verifica el token
var SHEETS = ['Config','Comidas','Ingredientes','Recetas','Calendario','Compras',
              'Despensa','Basicos','ListasAbiertas','Usuarios','ListaCompra'];

function doGet(e){
  var p = e.parameter || {};
  var email = verify(p.token);
  var payload = allowed(email) ? {ok:true, data:readAll()} : {ok:false, error:'no-autorizado'};
  var body = JSON.stringify(payload);
  if(p.callback){ return out(p.callback + '(' + body + ')', ContentService.MimeType.JAVASCRIPT); }
  return out(body, ContentService.MimeType.JSON);
}

function doPost(e){
  var req = {};
  try{ req = JSON.parse(e.postData.contents); }catch(err){ return out('{"ok":false}', ContentService.MimeType.JSON); }
  var email = verify(req.token);
  if(!allowed(email)) return out(JSON.stringify({ok:false,error:'no-autorizado'}), ContentService.MimeType.JSON);
  var res = {ok:false};
  if(req.action === 'read') res = {ok:true, data:readAll()};
  else if(req.action === 'update') res = updateRows(req.sheet, req.match||{}, req.set||{}, req.appendIfMissing, req.appendRow);
  else if(req.action === 'append') res = {ok:true, appended:appendRowObj(req.sheet, req.row||{})};
  return out(JSON.stringify(res), ContentService.MimeType.JSON);
}

function out(text, mime){ return ContentService.createTextOutput(text).setMimeType(mime); }

/* --------------------------- auth --------------------------- */
function verify(token){
  if(!token) return null;
  try{
    var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), {muteHttpExceptions:true});
    if(r.getResponseCode() !== 200) return null;
    var p = JSON.parse(r.getContentText());
    if(CLIENT_ID && p.aud !== CLIENT_ID) return null;
    if(p.exp && (parseInt(p.exp,10)*1000 < Date.now())) return null;
    return p.email ? String(p.email).trim().toLowerCase() : null;
  }catch(err){ return null; }
}
function allowed(email){
  if(!email) return false;
  if(email === OWNER.trim().toLowerCase()) return true;
  try{
    var sh = ss().getSheetByName('Usuarios'); if(!sh) return false;
    var vals = sh.getDataRange().getValues(); if(vals.length < 2) return false;
    var ci = vals[0].map(String).indexOf('Email'); if(ci < 0) return false;
    for(var i=1;i<vals.length;i++){ if(String(vals[i][ci]).trim().toLowerCase() === email) return true; }
  }catch(err){}
  return false;
}

/* --------------------------- data --------------------------- */
var SHEET_ID = '1dViCbOztGH_I4ar8ff_Gv86aUo-rK1zigi4Cma5e47E'; // Google Sheet CompraSanJose
function ss(){ return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet(); }
function tz_(){ try{ return ss().getSpreadsheetTimeZone() || 'Europe/Madrid'; }catch(e){ return 'Europe/Madrid'; } }
function cell_(v){ return (v instanceof Date) ? Utilities.formatDate(v, tz_(), 'yyyy-MM-dd') : v; } // fechas -> 'YYYY-MM-DD'
function readAll(){
  var data = {};
  SHEETS.forEach(function(name){
    var sh = ss().getSheetByName(name); if(!sh){ data[name]=[]; return; }
    var vals = sh.getDataRange().getValues(); if(vals.length < 1){ data[name]=[]; return; }
    var hdr = vals[0].map(String); var rows = [];
    for(var i=1;i<vals.length;i++){
      var empty = vals[i].every(function(c){ return c === '' || c === null; });
      if(empty) continue;
      var o = {}; for(var j=0;j<hdr.length;j++){ o[hdr[j]] = cell_(vals[i][j]); }
      rows.push(o);
    }
    data[name] = rows;
  });
  return data;
}
function updateRows(name, match, set, appendIfMissing, appendRow){
  var sh = ss().getSheetByName(name); if(!sh) return {ok:false,error:'sheet'};
  var vals = sh.getDataRange().getValues(); var hdr = vals[0].map(String); var found = false;
  for(var i=1;i<vals.length;i++){
    var ok = true;
    for(var k in match){ var ci = hdr.indexOf(k); if(ci<0 || String(cell_(vals[i][ci])) !== String(match[k])){ ok=false; break; } }
    if(ok){ for(var c in set){ var cj = hdr.indexOf(c); if(cj>=0) sh.getRange(i+1, cj+1).setValue(set[c]); } found = true; }
  }
  if(!found && appendIfMissing){ var obj={}; for(var a in match)obj[a]=match[a]; for(var b in set)obj[b]=set[b]; if(appendRow)for(var d in appendRow)obj[d]=appendRow[d]; appendRowObj(name, obj); }
  return {ok:true, updated:found};
}
function appendRowObj(name, obj){
  var sh = ss().getSheetByName(name); if(!sh) return false;
  var hdr = sh.getDataRange().getValues()[0].map(String);
  var row = hdr.map(function(h){ return (obj[h]!=null)?obj[h]:''; });
  sh.appendRow(row);
  return true;
}
