/* differenziamolisempre — editor statico, nessuna libreria esterna. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const DAYS = [['mon','Lunedì'],['tue','Martedì'],['wed','Mercoledì'],['thu','Giovedì'],['fri','Venerdì'],['sat','Sabato'],['sun','Domenica']];
  const SECTION_TITLES = {panoramica:'Panoramica',calendario:'Calendario',dizionario:'Dizionario',guida:'Guida alla differenziata',consigli:'Consigli utili',servizi:'Servizi comunali',riconoscimento:'Riconoscimento',avanzate:'Campi avanzati',controlli:'Validazione'};
  const LABELS = {
    id:'Identificativo',nome:'Nome',nome_fonte:'Nome del rifiuto',nome_prodotto:'Prodotto',titolo:'Titolo',testo_fonte:'Testo del consiglio',icona:'Icona SF Symbols (facoltativa)',pagina_pdf:'Pagina del documento',stato:'Stato',verificato:'Confermato',destinazione_fonte:'Destinazione indicata',destinazione_id:'Identificativo destinazione',colore_mastello_fonte:'Colore del mastello',sinonimi:'Sinonimi',materiale:'Materiale',codice:'Codice ambientale',termine:'Termine riconosciuto',categoria_id:'Frazione di raccolta',descrizione:'Descrizione',indicazione_fonte:'Indicazioni',come_si_raccoglie_fonte:'Come si raccoglie',cosa_si:'Cosa conferire',cosa_no:'Cosa non conferire',ricorda:'Ricorda',altre_destinazioni:'Altre destinazioni',telefono:'Telefono',zona:'Località',indirizzo_navigazione:'Indirizzo per navigazione',latitudine:'Latitudine',longitudine:'Longitudine',giorni:'Giorni di apertura',dalle:'Dalle',alle:'Alle',cadenza:'Frequenza',prenotazione_necessaria:'Prenotazione necessaria',informazioni:'Informazioni',note:'Note',nota:'Nota',quando:'Quando',come:'Come',luogo:'Dove',data_version:'Versione descrittiva',schema_version:'Versione dello schema',data_revision:'Revisione dati (numerica)',identificativo:'Identificativo del Comune',provincia:'Provincia',regione:'Regione',colore_mastello:'Colore mastello',colore_ui_provvisorio:'Colore UI',nome:'Nome',modalita_conferimento:'Modalità di conferimento',descrizione_onboarding:'Descrizione onboarding',totale_voci:'Totale voci',fonte:'Fonte',pagine_pdf:'Pagine PDF',inizio_ora:'Ora inizio',fine_ora:'Ora fine',tipologia:'Tipologia',periodicita:'Periodicità',giorni_riferiti_a:'Giorni riferiti a',cambio_profilo:'Cambio utenza',validita_verificata:'Validità confermata',giorni_di_ritiro:'Giorni di ritiro',comune:'Comune'
  };
  const HEADERS = [
    ['comune','Comune e informazioni generali'],['categorie','Frazioni di raccolta'],['profili_utenza','Profili di utenza'],
    ['calendario','Calendario completo'],['guida','Guida completa'],['dizionario','Dizionario completo'],
    ['consigli','Consigli completi'],['servizi','Servizi completi'],['riconoscimento','Regole di riconoscimento'],
    ['provenienza','Fonti documentali'],['ui','Impostazioni interfaccia'],['contratto_app_calendario','Contratto app calendario'],
    ['verifiche_aperte','Note di verifica'],['archivio_testo','Archivio dei testi'],
    ['status','Stato dati'],['schema_version','Versione schema'],['data_version','Versione descrittiva'],['data_revision','Revisione numerica']
  ];
  const state = {
    data:null, commune:'pietracatella', cities:[{id:'pietracatella',nome:'Pietracatella',file:'comuni/pietracatella/dati.json'}],
    origin:'', section:'panoramica', sub:{guida:'categorie',servizi:'contatti',riconoscimento:'codici_materiale',calendario:'ritiri'},
    selected:{}, query:{}, advanced:'comune', dirty:false, undo:[],redo:[], loadWarning:'', problems:[],
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const label = (k) => LABELS[k] || String(k).replace(/_/g,' ').replace(/^./,x=>x.toUpperCase());
  const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
  const clone = (x) => structuredClone(x);
  const get = (path,doc=state.data) => path.reduce((obj,key)=> obj?.[key],doc);
  const has = (path) => get(path)!==undefined;
  const pathAttr = (path) => esc(JSON.stringify(path));
  const asText = (x) => x === null ? '' : String(x);
  const htmlPage = (kicker,title,desc,extra='') => `<div class="page-top"><div><div class="kicker">${esc(kicker)}</div><h1 class="page-title">${esc(title)}</h1><p class="page-desc">${desc}</p></div>${extra?`<div class="page-actions">${extra}</div>`:''}</div>`;
  const badge = (text,muted=false) => `<span class="pill ${muted?'muted':''}">${esc(text)}</span>`;
  const action = (action,name,cls='button-secondary',extra='') => `<button type="button" class="button ${cls}" data-action="${action}" ${extra}>${name}</button>`;
  const keyPath = (p) => p.join('|');
  const fieldPath = (p) => esc(JSON.stringify(p));
  const fieldLabel = (k) => esc(label(k));

  function notify(msg,type='ok') {
    const area=$('alert-area'); area.innerHTML=`<div class="alert ${type==='ok'?'':type}"><span>${esc(msg)}</span><button aria-label="Chiudi avviso" data-action="dismiss-alert">✕</button></div>`;
    area.querySelector('[data-action="dismiss-alert"]').addEventListener('click',()=>{area.innerHTML='';});
  }
  function remember(){state.undo.push(clone(state.data));if(state.undo.length>50)state.undo.shift();state.redo.length=0;}
  function synchronize(){
    if(Array.isArray(state.data?.dizionario?.voci)) state.data.dizionario.totale_voci=state.data.dizionario.voci.length;
  }
  function modified(){synchronize();state.dirty=true;updateChrome();}
  function mutate(fn,{rerender=true}={}){remember();fn();modified();if(rerender)render();}
  function replaceData(next,origin='File importato') {
    state.data=clone(next);state.undo=[];state.redo=[];state.selected={};state.query={};state.dirty=false;state.origin=origin;
    updateChrome();render();
  }
  function updateChrome(){
    const c=state.data?.comune||{};
    $('breadcrumb-city').textContent=c.nome||state.commune;
    $('municipality-caption').textContent=[c.regione,c.provincia].filter(Boolean).join(' · ');
    $('breadcrumb-current').textContent=SECTION_TITLES[state.section]||state.section;
    $('nav-dictionary').textContent=state.data?.dizionario?.voci?.length??'—';
    $('dirty-indicator').textContent=state.dirty?'Modifiche da esportare':'Nessuna modifica';
    $('dirty-indicator').classList.toggle('changed',state.dirty);
    $('undo-button').disabled=!state.undo.length;
    $('redo-button').disabled=!state.redo.length;
    $('footer-revision').textContent=`schema ${state.data?.schema_version??'—'} · revisione ${state.data?.data_revision??'non assegnata'}`;
    document.querySelectorAll('[data-section]').forEach(el=>el.classList.toggle('active',el.dataset.section===state.section));
    $('city-select').value=state.commune;
  }
  function switchSection(section){state.section=section;$('sidebar').classList.remove('open');updateChrome();render();}

  function primitiveField(key,value,path){
    const a=fieldPath(path), l=fieldLabel(key);
    let ctrl='';
    if(value===null){
      ctrl=`<div class="type-row"><select class="type-select" data-role="type" data-path="${a}" aria-label="Tipo di ${l}"><option value="null">Vuoto (null)</option><option value="string">Testo</option><option value="number">Numero</option><option value="boolean">Sì/No</option></select><span class="field-text-null">Attualmente senza valore</span></div>`;
    }else if(typeof value==='boolean'){
      ctrl=`<label class="switch-row"><input type="checkbox" data-role="bool" data-path="${a}" ${value?'checked':''}><span>${value?'Sì':'No'}</span></label>`;
    }else if(typeof value==='number'){
      ctrl=`<input type="number" step="any" data-role="number" data-path="${a}" value="${esc(value)}" aria-label="${l}">`;
    }else{
      const s=String(value),long=s.length>130||s.includes('\n')||/(descrizione|informazioni|testo|nota|come_si|indicazione|destinazione_fonte|luogo|quando|^come$)/i.test(key)&&s.length>60;
      ctrl=long?`<textarea rows="${s.length>260?5:3}" data-role="string" data-path="${a}" aria-label="${l}">${esc(s)}</textarea>`:`<input type="text" data-role="string" data-path="${a}" value="${esc(s)}" aria-label="${l}">`;
    }
    return `<div class="field"><label class="field-label">${l}</label>${ctrl}</div>`;
  }

  function listPrimitiveField(key,arr,path){
    const a=pathAttr(path),rows=arr.map((v,i)=>{
      const p=fieldPath([...path,i]);
      return `<div class="array-item"><input data-role="${typeof v==='number'?'number':'string'}" data-path="${p}" type="${typeof v==='number'?'number':'text'}" value="${esc(asText(v))}" aria-label="${fieldLabel(key)} ${i+1}"><button class="button button-quiet button-small" data-action="move-item" data-path="${a}" data-index="${i}" data-shift="-1" ${i===0?'disabled':''} title="Sposta su">↑</button><button class="button button-quiet button-small" data-action="move-item" data-path="${a}" data-index="${i}" data-shift="1" ${i===arr.length-1?'disabled':''} title="Sposta giù">↓</button><button class="button button-outlined-danger button-small" data-action="remove-item" data-path="${a}" data-index="${i}" aria-label="Rimuovi ${fieldLabel(key)} ${i+1}">−</button></div>`;
    }).join('');
    return `<div class="array-panel"><div class="array-head"><strong>${fieldLabel(key)} ${badge(arr.length,true)}</strong>${action('add-item','+ Aggiungi','button-secondary button-small',`data-path="${a}"`)}</div>${rows||'<div class="array-empty">Nessun elemento.</div>'}</div>`;
  }
  function arrayObjectsField(key,arr,path,depth){
    const a=pathAttr(path),allowAdding=arr.length>0||key==='altre_destinazioni';
    const rows=arr.map((v,i)=>`<details class="nested"><summary>${esc(v?.nome||v?.titolo||v?.id||v?.codice||v?.termine||`${label(key)} ${i+1}`)} <span class="tiny">· ${i+1}/${arr.length}</span></summary><div class="nested-body"><div class="toolbar">${action('remove-item','Elimina elemento','button-outlined-danger button-small',`data-path="${a}" data-index="${i}"`)}</div>${objectFields(v,[...path,i],depth+1)}</div></details>`).join('');
    return `<div class="array-panel"><div class="array-head"><strong>${fieldLabel(key)} ${badge(arr.length,true)}</strong>${allowAdding?action('add-item','+ Aggiungi','button-secondary button-small',`data-path="${a}"`):''}</div>${rows||'<div class="array-empty">Nessun elemento. Per aggiungere nuove strutture non ancora presenti nello schema è necessario un aggiornamento concordato del formato.</div>'}</div>`;
  }
  function renderField(key,v,path,depth=0){
    if(Array.isArray(v)){
      if(v.some(isObject)||v.length===0 && /(^categorie$|^voci$|^centri_raccolta$|^contatti$|^codici_materiale$|^termini_materiale$|^profili_utenza$|^regole_speciali_non_automatizzate$|^eccezioni_date$|^altre_destinazioni$)/.test(key))return arrayObjectsField(key,v,path,depth);
      return listPrimitiveField(key,v,path);
    }
    if(isObject(v))return `<details class="nested" ${depth<=0?'open':''}><summary>${fieldLabel(key)}</summary><div class="nested-body">${objectFields(v,path,depth+1)}</div></details>`;
    return primitiveField(key,v,path);
  }
  function objectFields(obj,path,depth=0,exclude=[]){
    if(!isObject(obj))return `<div class="notice">Il valore corrente non è un oggetto. Consulta Campi avanzati.</div>`;
    return Object.entries(obj).filter(([key])=>!exclude.includes(key)).map(([key,v])=>renderField(key,v,[...path,key],depth)).join('')||'<p class="plain-note">Nessun campo da modificare.</p>';
  }

  function renderListEditor(title,path,{emptyName='elemento',subtitle='',deletable=true,searchable=true,maxList=170}={}){
    const items=get(path);if(!Array.isArray(items))return `<div class="notice">La lista ${esc(title)} non è disponibile nel JSON.</div>`;
    const id=keyPath(path),q=state.query[id]||'',lower=q.toLocaleLowerCase('it');
    const filtered=items.map((item,index)=>({item,index})).filter(({item})=>{
      if(!q)return true;
      const candidates=[item?.nome_fonte,item?.nome,item?.titolo,item?.id,item?.codice,item?.termine,item?.destinazione_fonte,item?.materiale];
      return candidates.some(v=>String(v??'').toLocaleLowerCase('it').includes(lower));
    });
    const truncated=filtered.length>maxList;
    const selected=Number.isInteger(state.selected[id])?Math.min(state.selected[id],items.length-1):0;
    const current=items[selected],keyValue=(item,index)=>item?.nome_fonte||item?.titolo||item?.nome||item?.codice||item?.termine||item?.id||`${emptyName} ${index+1}`;
    const rows=filtered.slice(0,maxList).map(({item,index})=>`<button class="item-row ${selected===index?'selected':''}" data-action="select-record" data-list="${esc(id)}" data-index="${index}"><span style="min-width:0"><span class="item-name" style="display:block">${esc(keyValue(item,index))}</span><span class="item-sub" style="display:block">${esc(item?.destinazione_fonte||item?.materiale||item?.id||'')}</span></span><span class="chevron">›</span></button>`).join('');
    const addBtn=action('add-item','+ Nuovo','button-secondary button-small',`data-path="${pathAttr(path)}"`);
    return `<div class="toolbar"><div class="section-badges">${badge(`${items.length} elementi`)}${subtitle?`<span class="plain-note">${esc(subtitle)}</span>`:''}</div>${addBtn}</div><div class="split"><div class="list-panel"><div class="list-header"><span>Elenco</span><span>${filtered.length} risultati</span></div>${searchable?`<div style="padding:10px 10px 3px"><input class="search-input" style="min-width:0;width:100%" placeholder="Cerca..." aria-label="Cerca in ${esc(title)}" data-role="search" data-list="${esc(id)}" value="${esc(q)}"></div>`:''}<div class="item-list">${rows||'<div class="centered-empty">Nessuna corrispondenza.</div>'}${truncated?`<p class="plain-note" style="padding:0 12px">Sono mostrati i primi ${maxList} risultati. Usa la ricerca per gli altri.</p>`:''}</div></div><div class="card detail-panel">${current?`<div class="card-head"><div><h2 class="detail-title">${esc(keyValue(current,selected))}</h2><div class="detail-subtitle">Elemento ${selected+1} di ${items.length}</div></div>${deletable?action('ask-delete','Elimina','button-outlined-danger button-small',`data-path="${pathAttr(path)}" data-index="${selected}"`):''}</div>${isObject(current)?objectFields(current,[...path,selected]):renderField(String(selected),current,[...path,selected])}`:`<div class="centered-empty">Nessun elemento. Seleziona «Nuovo» per aggiungerne uno.</div>`}</div></div>`;
  }

  function renderOverview(){
    const d=state.data, cats=d.categorie||[];
    const valid=validate(d);const errors=valid.filter(x=>x.severity==='error');
    const extra=action('import','↑ Importa JSON','button-secondary')+action('export','↓ Esporta JSON','button-primary');
    return htmlPage('GESTIONE CONTENUTI','Panoramica',`Gestisci i dati comunali in modo ordinato, senza modificare manualmente il codice JSON. Ogni modifica resta nel browser fino all'esportazione.`,extra)+
    `<div class="stats"><div class="stat"><div class="stat-icon">▣</div><strong>${esc(d.profili_utenza?.length??0)}</strong><span>Profili di utenza</span></div><div class="stat"><div class="stat-icon">▤</div><strong>${esc(d.dizionario?.voci?.length??0)}</strong><span>Voci del Dizionario</span></div><div class="stat"><div class="stat-icon">✦</div><strong>${esc(d.consigli?.voci?.length??0)}</strong><span>Consigli utili</span></div><div class="stat"><div class="stat-icon">◉</div><strong>${esc((d.riconoscimento?.codici_materiale?.length??0)+(d.riconoscimento?.termini_materiale?.length??0))}</strong><span>Regole riconoscimento</span></div></div>
    <div class="two-cols"><section class="card"><div class="card-head"><h2>File attivo</h2>${badge(`schema ${d.schema_version??'?'}`)}</div><div class="field"><label class="field-label">Comune</label><strong>${esc(d.comune?.nome)}</strong></div><div class="field"><label class="field-label">Origine</label><div>${esc(state.origin)}</div></div><div class="field"><label class="field-label">Revisione numerica</label><div>${esc(d.data_revision??'Non ancora assegnata')}</div></div><div class="field"><label class="field-label">Versione descrittiva</label><div class="plain-note">${esc(d.data_version??'—')}</div></div></section>
    <section class="card"><div class="card-head"><h2>Controllo qualità</h2>${errors.length?badge(`${errors.length} errori`):badge('Nessun errore')}</div><p class="plain-note">I dati vengono validati prima di generare il JSON. Campi o codici non coerenti vengono segnalati, evitando aggiornamenti involontariamente incompatibili.</p><div style="margin:17px 0">${errors.length?`<div class="notice">${errors.length} problema/i bloccante/i. Apri la sezione Validazione.</div>`:`<div class="validation-row good"><span class="marker">✓</span>Struttura principale coerente.</div>`}</div>${action('navigate-validation','Apri validazione','button-secondary')}</section></div>
    <section class="card"><div class="card-head"><h2>Flusso consigliato</h2></div><div class="plain-note"><strong>1.</strong> Apri una sezione e modifica i contenuti. <strong>2.</strong> Controlla la validazione. <strong>3.</strong> Esporta il JSON aggiornato. <strong>4.</strong> Pubblicalo separatamente sul dominio principale e su GitHub Pages.</div></section>
    <div class="notice">Questo editor non carica automaticamente le modifiche su Internet e non contiene password né token GitHub. Il file originale rimane invariato finché non decidi di pubblicarne uno nuovo.</div>`;
  }

  function renderCalendar(){
    const d=state.data,profiles=d.profili_utenza||[],cats=d.categorie||[], all=d.calendario?.ritiri_per_profilo||{};
    const currentProfile=state.sub.calendarioProfile&&all[state.sub.calendarioProfile]?state.sub.calendarioProfile:profiles[0]?.id;
    const active=state.sub.calendario;
    const tabs=`<div class="toolbar"><div class="section-badges">${[['ritiri','Calendario settimanale'],['finestra','Esposizione'],['eccezioni','Eccezioni e note'],['profili','Profili e frazioni']].map(([x,y])=>`<button class="button ${active===x?'button-primary':'button-secondary'} button-small" data-action="sub" data-parent="calendario" data-sub="${x}">${y}</button>`).join('')}</div></div>`;
    let body='';
    if(active==='ritiri'){
      const profileSelect=`<select class="select-standalone" data-role="calendar-profile">${profiles.map(p=>`<option value="${esc(p.id)}" ${p.id===currentProfile?'selected':''}>${esc(p.nome)}</option>`).join('')}</select>`;
      const dayRows=DAYS.map(([day,dayName])=>`<div class="day-row"><strong>${dayName}</strong><div class="day-checks">${cats.map(cat=>`<label class="day-cell"><input type="checkbox" data-role="calendar-check" data-profile="${esc(currentProfile)}" data-day="${day}" data-category="${esc(cat.id)}" ${all[currentProfile]?.[day]?.includes(cat.id)?'checked':''}><span>${esc(cat.nome)}</span></label>`).join('')}</div></div>`).join('');
      const days=DAYS.map(([day,dayName])=>`<div class="day-box"><div class="day-label">${dayName.slice(0,3)}</div><div class="day-count">${all[currentProfile]?.[day]?.length??0}</div><div class="tiny">frazioni</div></div>`).join('');
      body=`<div class="card"><div class="card-head"><h2>Ritiri per utenza</h2>${profileSelect}</div><p class="plain-note">Seleziona le frazioni ritirate la mattina di ogni giorno. L'app calcola automaticamente il conferimento della sera precedente.</p><div class="days">${days}</div><div class="day-grid">${dayRows}</div></div>`;
    }else if(active==='finestra')body=`<div class="card"><div class="card-head"><h2>Finestra di esposizione</h2></div>${objectFields(d.calendario.finestra_esposizione,['calendario','finestra_esposizione'])}</div>`;
    else if(active==='eccezioni')body=`<div class="card"><div class="card-head"><h2>Eccezioni su date specifiche</h2></div>${renderField('eccezioni_date',d.calendario.eccezioni_date,['calendario','eccezioni_date'])}</div><div class="card"><div class="card-head"><h2>Regole speciali documentali</h2></div>${renderField('regole_speciali_non_automatizzate',d.calendario.regole_speciali_non_automatizzate,['calendario','regole_speciali_non_automatizzate'])}</div>`;
    else body=`<section class="card"><div class="card-head"><h2>Profili di utenza</h2></div>${arrayObjectsField('profili_utenza',d.profili_utenza,['profili_utenza'],0)}</section><section class="card"><div class="card-head"><h2>Frazioni di raccolta</h2></div>${arrayObjectsField('categorie',d.categorie,['categorie'],0)}</section>`;
    return htmlPage('ORGANIZZAZIONE SETTIMANALE','Calendario','Modifica i ritiri per ogni utenza. Ogni giorno può contenere più frazioni; i giorni vuoti non prevedono raccolta.')+tabs+body;
  }
  function renderDictionary(){return htmlPage('438 VOCI DI PARTENZA','Dizionario dei rifiuti','Trova rapidamente un rifiuto e modifica il nome, la destinazione e i sinonimi. Il conteggio totale viene aggiornato automaticamente quando aggiungi o elimini una voce.')+renderListEditor('Voci del dizionario',['dizionario','voci'],{emptyName:'Rifiuto'});}
  function renderGuide(){
    const sub=state.sub.guida;
    const tabs=`<div class="toolbar"><div class="section-badges">${[['categorie','Frazioni principali'],['categorie_particolari','Rifiuti particolari'],['istruzioni_generali','Regole generali']].map(([key,title])=>`<button class="button ${sub===key?'button-primary':'button-secondary'} button-small" data-action="sub" data-parent="guida" data-sub="${key}">${title}</button>`).join('')}</div></div>`;
    let body='';
    if(sub==='istruzioni_generali')body=`<div class="card"><div class="card-head"><h2>Modalità generali di conferimento</h2></div>${objectFields(state.data.guida.istruzioni_generali,['guida','istruzioni_generali'])}</div>`;
    else body=renderListEditor('Guida',['guida',sub],{emptyName:'Categoria',searchable:false});
    return htmlPage('INFORMAZIONI SUI MATERIALI','Guida alla differenziata','I testi visualizzati nell’app provengono da queste sezioni. I campi vuoti o gli elenchi non compilati non devono essere sostituiti con contenuti inventati.')+tabs+body;
  }
  function renderAdvice(){return htmlPage('CONTENUTI INFORMATIVI','Consigli utili','I consigli qui modificati alimentano sia la pagina dedicata sia il popup «Lo sapevi?». L’icona è facoltativa: in sua assenza l’app usa un simbolo predefinito.')+renderListEditor('Consigli',['consigli','voci'],{emptyName:'Consiglio',searchable:false});}
  function renderServices(){
    const key=state.sub.servizi, tabs=`<div class="toolbar"><div class="section-badges">${[['contatti','Contatti'],['ritiro_ingombranti','Ingombranti'],['raee','RAEE'],['centri_raccolta','Centri di raccolta']].map(([s,t])=>`<button class="button ${s===key?'button-primary':'button-secondary'} button-small" data-action="sub" data-parent="servizi" data-sub="${s}">${t}</button>`).join('')}</div></div>`;
    let body='';
    if(Array.isArray(state.data.servizi[key]))body=renderListEditor('Servizi',['servizi',key],{emptyName:'Servizio',searchable:false});
    else body=`<section class="card"><div class="card-head"><h2>${esc(label(key))}</h2></div>${objectFields(state.data.servizi[key],['servizi',key])}</section>`;
    return htmlPage('INFORMAZIONI COMUNALI','Servizi comunali','Gestisci contatti, prenotazioni e centri di raccolta. Per la navigazione inserisci coordinate affidabili e mantieni i numeri telefonici senza formattazioni nel JSON.')+tabs+body;
  }
  function renderRecognition(){
    const sub=state.sub.riconoscimento;const tabs=`<div class="toolbar"><div class="section-badges">${[['codici_materiale','Codici ambientali'],['termini_materiale','Termini e sinonimi']].map(([key,t])=>`<button class="button ${sub===key?'button-primary':'button-secondary'} button-small" data-action="sub" data-parent="riconoscimento" data-sub="${key}">${t}</button>`).join('')}</div></div>`;
    return htmlPage('OCR E CODICI','Riconoscimento','Associa codici e parole stampate sugli imballaggi alle frazioni comunali. Queste regole non autorizzano il riconoscimento automatico di materiali incerti.')+tabs+renderListEditor('Riconoscimento',['riconoscimento',sub],{emptyName:'Regola'});
  }
  function renderAdvanced(){
    const current=state.advanced in state.data?state.advanced:'comune';state.advanced=current;
    const entries=HEADERS.filter(([k])=>k in state.data).concat(Object.keys(state.data).filter(k=>!HEADERS.some(([x])=>x===k)).map(k=>[k,label(k)]));
    const select=`<select class="select-standalone" data-role="advanced-select">${entries.map(([k,t])=>`<option value="${esc(k)}" ${k===current?'selected':''}>${esc(t)}</option>`).join('')}</select>`;
    const value=state.data[current];
    let fields='';
    if(isObject(value))fields=objectFields(value,[current]);
    else if(Array.isArray(value))fields=renderField(current,value,[current]);
    else fields=primitiveField(current,value,[current]);
    return htmlPage('STRUTTURA COMPLETA','Campi avanzati','Consulta e modifica anche i campi documentali e tecnici, preservando la struttura originale. Cambiare identificativi o campi usati dall’app richiede particolare attenzione.')+
    `<div class="notice" style="margin-bottom:16px">La validazione aiuta a intercettare errori, ma non può garantire la compatibilità di qualsiasi modifica tecnica. Per le attività ordinarie preferisci le sezioni guidate.</div><section class="card"><div class="card-head"><h2>Sezione JSON</h2>${select}</div>${fields}</section>`;
  }
  function renderChecks(){
    const issues=validate(state.data),bad=issues.filter(x=>x.severity==='error'),warnings=issues.filter(x=>x.severity==='warning');
    let rows=issues.map(x=>`<div class="validation-row ${x.severity}"><span class="marker">${x.severity==='error'?'✕':'!'}</span><div><strong>${esc(x.at)}</strong><div>${esc(x.message)}</div></div></div>`).join('');
    if(!rows)rows='<div class="validation-row good"><span class="marker">✓</span><div>Nessun errore o avviso rilevato dalla validazione automatica.</div></div>';
    return htmlPage('CONTROLLO QUALITÀ','Validazione','Controlli strutturali e di coerenza prima dell’esportazione. Non sostituiscono la verifica delle indicazioni comunali e della correttezza dei testi.')+`<div class="stats"><div class="stat"><div class="stat-icon">✓</div><strong>${bad.length===0?'OK':'NO'}</strong><span>Struttura esportabile</span></div><div class="stat"><div class="stat-icon">✕</div><strong>${bad.length}</strong><span>Errori bloccanti</span></div><div class="stat"><div class="stat-icon">!</div><strong>${warnings.length}</strong><span>Avvisi non bloccanti</span></div><div class="stat"><div class="stat-icon">#</div><strong>${state.data.data_revision??'—'}</strong><span>Revisione attuale</span></div></div><section class="card"><div class="card-head"><h2>Risultati dei controlli</h2>${action('export','↓ Esporta JSON','button-primary')}</div><div class="validation-list">${rows}</div></section>`;
  }

  function validate(d){
    const issues=[], add=(severity,at,message)=>issues.push({severity,at,message}),bad=(at,message)=>add('error',at,message),warn=(at,message)=>add('warning',at,message);
    if(!isObject(d)){bad('JSON','La radice deve essere un oggetto.');return issues;}
    if(typeof d.status!=='string'||!d.status.trim())bad('status','Campo di stato obbligatorio.');
    for(const k of ['ui','contratto_app_calendario'])if(!isObject(d[k]))bad(k,'Sezione tecnica obbligatoria per la compatibilità iOS.');
    if(d.schema_version!==3)bad('schema_version','Il progetto iOS attuale utilizza schema_version = 3.');
    if(typeof d.data_version!=='string'||!d.data_version.trim())bad('data_version','La versione descrittiva deve essere una stringa non vuota.');
    if(d.data_revision!==undefined&&(!Number.isSafeInteger(d.data_revision)||d.data_revision<0))bad('data_revision','La revisione deve essere un numero intero non negativo.');
    if(!isObject(d.comune)||typeof d.comune.identificativo!=='string'||!d.comune.identificativo.trim())bad('comune.identificativo','Identificativo del Comune obbligatorio.');
    else if(d.comune.identificativo!==state.commune)bad('comune.identificativo',`Il file attivo deve appartenere al Comune «${state.commune}».`);
    if(typeof d.comune?.nome!=='string'||!d.comune.nome.trim())bad('comune.nome','Nome del Comune obbligatorio.');
    const validCats=new Set();
    if(!Array.isArray(d.categorie)||!d.categorie.length)bad('categorie','È necessario almeno un tipo di raccolta.');
    else for(const [i,c] of d.categorie.entries()){
      if(!isObject(c)||typeof c.id!=='string'||!c.id.trim())bad(`categorie[${i}]`,'Identificativo mancante.');
      else if(validCats.has(c.id))bad(`categorie[${i}]`,'Identificativo duplicato.');else validCats.add(c.id);
      if(typeof c?.nome!=='string'||!c.nome.trim())bad(`categorie[${i}]`,'Nome mancante.');
    }
    const validProfiles=new Set(),requiredProfiles=new Set(['domestica_centro','non_domestica','domestica_fuori_centro']);
    if(!Array.isArray(d.profili_utenza)||!d.profili_utenza.length)bad('profili_utenza','Nessun profilo di utenza.');
    else for(const [i,p] of d.profili_utenza.entries()){
      if(!p?.id||typeof p.id!=='string')bad(`profili_utenza[${i}]`,'ID profilo mancante.');
      else if(validProfiles.has(p.id))bad(`profili_utenza[${i}]`,'ID profilo duplicato.');else validProfiles.add(p.id);
    }
    if(validProfiles.size!==requiredProfiles.size||[...requiredProfiles].some(p=>!validProfiles.has(p)))bad('profili_utenza','L’app attuale richiede esattamente i tre identificativi di utenza esistenti.');
    if(d.calendario?.giorni_riferiti_a!=='ritiro')bad('calendario.giorni_riferiti_a','L’app attuale richiede il valore \"ritiro\".');
    const r=d.calendario?.ritiri_per_profilo;
    if(!isObject(r))bad('calendario.ritiri_per_profilo','Calendario dei profili mancante.');
    else {
    if(Object.keys(r).length!==requiredProfiles.size||Object.keys(r).some(p=>!requiredProfiles.has(p)))bad('calendario.ritiri_per_profilo','I calendari devono appartenere esattamente alle tre utenze.');
    for(const p of requiredProfiles){
      if(!isObject(r[p])){bad(`calendario.${p}`,'Calendario del profilo mancante.');continue;}
      if(Object.keys(r[p]).length!==DAYS.length||Object.keys(r[p]).some(day=>!DAYS.some(([d])=>d===day)))bad(`calendario.${p}`,'Devono essere presenti esattamente i sette giorni della settimana.');
      for(const [day] of DAYS){
        const a=r[p][day];if(!Array.isArray(a)){bad(`calendario.${p}.${day}`,'Elenco raccolte mancante.');continue;}
        if(new Set(a).size!==a.length)bad(`calendario.${p}.${day}`,'Frazioni duplicate.');
        for(const cat of a)if(!validCats.has(cat))bad(`calendario.${p}.${day}`,`Frazione sconosciuta: ${String(cat)}`);
      }
    }
    }
    if(!Array.isArray(d.dizionario?.voci))bad('dizionario.voci','Elenco dizionario mancante.');
    else{
      const seen=new Set();
      d.dizionario.voci.forEach((item,i)=>{
        if(!item||typeof item.id!=='string'||!item.id.trim())bad(`dizionario[${i}]`,'Identificativo mancante.');
        else if(seen.has(item.id))bad(`dizionario[${i}]`,'Identificativo duplicato.');else seen.add(item.id);
        if(typeof item?.nome_fonte!=='string'||!item.nome_fonte.trim())bad(`dizionario[${i}]`,'Nome del rifiuto mancante.');
        if(typeof item?.destinazione_fonte!=='string'||!item.destinazione_fonte.trim())bad(`dizionario[${i}]`,'Destinazione mancante.');
        if(typeof item?.destinazione_id!=='string'||!item.destinazione_id.trim())bad(`dizionario[${i}]`,'ID destinazione mancante.');
        if(!Array.isArray(item?.sinonimi)||item.sinonimi.some(v=>typeof v!=='string'))bad(`dizionario[${i}].sinonimi`,'L’elenco sinonimi deve contenere soltanto testi.');
        if(!isObject(item?.fonte)||typeof item.fonte.id!=='string'||!item.fonte.id.trim()||!Number.isInteger(item.fonte.pagina_pdf)||item.fonte.pagina_pdf<=0)bad(`dizionario[${i}].fonte`,'La versione iOS attuale richiede fonte.id e pagina_pdf > 0 per ogni voce. Per nuove voci indicare una fonte documentale reale.');
        if(typeof item?.stato!=='string')bad(`dizionario[${i}].stato`,'Campo stato obbligatorio per la compatibilità con iOS.');
      });
      if(d.dizionario.totale_voci!==d.dizionario.voci.length)bad('dizionario.totale_voci','Il totale deve coincidere con il numero effettivo di voci.');
    }
    for(const [key,desc] of [['categorie','frazioni'],['categorie_particolari','rifiuti particolari']]){
      const arr=d.guida?.[key]; if(!Array.isArray(arr))bad(`guida.${key}`,`Elenco ${desc} mancante.`);
      else{const seen=new Set();arr.forEach((x,i)=>{if(!x?.id||!x?.nome)bad(`guida.${key}[${i}]`,'ID e nome richiesti.');else if(seen.has(x.id))bad(`guida.${key}[${i}]`,'Identificativo duplicato.');else seen.add(x.id);});}
    }
    if(!isObject(d.guida?.istruzioni_generali))bad('guida.istruzioni_generali','Istruzioni generali mancanti.');
    else for(const key of ['luogo','quando','come'])if(typeof d.guida.istruzioni_generali[key]!=='string'||!d.guida.istruzioni_generali[key].trim())bad('guida.istruzioni_generali.'+key,'Testo obbligatorio.');
    if(Array.isArray(d.guida?.categorie))d.guida.categorie.forEach((v,i)=>{
      if(typeof v?.come_si_raccoglie_fonte!=='string'||!v.come_si_raccoglie_fonte.trim())bad(`guida.categorie[${i}]`,'Indicazione «Come si raccoglie» obbligatoria.');
      if(!Array.isArray(v?.cosa_si)||!Array.isArray(v?.cosa_no)||!Array.isArray(v?.ricorda)||!Array.isArray(v?.altre_destinazioni))bad(`guida.categorie[${i}]`,'Elenchi materiali e destinazioni devono essere presenti.');
      else {
        if(!v.cosa_si.length&&!v.cosa_no.length)bad(`guida.categorie[${i}]`,'Almeno un materiale da conferire o da non conferire è richiesto.');
        for(const [j,a] of v.altre_destinazioni.entries())if(typeof a?.titolo!=='string'||!Array.isArray(a.materiali))bad(`guida.categorie[${i}].altre_destinazioni[${j}]`,'La destinazione richiede titolo e materiali.');
      }
    });
    if(Array.isArray(d.guida?.categorie_particolari))d.guida.categorie_particolari.forEach((v,i)=>{if(typeof v?.indicazione_fonte!=='string'||!v.indicazione_fonte.trim())bad(`guida.categorie_particolari[${i}]`,'Indicazioni obbligatorie.');});
    if(!Array.isArray(d.consigli?.voci))bad('consigli.voci','Consigli non disponibili.');
    else{
      const ids=new Set();d.consigli.voci.forEach((x,i)=>{
        if(typeof x?.id!=='string'||!x.id.trim())bad(`consigli[${i}]`,'ID del consiglio mancante.');else if(ids.has(x.id))bad(`consigli[${i}]`,'ID duplicato.');else ids.add(x.id);
        if(typeof x?.titolo!=='string'||!x.titolo.trim())bad(`consigli[${i}]`,'Titolo mancante.');
        if(typeof x?.testo_fonte!=='string'||!x.testo_fonte.trim())bad(`consigli[${i}]`,'Testo mancante.');
        if(x?.icona!==undefined&&x.icona!==null&&typeof x.icona!=='string')bad(`consigli[${i}].icona`,'Icona facoltativa, ma deve essere testo o null.');
      });
    }
    if(!isObject(d.servizi))bad('servizi','Servizi comunali mancanti.');
    else {
      if(!Array.isArray(d.servizi.contatti)||!d.servizi.contatti.length)bad('servizi.contatti','Almeno un contatto è richiesto.');
      else d.servizi.contatti.forEach((v,i)=>{if(!v?.nome?.trim()||!v?.telefono?.trim())bad(`servizi.contatti[${i}]`,'Nome e telefono obbligatori.');});
      if(typeof d.servizi.ritiro_ingombranti?.telefono!=='string'||!d.servizi.ritiro_ingombranti.telefono.trim()||typeof d.servizi.ritiro_ingombranti?.descrizione!=='string'||!d.servizi.ritiro_ingombranti.descrizione.trim()||typeof d.servizi.ritiro_ingombranti?.cadenza!=='string'||typeof d.servizi.ritiro_ingombranti?.prenotazione_necessaria!=='boolean')bad('servizi.ritiro_ingombranti','I campi telefono, descrizione, cadenza e prenotazione_necessaria devono essere validi.');
      if(typeof d.servizi.raee?.informazioni!=='string'||!d.servizi.raee.informazioni.trim())bad('servizi.raee','Informazioni RAEE obbligatorie.');
      if(!Array.isArray(d.servizi.centri_raccolta)||!d.servizi.centri_raccolta.length)bad('servizi.centri_raccolta','Almeno un centro di raccolta è richiesto.');
      else d.servizi.centri_raccolta.forEach((v,i)=>{if(!v?.nome?.trim()||!v?.zona?.trim())bad(`servizi.centri_raccolta[${i}]`,'Nome e zona obbligatori.');});
    }
    if(Array.isArray(d.servizi?.centri_raccolta))for(const [i,c] of d.servizi.centri_raccolta.entries()){
      const lat=c?.coordinate?.latitudine,lon=c?.coordinate?.longitudine;
      if(c?.coordinate&&(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180))bad(`servizi.centri_raccolta[${i}].coordinate`,'Coordinate geografiche non valide.');
    }
    if(!isObject(d.riconoscimento))bad('riconoscimento','Regole di riconoscimento mancanti.');
    else for(const [key,field] of [['codici_materiale','codice'],['termini_materiale','termine']]){
      const list=d.riconoscimento[key];if(!Array.isArray(list)||!list.length){bad(`riconoscimento.${key}`,'Elenco mancante o vuoto.');continue;}
      const seen=new Set();list.forEach((item,i)=>{
        const v=item?.[field];if(typeof v!=='string'||!v.trim())bad(`${key}[${i}]`,'Codice o termine non specificato.');
        else {const normalized=field==='codice'?v.replace(/[^A-Za-z0-9]/g,'').toUpperCase():v.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('it');if(seen.has(normalized))bad(`${key}[${i}]`,'Codice/termine duplicato.');else seen.add(normalized);}
        if(!validCats.has(item?.categoria_id))bad(`${key}[${i}]`,'Categoria non presente nelle frazioni di raccolta.');
        if(field==='codice'&&typeof v==='string'&&!/^[A-Z]{2,6} ?[0-9]{1,3}$/.test(v))bad(`${key}[${i}]`,'Formato sigla non valido per l’app iOS (es. PAP 21).');
        if(typeof item?.materiale!=='string'||!item.materiale.trim())bad(`${key}[${i}]`,'Descrizione materiale obbligatoria.');
      });
    }
    if(!('data_revision' in d))warn('data_revision','Il campo numerico verrà aggiunto al primo export (revisione 1). La build iOS attuale non usa ancora questo campo.');
    return issues;
  }

  function render(){
    if(!state.data)return;
    const html={panoramica:renderOverview,calendario:renderCalendar,dizionario:renderDictionary,guida:renderGuide,consigli:renderAdvice,servizi:renderServices,riconoscimento:renderRecognition,avanzate:renderAdvanced,controlli:renderChecks};
    $('main').innerHTML=(html[state.section]||renderOverview)(); updateChrome();
  }

  function createTemplate(path){
    const arr=get(path),schema=arr.find(isObject)||[];
    if(!arr.length&&path.at(-1)==='altre_destinazioni')return {titolo:'',materiali:[]};
    if(!isObject(schema))return arr.find(x=>typeof x==='number')!==undefined?0:'';
    const obj={};
    for(const [key,v] of Object.entries(schema)){
      if(key==='id'){
        const pre=path.join('.')==='dizionario.voci'?'r':path.join('.')==='consigli.voci'?'nuovo_consiglio_':'nuovo_';
        if(pre==='r'){
          const max=arr.reduce((n,x)=>/^r\d+$/.test(x?.id||'')?Math.max(n,Number(x.id.slice(1))):n,0);
          obj[key]='r'+String(max+1).padStart(4,'0');
        }else{
          let num=arr.length+1;while(arr.some(x=>x?.id===pre+num))num++;obj[key]=pre+num;
        }
      } else if(Array.isArray(v))obj[key]=[];
      else if(isObject(v))obj[key]=Object.fromEntries(Object.entries(v).map(([k,x])=>[k,x===null?null:Array.isArray(x)?[]:typeof x==='boolean'?false:typeof x==='number'?0:'']));
      else if(typeof v==='boolean')obj[key]=false;
      else if(typeof v==='number')obj[key]=0;
      else if(v===null)obj[key]=null;
      else obj[key]='';
    }
    // Prefer conventional values in new dictionary entries; the rest stays editable.
    if(path.join('.')==='dizionario.voci'){obj.destinazione_id='secco';obj.destinazione_fonte='Secco residuo (indifferenziato)';}
    if(path.join('.')==='consigli.voci'){delete obj.icona;delete obj.pagina_pdf;obj.verificato=true;}
    return obj;
  }
  async function askConfirm(message){
    const dialog=$('confirmation-dialog');$('dialog-message').textContent=message;
    if(typeof dialog.showModal!=='function')return window.confirm(message);
    return new Promise(resolve=>{
      const done=()=>{dialog.removeEventListener('close',done);resolve(dialog.returnValue==='confirm');};
      dialog.addEventListener('close',done,{once:true});dialog.showModal();
    });
  }
  async function importFile(file){
    if(!file)return;let parsed;
    try{parsed=JSON.parse(await file.text());}catch(e){notify(`File non leggibile come JSON: ${e.message}`,'error');return;}
    const expected=state.commune;
    if(parsed?.comune?.identificativo!==expected){notify(`File di un Comune diverso: atteso «${expected}». Seleziona prima il Comune corretto.`,'error');return;}
    const problems=validate(parsed).filter(x=>x.severity==='error');
    if(problems.length){notify(`Importazione non eseguita: ${problems.length} errori di struttura. Correggi il file prima di importarlo.`,'error');return;}
    if(state.dirty&&!await askConfirm('Hai modifiche non esportate. Importare un nuovo file le sostituirà. Continuare?'))return;
    replaceData(parsed,file.name);notify('JSON importato correttamente. Le modifiche rimangono locali fino all’esportazione.');
  }
  function download(name,content,mime='application/json;charset=utf-8'){
    const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  async function exportData(){
    const issues=validate(state.data),bad=issues.filter(x=>x.severity==='error');
    if(bad.length){switchSection('controlli');notify(`Esportazione bloccata: correggere prima ${bad.length} errore/i.`,'error');return;}
    const current=state.data.data_revision??0,next=current+1;
    if(!Number.isSafeInteger(next)){notify('La revisione numerica non può essere incrementata.','error');return;}
    if(!await askConfirm(`Esportare i dati di ${state.data.comune.nome} con revisione ${next}? Il file sarà scaricato sul dispositivo, NON pubblicato su GitHub o sul dominio.`))return;
    // The local draft becomes the exported revision; the server will not be updated.
    remember();state.data.data_revision=next;modified();
    download('dati.json',JSON.stringify(state.data,null,2)+'\n');
    state.dirty=false;updateChrome();render();notify(`JSON esportato (revisione ${next}). Ricorda di caricarlo separatamente su GitHub e sul dominio.`);
  }
  function applyField(el){
    const p=JSON.parse(el.dataset.path),kind=el.dataset.role,old=get(p);let next;
    if(kind==='bool')next=el.checked;
    else if(kind==='number'){
      if(!el.value.trim()){notify('Il numero non può essere vuoto: usa il tipo Null per un campo facoltativo.','error');el.value=String(old);return;}
      next=Number(el.value);if(!Number.isFinite(next)){notify('Numero non valido.','error');return;}
    }else if(kind==='type')next=el.value==='null'?null:el.value==='string'?'':el.value==='number'?0:false;
    else next=el.value;
    if(Object.is(next,old))return;
    mutate(()=>{const parent=get(p.slice(0,-1));parent[p.at(-1)]=next;});
  }
  async function handleAction(button){
    const action=button.dataset.action;
    if(action==='dismiss-alert'){$('alert-area').innerHTML='';return;}
    if(action==='import'){$('file-input').click();return;}
    if(action==='export'){await exportData();return;}
    if(action==='navigate-validation'){switchSection('controlli');return;}
    if(action==='sub'){
      state.sub[button.dataset.parent]=button.dataset.sub;render();return;
    }
    if(action==='select-record'){
      state.selected[button.dataset.list]=Number(button.dataset.index);render();return;
    }
    if(action==='add-item'){
      const p=JSON.parse(button.dataset.path),arr=get(p);if(!Array.isArray(arr))return;
      mutate(()=>{const x=createTemplate(p);arr.push(x);state.selected[keyPath(p)]=arr.length-1;state.query[keyPath(p)]='';});
      notify('Elemento aggiunto. Completa i campi obbligatori prima di esportare.');return;
    }
    if(action==='ask-delete'||action==='remove-item'){
      const p=JSON.parse(button.dataset.path),i=Number(button.dataset.index),arr=get(p);
      if(!Array.isArray(arr)||!(i>=0&&i<arr.length))return;
      if(!await askConfirm(`Eliminare l’elemento ${i+1} da «${p.map(label).join(' / ')}»? L’azione può essere annullata con il pulsante Annulla.`))return;
      mutate(()=>{arr.splice(i,1);state.selected[keyPath(p)]=Math.min(i,arr.length-1);});return;
    }
    if(action==='move-item'){
      const p=JSON.parse(button.dataset.path),arr=get(p),i=Number(button.dataset.index),j=i+Number(button.dataset.shift);
      if(!Array.isArray(arr)||j<0||j>=arr.length)return;
      mutate(()=>{[arr[i],arr[j]]=[arr[j],arr[i]];});return;
    }
  }
  function undo(){if(!state.undo.length)return;state.redo.push(clone(state.data));state.data=state.undo.pop();modified();render();}
  function redo(){if(!state.redo.length)return;state.undo.push(clone(state.data));state.data=state.redo.pop();modified();render();}
  async function selectCity(id){
    if(id===state.commune)return;
    if(state.dirty&&!await askConfirm('Cambiare Comune scarta le modifiche non esportate. Continuare?')){$('city-select').value=state.commune;return;}
    const item=state.cities.find(x=>x.id===id);if(!item)return;
    try{
      if(location.protocol==='file:')throw Error('La selezione automatica degli altri Comuni richiede GitHub Pages. Importa manualmente il JSON.');
      const res=await fetch('../'+item.file,{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);
      const data=await res.json();if(data?.comune?.identificativo!==id)throw Error('Identificativo Comune non corrispondente.');
      state.commune=id;replaceData(data,item.file);notify('Comune selezionato.');
    }catch(e){$('city-select').value=state.commune;notify(`Impossibile aprire i dati del Comune: ${e.message}`,'error');}
  }
  function attach(){
    document.addEventListener('click',e=>{
      const nav=e.target.closest('[data-section]');if(nav){switchSection(nav.dataset.section);return;}
      const action=e.target.closest('button[data-action]');if(action){void handleAction(action);return;}
    });
    $('menu-button').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
    $('undo-button').addEventListener('click',undo);
    $('redo-button').addEventListener('click',redo);
    $('file-input').addEventListener('change',e=>{void importFile(e.target.files[0]);e.target.value='';});
    $('city-select').addEventListener('change',e=>{void selectCity(e.target.value);});
    $('main').addEventListener('change',e=>{
      const el=e.target;
      if(el.dataset.role==='advanced-select'){state.advanced=el.value;render();return;}
      if(el.dataset.role==='calendar-profile'){state.sub.calendarioProfile=el.value;render();return;}
      if(el.dataset.role==='calendar-check'){
        const {profile,day,category}=el.dataset;
        mutate(()=>{
          const dayList=state.data.calendario.ritiri_per_profilo[profile][day];
          if(el.checked&&!dayList.includes(category))dayList.push(category);
          else if(!el.checked){const ix=dayList.indexOf(category);if(ix>=0)dayList.splice(ix,1);}
        });return;
      }
      if(['bool','number','string','type'].includes(el.dataset.role))applyField(el);
    });
    $('main').addEventListener('input',e=>{
      const el=e.target;if(el.dataset.role!=='search')return;
      const list=el.dataset.list;state.query[list]=el.value;
      const selStart=el.selectionStart;
      render();
      const replacement=Array.from(document.querySelectorAll('input[data-role="search"]')).find(x=>x.dataset.list===list);
      if(replacement){replacement.focus();replacement.setSelectionRange(selStart,selStart);}
    });
    document.addEventListener('keydown',e=>{
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();void exportData();}
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&!e.target.closest('input,textarea')){e.preventDefault();e.shiftKey?redo():undo();}
    });
    window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
  }
  async function init(){
    attach();
    if(location.protocol==='file:'){
      state.commune='pietracatella';replaceData(window.DMS_BUNDLED_DATA,'Copia locale della Fase 7a-fix4');
      notify('Modalità locale: stai usando la copia inclusa nello ZIP. Per modificare un file aggiornato usa «Importa JSON».','warning');return;
    }
    try{
      const m=await fetch('../comuni/index.json',{cache:'no-store'});
      if(m.ok){const index=await m.json();if(Array.isArray(index.comuni)&&index.comuni.length)state.cities=index.comuni;}
      $('city-select').innerHTML=state.cities.map(c=>`<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join('');
    }catch(_){ /* Manifest optional for offline preview. */ }
    try{
      const item=state.cities.find(c=>c.id==='pietracatella')||state.cities[0];
      const res=await fetch('../'+item.file,{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);
      const data=await res.json();if(data?.comune?.identificativo!==item.id)throw Error('Comune non corrispondente');
      state.commune=item.id;replaceData(data,item.file);
    }catch(e){
      state.commune='pietracatella';replaceData(window.DMS_BUNDLED_DATA,'Copia locale inclusa nell’editor');
      notify(`Il JSON pubblicato non è raggiungibile (${e.message}). Stai usando la copia incorporata; controlla prima di esportare.`,'warning');
    }
  }
  void init();
})();
