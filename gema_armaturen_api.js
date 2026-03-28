/* gema_armaturen_api.js — Armaturen-Katalog mit Lieferant-Verifizierung
   Analog zu gema_produktkatalog_api.js:
   - GEMA Admin erfasst Armaturen (Basisdaten, Zeta-Werte)
   - Lieferant loggt ein, prüft/ergänzt Daten → Verifiziert-Badge ✓
*/
(function(w){
  'use strict';
  var SK='gema_armaturen_v1';
  var _data=null;

  // ── Standard-Armaturen-Katalog ──
  var DEFAULT_ARMATUREN=[
    // Schrägsitzventile
    {id:'ssv-nussbaum-1',typ:'schraeg',name:'Schrägsitzventil',hersteller:'R. Nussbaum AG',serie:'Optipress',status:'verifiziert',
     zeta:{15:2.3,18:2.1,22:1.7,28:1.4,35:1.2,42:1.6,54:1.5},zetaDefault:1.8},
    {id:'ssv-geberit-1',typ:'schraeg',name:'Schrägsitzventil Mapress',hersteller:'Geberit AG',serie:'Mapress',status:'verifiziert',
     zeta:{15:3.5,18:2.5,22:2.0,28:1.5,35:1.2,42:1.0},zetaDefault:2.0},
    {id:'ssv-jrg-1',typ:'schraeg',name:'Schrägsitzventil MT',hersteller:'JRG',serie:'Sanipex MT',status:'nicht_verifiziert',
     zeta:{16:2.1,20:2.1,26:1.7,32:1.5,40:1.4,50:1.6,63:1.4},zetaDefault:1.8},
    {id:'ssv-generic',typ:'schraeg',name:'Schrägsitzventil (Standard)',hersteller:'—',serie:'—',status:'verifiziert',
     zeta:{15:3.5,20:2.5,25:2.0,32:2.0,40:2.0,50:2.0,65:0.7},zetaDefault:2.0},
    // Geradsitzventile
    {id:'gsv-nussbaum-1',typ:'gerad',name:'Geradsitzventil',hersteller:'R. Nussbaum AG',serie:'Optipress',status:'verifiziert',
     zeta:{15:5.5,18:5.7,22:7.4,28:7.1,35:6.5,42:8.5,54:8.0},zetaDefault:6.5},
    {id:'gsv-generic',typ:'gerad',name:'Geradsitzventil (Standard)',hersteller:'—',serie:'—',status:'verifiziert',
     zeta:{15:10,20:8.5,25:7.0,32:6.0,40:5.0,50:5.0},zetaDefault:7.0},
    // Kugelhähne
    {id:'kh-nussbaum-1',typ:'kugelhahn',name:'Kugelhahn Optipress',hersteller:'R. Nussbaum AG',serie:'Optipress',status:'verifiziert',
     zeta:{15:1.0,20:0.5,25:0.5,32:0.3,40:0.3,50:0.3},zetaDefault:0.5},
    {id:'kh-jrg-1',typ:'kugelhahn',name:'Kugelhahn MT',hersteller:'JRG',serie:'Sanipex MT',status:'nicht_verifiziert',
     zeta:{16:0.1,20:0.3,26:0.3,32:0.4,40:0.5},zetaDefault:0.3},
    {id:'kh-generic',typ:'kugelhahn',name:'Kugelhahn (Standard)',hersteller:'—',serie:'—',status:'verifiziert',
     zeta:{15:1.0,20:0.5,25:0.5,32:0.3,40:0.3,50:0.3},zetaDefault:0.5},
    // Absperrschieber
    {id:'as-generic',typ:'absperrschieber',name:'Absperrschieber',hersteller:'—',serie:'—',status:'verifiziert',
     zeta:{},zetaDefault:0.3},
    // Rückschlagventile
    {id:'rv-generic',typ:'rueckschlag',name:'Rückschlagventil',hersteller:'—',serie:'—',status:'verifiziert',
     zeta:{},zetaDefault:2.0},
    {id:'rv-nussbaum-1',typ:'rueckschlag',name:'Rückschlagventil Optipress',hersteller:'R. Nussbaum AG',serie:'Optipress',status:'verifiziert',
     zeta:{15:2.5,18:2.0,22:1.8,28:1.5,35:1.3},zetaDefault:2.0},
    // Druckminderer
    {id:'dm-generic',typ:'druckminderer',name:'Druckminderer',hersteller:'—',serie:'—',status:'verifiziert',
     zeta:{},zetaDefault:8.0},
    {id:'dm-honeywell-1',typ:'druckminderer',name:'D06F Druckminderer',hersteller:'Honeywell',serie:'Braukmann',status:'nicht_verifiziert',
     zeta:{15:7.0,20:6.5,25:6.0,32:5.5,40:5.0,50:4.5},zetaDefault:6.0},
    // Wasserzähler
    {id:'wz-generic',typ:'wasserzaehler',name:'Wasserzähler',hersteller:'—',serie:'—',status:'verifiziert',
     zeta:{15:5.0,20:4.0,25:3.0},zetaDefault:4.0},
    // Schmutzfänger / Filter
    {id:'sf-generic',typ:'filter',name:'Schmutzfänger / Filter',hersteller:'—',serie:'—',status:'verifiziert',
     zeta:{},zetaDefault:3.0},
  ];

  // Armaturen-Typen für Gruppierung
  var TYPEN=[
    {id:'schraeg',name:'Schrägsitzventile',icon:'⌥'},
    {id:'gerad',name:'Geradsitzventile',icon:'⊟'},
    {id:'kugelhahn',name:'Kugelhähne',icon:'◉'},
    {id:'absperrschieber',name:'Absperrschieber',icon:'▬'},
    {id:'rueckschlag',name:'Rückschlagventile',icon:'◁'},
    {id:'druckminderer',name:'Druckminderer',icon:'▽'},
    {id:'wasserzaehler',name:'Wasserzähler',icon:'🔢'},
    {id:'filter',name:'Filter / Schmutzfänger',icon:'⊞'}
  ];

  function _load(){
    if(_data)return _data;
    try{var r=localStorage.getItem(SK);if(r)_data=JSON.parse(r);}catch(e){}
    if(!_data)_data={armaturen:JSON.parse(JSON.stringify(DEFAULT_ARMATUREN))};
    return _data;
  }
  function _save(){
    try{localStorage.setItem(SK,JSON.stringify(_data));}catch(e){}
    if(typeof _GemaDB!=='undefined')try{_GemaDB.put(SK,JSON.stringify(_data)).catch(function(){});}catch(e){}
  }

  function getAll(){return _load().armaturen||[];}
  function getByTyp(typ){return getAll().filter(function(a){return a.typ===typ;});}
  function getByHersteller(hersteller){return getAll().filter(function(a){return a.hersteller===hersteller;});}
  function getHersteller(){
    var h={};getAll().forEach(function(a){if(a.hersteller&&a.hersteller!=='—')h[a.hersteller]=1;});
    return Object.keys(h).sort();
  }
  function getTypen(){return TYPEN;}
  function getById(id){return getAll().find(function(a){return a.id===id;})||null;}

  // Zeta-Wert für eine Armatur bei gegebener DN
  function getZeta(armaturId,dn){
    var a=getById(armaturId);if(!a)return 0;
    var dnNum=parseFloat(String(dn).replace(/[^\d.]/g,''));
    if(a.zeta[dnNum]!==undefined)return a.zeta[dnNum];
    if(a.zeta[dn]!==undefined)return a.zeta[dn];
    return a.zetaDefault||0;
  }

  // Lieferant: Armatur verifizieren
  function verifiziere(id){
    var data=_load();
    var a=(data.armaturen||[]).find(function(x){return x.id===id;});
    if(a){a.status='verifiziert';_save();}
  }
  // Lieferant: Zeta-Werte aktualisieren
  function updateZeta(id,zeta,zetaDefault){
    var data=_load();
    var a=(data.armaturen||[]).find(function(x){return x.id===id;});
    if(a){a.zeta=zeta;if(zetaDefault!==undefined)a.zetaDefault=zetaDefault;_save();}
  }
  // Admin: Armatur hinzufügen
  function addArmatur(armatur){
    var data=_load();
    armatur.id=armatur.id||'arm_'+Date.now();
    armatur.status=armatur.status||'nicht_verifiziert';
    data.armaturen.push(armatur);_save();
    return armatur;
  }

  w.GemaArmaturen={
    getAll:getAll, getByTyp:getByTyp, getByHersteller:getByHersteller,
    getHersteller:getHersteller, getTypen:getTypen, getById:getById,
    getZeta:getZeta, verifiziere:verifiziere, updateZeta:updateZeta,
    addArmatur:addArmatur, TYPEN:TYPEN
  };
})(window);
