# differenziamolisempre · Gestione dati comunali

**Editor v1.2 — correzione logo:** simbolo del riciclo regolare e correttamente proporzionato nell’intestazione del pannello. Nessun cambiamento ai dati o alle funzionalità.

**Editor v1.1 — aggiornamento grafico:** intestazione con la palette del marchio differenziamolisempre, «molise» in evidenza e simbolo del riciclo al posto della lettera «o». Nessuna modifica ai dati o alle funzioni di editing rispetto alla v1.0.

Repository per **i dati pubblici della raccolta differenziata** e per un editor web statico, indipendente dalle app iOS e Android e da qualsiasi altro CMS.

## Struttura

```text
docs/
  index.html
  comuni/
    index.json
    pietracatella/
      dati.json
  editor/
    index.html
    style.css
    app.js
    dati-iniziali.js
```

Ogni eventuale nuovo Comune avrà una cartella separata in `docs/comuni/<id>/dati.json` e una voce nel manifest `docs/comuni/index.json`. L'editor è condiviso e legge il file del Comune selezionato. Le app comunali dovranno utilizzare soltanto il percorso dei dati del proprio Comune.

## Prima prova sul Mac (senza GitHub)

1. Estrai lo ZIP.
2. Apri `docs/editor/index.html` nel browser. È utilizzabile anche senza server: caricherà una **copia iniziale incorporata** del JSON di Pietracatella.
3. Modifica una voce, verifica i controlli e premi **Esporta JSON**. Il browser scaricherà `dati.json`.
4. Per lavorare su un JSON più recente, usa **Importa JSON** e seleziona il file aggiornato.

Per provare il caricamento HTTP reale in locale, nel Terminale entra nella cartella `docs` e avvia:

```bash
python3 -m http.server 8000
```

Poi apri `http://localhost:8000/editor/`.

## Pubblicazione su GitHub Pages

1. Crea un repository pubblico denominato `differenziamolisempre`.
2. Carica la struttura di questa cartella nella radice del repository.
3. In **Settings → Pages** seleziona **Deploy from a branch**, ramo `main`, cartella `/docs`.
4. Una volta completata la pubblicazione, apri:

   - Editor: `https://NOMEUTENTE.github.io/differenziamolisempre/editor/`
   - JSON Pietracatella: `https://NOMEUTENTE.github.io/differenziamolisempre/comuni/pietracatella/dati.json`

L'app iOS non usa ancora questi indirizzi: verranno configurati nella **Fase 8**, insieme al dominio HTTPS principale e al fallback.

## Modifiche ed esportazione

L'editor lavora **solo nel browser** e non ha permessi di scrittura sulla repository. Nessuna modifica viene pubblicata direttamente e non viene utilizzato alcun token GitHub.

- Importa il JSON attuale oppure carica il documento pubblicato.
- Modifica Calendario, Dizionario, Guida, Consigli, Servizi e Riconoscimento.
- I campi documentali e tecnici sono disponibili in **Campi avanzati**: non è necessario modificarli per le attività normali.
- La sezione **Validazione** controlla struttura, identificativi, frazioni, duplicati e riferimenti principali.
- **Esporta JSON** assegna o incrementa automaticamente il campo numerico `data_revision`. Il campo `schema_version` rimane `3`, e il valore descrittivo `data_version` non viene sovrascritto.
- Per pubblicare un aggiornamento sostituisci il file `docs/comuni/pietracatella/dati.json` nella repository e il corrispondente JSON sul server principale. Verifica che abbiano la **stessa revisione e lo stesso contenuto**.
- La copia `editor/dati-iniziali.js` è uno snapshot **solo per l'apertura locale** (`file://`) e non viene utilizzata su GitHub Pages, quando il file `dati.json` è raggiungibile. Se intendi distribuire spesso pacchetti offline aggiornati, rigenera anche lo snapshot.

### Attenzione sulla compatibilità

Il JSON di partenza è quello della **Fase 7a-fix4 / Fase 7a-fix6**. Il campo `data_revision` viene introdotto nell'esportazione per preparare la gestione delle versioni, ma **l'app iOS attualmente approvata non confronta ancora questa revisione**: tale logica verrà integrata e collaudata nella Fase 8.

**Aggiunta di nuove voci del Dizionario:** l'app iOS attuale richiede i campi documentali `fonte.id` e `fonte.pagina_pdf` (numero positivo) per ogni voce. L'editor blocca l'esportazione se non sono compilati correttamente. **Non inventare pagine PDF:** se la nuova voce non proviene dal documento originale, occorrerà prima aggiornare e collaudare la regola di validazione dell'app nella Fase 8.

**Eccezioni calendario:** l'array `eccezioni_date` è vuoto nell'attuale JSON e il suo schema non è ancora definito nell'app; l'editor evita di creare record senza formato noto.

La validazione controlla la coerenza tecnica più importante, **non certifica la correttezza delle informazioni comunali** e non può garantire la compatibilità con modifiche radicali di struttura. Fare sempre una copia del file precedente; GitHub mantiene inoltre la cronologia dei commit.

Non modificare `schema_version`, gli ID delle frazioni, gli ID dei profili e le chiavi contrattuali senza aggiornare e ricollaudare l'app.

## Privacy e sicurezza

Tutti i dati del JSON pubblicato sono pubblici. Il codice del sito non contiene segreti, non invia i file modificati a servizi esterni e non utilizza dipendenze JavaScript o fogli di stile remoti.

Non inserire nel JSON dati personali, credenziali o token. Pubblica soltanto contenuti adatti alla diffusione pubblica.

### Attribuzione icona

Il simbolo del riciclo incorporato nella testata dell’editor utilizza il pittogramma «recycle» di Font Awesome Free 6.7.2, Copyright Fonticons, Inc., licenza Creative Commons Attribution 4.0 (CC BY 4.0): https://fontawesome.com/license/free.
