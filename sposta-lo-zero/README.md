# Sposta lo zero! – webapp V1

Prototipo web interattivo, pensato per essere provato prima in locale e poi pubblicato come sito statico (per esempio con GitHub Pages).

## Cosa contiene

- `index.html` – interfaccia principale
- `styles.css` – grafica responsive
- `src/game-logic.js` – motore matematico separato dall'interfaccia
- `src/app.js` – interazioni, punteggio, modalità e feedback
- `tests/` – test automatici e pagina di test nel browser
- `scripts/dev-server.mjs` – piccolo server locale, senza dipendenze esterne
- `NOTICE.md` – nota su contenuti e attribuzione

## Funzioni implementate

- 2, 3, 4 o 5 carte-cifra
- numero più grande / più piccolo
- aggiunta di una o due carte `0`
- zero in una posizione specifica
- due zeri in posizioni specifiche
- sfide in due fasi: costruisci il numero e poi inserisci lo zero
- sfide in due fasi: costruisci il numero e poi sostituisci una cifra con zero
- modalità Allenamento
- modalità Sprint da 60 secondi
- punteggio e serie di risposte corrette
- suggerimenti
- visualizzazione del valore posizionale
- layout mobile/desktop
- nessuna libreria o servizio esterno

## Testare in locale – metodo consigliato

Serve Node.js (versione moderna). Non è necessario fare `npm install` perché il progetto non ha dipendenze.

```bash
cd sposta-lo-zero-webapp-v1
npm run dev
```

Poi apri:

- gioco: `http://localhost:4173`
- pagina test: `http://localhost:4173/tests/`

Per fermare il server: `Ctrl + C`.

### Alternativa con Python

```bash
cd sposta-lo-zero-webapp-v1
python3 -m http.server 4173
```

Quindi apri `http://localhost:4173`.

> Meglio non aprire direttamente `index.html` con doppio clic: il progetto usa moduli JavaScript e alcuni browser li limitano quando la pagina è aperta come file locale.

## Eseguire i test automatici

```bash
npm test
```

I test verificano diversi casi matematici di riferimento, inclusi massimo/minimo, inserimento dello zero, posizione vincolata e sostituzione con zero.

## Pubblicazione nel repository Numbers

Il gioco è autonomo nella cartella `sposta-lo-zero/` del repository `alicubimilano/numbers`.

- Gioco pubblico: https://alicubimilano.github.io/numbers/sposta-lo-zero/
- Test nel browser: https://alicubimilano.github.io/numbers/sposta-lo-zero/tests/
- Sorgenti: https://github.com/alicubimilano/numbers/tree/main/sposta-lo-zero

Il workflow generale `.github/workflows/deploy-pages.yml` pubblica il gioco senza build e conserva Pari o Dispari alla radice del sito. Per il server locale e i test, eseguire i comandi precedenti da questa cartella.

## Struttura pensata per gli sviluppi successivi

Il motore matematico è separato dall'interfaccia. Questo permette di aggiungere facilmente:

- archivio completo delle carte Sfida
- modalità docente
- selezione manuale delle cifre
- profili/nomi dei giocatori
- salvataggio dei risultati
- classifiche locali
- suoni e micro-animazioni
- installazione come PWA
- backend o database in una fase successiva

## Nota tecnica

La V1 non trasmette dati e non usa cookie, analytics o servizi remoti. Tutto gira nel browser.
