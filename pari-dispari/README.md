# Pari o Dispari? — Alice

Webapp didattica sviluppata per il lavoro con Alice sul riconoscimento dei numeri pari e dispari.

## Versione
V6

## Avvio
Aprire `index.html` nel browser. Non sono necessarie dipendenze o build.

## Pubblicazione
Il frontend è statico ed è pronto per GitHub Pages.

## Dati
Il gioco salva localmente risultati, record e telemetria. Il backend opzionale in `backend/` permette di centralizzare gli eventi in Google Sheets tramite Google Apps Script.

## Note didattiche
- PARI = COPPIA
- DISPARI = INTRUSO
- rappresentazione dei pallini sempre dentro una struttura fissa da 10
- il numero 67 compare sempre una volta nel quadro finale del livello 4 con feedback speciale
- l'utente `test` (case-insensitive) non registra dati