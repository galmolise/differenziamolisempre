from pathlib import Path
from playwright.sync_api import sync_playwright
import json

root=Path(__file__).resolve().parents[1]/'docs/editor'
html=(root/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+ (root/'style.css').read_text()+'</style>').replace('<script defer src="dati-iniziali.js"></script>','').replace('<script defer src="app.js"></script>','')

def check(condition,message):
    assert condition,message
    print('OK -',message)

with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':900},accept_downloads=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html)
 page.add_script_tag(content=(root/'dati-iniziali.js').read_text())
 page.add_script_tag(content=(root/'app.js').read_text())
 page.wait_for_timeout(250)
 check(page.locator('h1').inner_text()=='Panoramica','Panoramica aperta')
 check(page.locator('.stat strong').all_inner_texts()[:3]==['3','438','8'],'Statistiche 3 / 438 / 8')
 page.locator('[data-section="controlli"]').first.click()
 check(page.locator('.stat strong').all_inner_texts()[:2]==['OK','0'],'JSON baseline valido')
 page.locator('[data-section="dizionario"]').first.click()
 check(page.locator('.item-row').count()==170,'Dizionario a caricamento limitato')
 page.locator('input[data-role=search]').fill('abiti')
 check(page.locator('.item-row').count()>=1,'Ricerca nel Dizionario')
 check(page.evaluate('document.activeElement?.dataset.role')=='search','Focus di ricerca mantenuto')
 page.locator('[data-section="calendario"]').first.click()
 check(page.locator('.day-box').count()==7,'Calendario settimanale visibile')
 page.locator('input[data-role="calendar-check"]').first.click()
 check('Modifiche da esportare' in page.locator('#dirty-indicator').inner_text(),'La modifica dei turni segna documento modificato')
 page.locator('#undo-button').click()
 check('Lunedì' in page.locator('main').inner_text(),'Undo dopo modifica calendario')
 page.locator('[data-section="consigli"]').first.click()
 check(page.locator('.item-row').count()==8,'Otto consigli disponibili')
 inp=page.locator('input[data-role="string"][data-path*="titolo"]').first
 inp.fill('Titolo aggiornato test')
 inp.press('Tab')
 check('Titolo aggiornato test' in page.locator('.detail-panel').inner_text(),'Modifica titolo consiglio')
 # create new advice, and verify icon really optional
 page.locator('button[data-action="add-item"]').first.click()
 check(page.locator('.item-row').count()==9,'Nuovo consiglio aggiunto')
 check(page.locator('input[data-path*="icona"]').count()==0,'Icona omessa nel nuovo consiglio')
 # fill new title and text
 for key,value in [('titolo','Nuovo consiglio'),('testo_fonte','Testo nuovo')]:
   ctrl=page.locator(f'[data-role="string"][data-path*="{key}"]').last
   ctrl.fill(value);ctrl.press('Tab')
 page.locator('[data-section="controlli"]').first.click()
 check(page.locator('.stat strong').all_inner_texts()[1]=='0','Documento modificato valido')
 # verify exported JSON contains original untouched fields and amended advice
 page.locator('[data-action="export"]').first.click()
 page.locator('#confirmation-dialog button[value="confirm"]').click()
 with page.expect_download() as dl:
   # first export started from click and download may already be triggered before expect; instead click again
   page.locator('[data-action="export"]').first.click()
   page.locator('#confirmation-dialog button[value="confirm"]').click()
 download=dl.value
 target=Path('/mnt/data/differenziamolisempre_export_qa.json')
 download.save_as(target)
 obj=json.loads(target.read_text())
 check(obj['comune']['identificativo']=='pietracatella','Comune conservato')
 check(obj['dizionario']['totale_voci']==438,'438 voci conservate')
 check(obj['consigli']['voci'][-1]['titolo']=='Nuovo consiglio','Nuovo consiglio esportato')
 check('icona' not in obj['consigli']['voci'][-1],'Icona omessa correttamente')
 check(obj['data_revision']>=1,'Revisione aggiunta automaticamente')
 check(not errors,'Nessun errore JavaScript: '+str(errors))
 page.locator('[data-section="panoramica"]').first.click()
 page.screenshot(path='/mnt/data/differenziamolisempre_editor_preview.png',full_page=False)
 b.close()
