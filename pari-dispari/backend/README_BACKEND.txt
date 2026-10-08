BACKEND / SALVATAGGIO CENTRALE

La V6 registra già in modo automatico, invisibile durante il gioco:
- ogni risposta;
- numero proposto;
- corretto/errato;
- livello e quadro;
- tempo trascorso del livello;
- tempo totale della sessione;
- errori;
- pause;
- salti manuali;
- completamenti;
- nuovi record;
- apparizione del 67.

Questi dati oggi vengono salvati nel browser (localStorage), quindi restano sullo stesso dispositivo.
Il pulsante "Cancella i recenti" NON cancella:
1. i record storici;
2. il log analitico.

UTENTE TEST
Se il nome, ignorando maiuscole/minuscole e spazi, è esattamente "test", la V6 non registra:
- risultati recenti;
- record;
- log analitici;
- dati remoti.

PER AVERE UN BACKEND CENTRALE
GitHub Pages da solo è statico: può pubblicare la webapp, ma non può essere il database.
La soluzione più coerente con l'archivio Alice è:
- GitHub Pages = frontend;
- Google Apps Script = endpoint;
- Google Sheet = archivio eventi.

Code.gs contiene già l'endpoint di base. Serve una sola distribuzione iniziale di Apps Script.
Dopo aver inserito l'URL nel file config.js, gli eventi vengono inviati automaticamente.
Se la rete non risponde, restano in coda nel browser e vengono ritentati alla successiva attività.

In questo modo il Google Sheet centrale può essere letto e analizzato in seguito senza dipendere dal dispositivo usato per giocare.