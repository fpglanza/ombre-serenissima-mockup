// story.js
// Struttura nodi + risorse + requisiti.
// Le scelte supportano: require, forbid, gain, cost, risk, next (vedi commenti).

window.STORY = {
  nodo_intro: {
    id: "nodo_intro",
    name: "Introduzione",
    text:
      "Un prototipo narrativo a nodi ambientato nella Venezia della Serenissima. " +
      "Potere, simboli e zone d’ombra tra storia e interpretazione.\n\n" +
      "Definisci la tua posizione (sesso, ceto, fazione) e inizia a muoverti tra scelte, risorse e conseguenze.",
    choices: []
  },

  nodo_creazione: {
    id: "nodo_creazione",
    name: "Creazione del personaggio",
    custom: "character",
    text:
      "Scegli chi sei. Da qui in poi alcune strade si apriranno — altre resteranno chiuse — " +
      "e alcune azioni avranno costi diversi a seconda della tua posizione nella città.",
    next: "nodo_ingresso"
  },

  nodo_ingresso: {
    id: "nodo_ingresso",
    name: "Sotto le arcate",
    text:
      "È tardi. La luce si frange sui masegni umidi e Venezia sembra ascoltare. " +
      "Un messaggero ti consegna un sigillo: non è un invito, è una convocazione.\n\n" +
      "La città ha molte facce. Stasera ti chiede di scegliere da quale entrare.",
    choices: [
      {
        label: "Seguire il Canal Grande fino a Palazzo",
        hint: "Via ufficiale, regole chiare.",
        risk: ({ game }) => game.tags.has("ceto:popolano") ? 1 : 0,
        gain: ({ game }) => game.tags.has("ceto:patrizio")
          ? { fama: +1 }
          : { indizi: ["volto_notaio"] },
        next: "nodo_palazzo"
      },
      {
        label: "Tagliare per calli e campielli, senza farsi notare",
        hint: "Via obliqua, orecchio alla città.",
        gain: { indizi: ["segno_sul_muro"] },
        next: "nodo_calli"
      }
    ]
  },

  nodo_palazzo: {
    id: "nodo_palazzo",
    name: "Anticamera del potere",
    text:
      "Nel silenzio dell’anticamera, l’aria sa di cera e tessuti pesanti. " +
      "Un funzionario ti osserva come si osserva un documento: cercando il timbro giusto.\n\n" +
      "Sul tavolo, due oggetti: una mappa commerciale e un piccolo amuleto d’osso.",
    choices: [
      {
        label: "Aprire la mappa e chiedere un nome",
        hint: "Nodo politico (richiede status).",
        require: { tags: ["ceto:patrizio"] },
        gain: { alleati: ["funzionario"] },
        next: "nodo_patto"
      },
      {
        label: "Toccare l’amuleto e ascoltare cosa “risponde”",
        hint: "Nodo simbolico.",
        gain: { oggetti: ["amuleto"] },
        next: "nodo_simbolo"
      },
      {
        label: "Restare in silenzio e osservare",
        hint: "Prendere tempo (meno rischi, meno vantaggi).",
        next: "nodo_patto"
      }
    ]
  },

  nodo_calli: {
    id: "nodo_calli",
    name: "La città laterale",
    text:
      "Ti muovi dove Venezia non posa lo sguardo ufficiale. Una porta socchiusa, una scala che non porta “da nessuna parte”. " +
      "In un cortile interno, qualcuno ha tracciato segni sul muro.\n\n" +
      "Una voce: “Se vuoi capire, decidi cosa sei disposto a perdere.”",
    choices: [
      {
        label: "Chiamare la tua fazione",
        hint: "Un contatto di sponda.",
        gain: ({ game }) => game.tags.has("fazione:castellani")
          ? { alleati: ["barcaiolo_castellani"] }
          : { alleati: ["barcaiolo_nicolotti"] },
        next: "nodo_patto"
      },
      {
        label: "Cercare un passaggio non segnato",
        hint: "Rischioso, ma può aprire scorciatoie.",
        risk: 1,
        gain: { indizi: ["mappa_secondaria"] },
        next: "nodo_simbolo"
      }
    ]
  },

  nodo_simbolo: {
    id: "nodo_simbolo",
    name: "Il segno",
    text:
      "La città parla per simboli: non dicono cosa pensare, ma come guardare. " +
      "Alcuni luoghi sembrano montati come un film: inquadrature, attese, ellissi.\n\n" +
      "Se segui il segno fino in fondo, rischi di cambiare prospettiva per sempre.",
    choices: [
      {
        label: "Seguire il segno fino al punto cieco",
        hint: "Serve un indizio per non perdersi.",
        require: { indizi: ["segno_sul_muro"] },
        risk: 1,
        next: "nodo_finale_C"
      },
      {
        label: "Spezzare il percorso e tornare indietro",
        hint: "Ritorno controllato.",
        next: "nodo_patto"
      }
    ]
  },

  nodo_patto: {
    id: "nodo_patto",
    name: "Il patto",
    text:
      "Ti viene proposta una verità spendibile: ordinata, utile, convincente. " +
      "Ma ogni verità, qui, ha un prezzo che non compare nei registri.\n\n" +
      "Puoi accettare, rifiutare, o tentare di giocare su più tavoli.",
    choices: [
      {
        label: "Accettare il patto",
        hint: "Ottieni vantaggi, aumenti l’esposizione.",
        risk: ({ game }) => game.tags.has("ceto:popolano") ? 1 : 0,
        gain: { denaro: +2, fama: +1 },
        next: "nodo_finale_A"
      },
      {
        label: "Rifiutare e uscire",
        hint: "Rimani libero.",
        gain: { fama: +1 },
        next: "nodo_finale_B"
      },
      {
        label: "Giocare sporco",
        hint: "Serve un alleato.",
        require: { alleati: ["funzionario"] },
        risk: 1,
        next: "nodo_finale_C"
      }
    ]
  },

  nodo_finale_A: {
    id: "nodo_finale_A",
    name: "Finale — Ingranaggio",
    ending: true,
    resultTitle: "Ingranaggio",
    resultText:
      "Accetti. Il sistema ti riconosce: ti concede accesso e ti chiede in cambio fedeltà al suo ritmo. " +
      "Venezia ti apre una porta… e ne chiude altre, senza rumore."
  },

  nodo_finale_B: {
    id: "nodo_finale_B",
    name: "Finale — Soglia",
    ending: true,
    resultTitle: "Soglia",
    resultText:
      "Ti sottrai. Non c’è applauso, né condanna: solo la sensazione di aver evitato una narrazione già scritta. " +
      "Rimani sulla soglia, dove la città è più vera perché non ti deve convincere."
  },

  nodo_finale_C: {
    id: "nodo_finale_C",
    name: "Finale — Camera Oscura",
    ending: true,
    resultTitle: "Camera Oscura",
    resultText:
      "Segui il segno fino al punto cieco. Non trovi “la risposta”, trovi un dispositivo: " +
      "una nuova regia dello sguardo. Da qui, ogni storia è un montaggio — e tu sei dentro l’inquadratura."
  },

  nodo_game_over: {
    id: "nodo_game_over",
    name: "Fine — Margine esaurito",
    ending: true,
    resultTitle: "Margine esaurito",
    resultText:
      "La città ha registrato troppi passi falsi. Per ora, le porte si chiudono. Ricomincia e prova un’altra traiettoria."
  }
};
