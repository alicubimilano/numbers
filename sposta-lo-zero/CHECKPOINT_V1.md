# Checkpoint — Sposta lo zero! V1

Data: 9 ottobre 2026.
Stato: prototipo importato dal pacchetto fornito da Mauro; da testare con Alice.

## Funziona
- Gioco autonomo in `sposta-lo-zero/`, con percorsi relativi e senza build.
- Livelli Base, Medio e Avanzato; da 2 a 5 carte-cifra.
- Numero massimo/minimo, uno o due zeri, posizioni vincolate.
- Sfide in due fasi con inserimento o sostituzione di zero.
- Allenamento, Sprint 60 secondi, punteggio, serie, suggerimenti e valore posizionale.
- Test matematici inclusi: 13/13 superati prima della pubblicazione.

## Cosa cambia
- Importazione dei sorgenti originali nel repository generale Numbers.
- README adattato alla pubblicazione in sottocartella.
- Workflow Pages esteso al nuovo gioco; Pari o Dispari resta alla radice.
- Nessuna modifica a HTML, CSS, motore matematico o interazioni del prototipo.

## Limiti e sviluppi sospesi
- Nessun backend, profilo giocatore o archivio persistente dei risultati.
- Nessuna integrazione con Pari o Dispari.
- Valutazione didattica e rifiniture rimandate ai test con Alice.
- Attribuzione editoriale del materiale di origine da completare: vedere NOTICE.md, conservato dal pacchetto.

## Recuperabilità
L'importazione ha un commit dedicato. Il branch `frozen-pari-dispari-v6` non viene modificato.
