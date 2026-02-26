// engine.js
(function(){
  "use strict";

  const els = {
    name: document.getElementById("scene-name"),
    text: document.getElementById("scene-text"),
    custom: document.getElementById("custom"),
    choices: document.getElementById("choices"),
    progress: document.getElementById("progress"),
    startBtn: document.getElementById("startBtn"),
    restartBtn: document.getElementById("restartBtn"),
    log: document.getElementById("log"),
    logList: document.getElementById("logList"),
    endingBox: document.getElementById("ending-box"),
    aside: document.getElementById("aside"),
    hud: document.getElementById("hud"),
  };

  const player = { sex:null, ceto:null, fazione:null };

  const game = {
    viteMax: 3,
    vite: 3,
    tags: new Set(),
    risorse: { oggetti:[], indizi:[], alleati:[], denaro:0, fama:0 },
  };

  window.__OMBRA = { player, game };

  const story = window.STORY || {};
  const START_NODE = "nodo_intro";
  const CHARACTER_NODE = "nodo_creazione";
  const GAME_OVER_NODE = "nodo_game_over";

  let current = story[START_NODE];
  let path = [];

  const isFn = (v) => typeof v === "function";
  const evalMaybeFn = (v, ctx) => isFn(v) ? v(ctx) : v;
  let registroOpenedOnce = false;

  function uniqPush(arr, items){
    for(const it of items){
      if(!arr.includes(it)) arr.push(it);
    }
  }

  function pronome(){
    if(player.sex === "donna") return "Sei una donna";
    if(player.sex === "uomo") return "Sei un uomo";
    return "Sei qualcuno";
  }

  function flavorLine(){
    const first = pronome();
    const rest = [player.ceto, player.fazione].filter(Boolean).join(", ");
    return rest ? `${first}, ${rest}.` : `${first}.`;
  }

  function resetGame(){
    path = [];
    player.sex = player.ceto = player.fazione = null;

    game.viteMax = 3;
    game.vite = 3;
    game.tags = new Set();

    game.risorse.oggetti = [];
    game.risorse.indizi = [];
    game.risorse.alleati = [];
    game.risorse.denaro = 0;
    game.risorse.fama = 0;

    setScene(story[START_NODE]);
  }

  function hasList(reqList, haveList){
    for(const x of reqList){
      if(!haveList.includes(x)) return false;
    }
    return true;
  }

  function hasRequirements(req){
    if(!req) return true;

    if(req.tags){
      for(const t of req.tags){
        if(!game.tags.has(t)) return false;
      }
    }

    if(req.oggetti && !hasList(req.oggetti, game.risorse.oggetti)) return false;
    if(req.indizi && !hasList(req.indizi, game.risorse.indizi)) return false;
    if(req.alleati && !hasList(req.alleati, game.risorse.alleati)) return false;

    if(typeof req.fama === "number" && game.risorse.fama < req.fama) return false;
    if(typeof req.denaro === "number" && game.risorse.denaro < req.denaro) return false;

    return true;
  }

  function violatesForbid(forbid){
    if(!forbid) return false;

    if(forbid.tags){
      for(const t of forbid.tags){
        if(game.tags.has(t)) return true;
      }
    }

    if(forbid.oggetti){
      for(const o of forbid.oggetti){
        if(game.risorse.oggetti.includes(o)) return true;
      }
    }
    if(forbid.indizi){
      for(const i of forbid.indizi){
        if(game.risorse.indizi.includes(i)) return true;
      }
    }
    if(forbid.alleati){
      for(const a of forbid.alleati){
        if(game.risorse.alleati.includes(a)) return true;
      }
    }

    return false;
  }

  function applyGain(gain){
    if(!gain) return;
    if(isFn(gain)) gain = gain({ game, player });

    if(gain.oggetti) uniqPush(game.risorse.oggetti, gain.oggetti);
    if(gain.indizi) uniqPush(game.risorse.indizi, gain.indizi);
    if(gain.alleati) uniqPush(game.risorse.alleati, gain.alleati);

    if(typeof gain.denaro === "number") game.risorse.denaro += gain.denaro;
    if(typeof gain.fama === "number") game.risorse.fama += gain.fama;
  }

  function applyCost(cost){
    if(!cost) return true;
    if(isFn(cost)) cost = cost({ game, player });

    if(typeof cost.denaro === "number"){
      if(game.risorse.denaro < cost.denaro) return false;
      game.risorse.denaro -= cost.denaro;
    }
    if(typeof cost.fama === "number"){
      if(game.risorse.fama < cost.fama) return false;
      game.risorse.fama -= cost.fama;
    }

    if(cost.oggetti){
      for(const o of cost.oggetti){
        const idx = game.risorse.oggetti.indexOf(o);
        if(idx === -1) return false;
        game.risorse.oggetti.splice(idx, 1);
      }
    }
    if(cost.indizi){
      for(const i of cost.indizi){
        const idx = game.risorse.indizi.indexOf(i);
        if(idx === -1) return false;
        game.risorse.indizi.splice(idx, 1);
      }
    }
    if(cost.alleati){
      for(const a of cost.alleati){
        const idx = game.risorse.alleati.indexOf(a);
        if(idx === -1) return false;
        game.risorse.alleati.splice(idx, 1);
      }
    }

    return true;
  }

  function applyRisk(risk){
    if(!risk) return true;
    risk = evalMaybeFn(risk, { game, player });

    if(typeof risk !== "number" || risk <= 0) return true;

    game.vite -= risk;
    if(game.vite <= 0){
      setScene(story[GAME_OVER_NODE]);
      return false;
    }
    return true;
  }

  function computeProgress(node){
    const total = 6;
    if(!node) return { cur: 0, total };
    if(node.id === START_NODE) return { cur: 0, total };
    if(node.id === CHARACTER_NODE) return { cur: 1, total };
    const cur = Math.min(2 + path.length, total);
    return { cur, total };
  }

  function renderHUD(){
    if(!els.hud || !els.hudPanel) return;

    const anyIdentity = player.sex || player.ceto || player.fazione;
    const hasAnyResource =
      game.risorse.oggetti.length || game.risorse.indizi.length || game.risorse.alleati.length ||
      game.risorse.denaro || game.risorse.fama;

    // mostra il registro solo dopo l’intro e se ha senso mostrarlo
    const show = (current && current.id !== START_NODE) && (anyIdentity || hasAnyResource);

    els.hud.classList.toggle("is-visible", show);
    if(!show) return;

    const identita = [];
    if(player.sex) identita.push(`<span class="hudItem">Sesso: <strong>${player.sex}</strong></span>`);
    if(player.ceto) identita.push(`<span class="hudItem">Ceto: <strong>${player.ceto}</strong></span>`);
    if(player.fazione) identita.push(`<span class="hudItem">Fazione: <strong>${player.fazione}</strong></span>`);

    const risorse = [];
    risorse.push(`<span class="hudItem">Fama: <strong>${game.risorse.fama}</strong></span>`);
    risorse.push(`<span class="hudItem">Denaro: <strong>${game.risorse.denaro}</strong></span>`);
    risorse.push(`<span class="hudItem">Oggetti: <strong>${game.risorse.oggetti.length}</strong></span>`);
    risorse.push(`<span class="hudItem">Indizi: <strong>${game.risorse.indizi.length}</strong></span>`);
    risorse.push(`<span class="hudItem">Alleati: <strong>${game.risorse.alleati.length}</strong></span>`);

    const margine = [];
    margine.push(`<span class="hudItem"><strong>Margine: ${Math.max(0, game.vite)}/${game.viteMax}</strong></span>`);

    els.hudPanel.innerHTML = `
      <div class="hudGrid">
        <div class="hudBlock">
          <div class="hudTitle">Identità</div>
          <div class="hudRow">${identita.join("") || `<span class="hudItem"><strong>—</strong></span>`}</div>
        </div>

        <div class="hudBlock">
          <div class="hudTitle">Risorse</div>
          <div class="hudRow">${risorse.join("")}</div>
        </div>

        <div class="hudBlock">
          <div class="hudTitle">Margine</div>
          <div class="hudRow">${margine.join("")}</div>
        </div>
      </div>
    `;

    // auto-apri una volta dopo la creazione personaggio (se vuoi)
    // (puoi commentare questa riga se preferisci sempre chiuso)
    if (!registroOpenedOnce && current.id === "nodo_ingresso") {
      registroOpenedOnce = true;
      els.hud.classList.add("is-open");
      if (els.hudToggle) els.hudToggle.setAttribute("aria-expanded", "true");
    }
  }

  function renderEnding(node){
    els.endingBox.style.display = "block";
    els.endingBox.innerHTML =
      `<strong>${node.resultTitle || node.name}</strong>` +
      `<div style="margin-top:6px;color:var(--muted)">${node.resultText || ""}</div>`;
  }

  function renderLog(show){
    if(!path.length){
      els.log.style.display = "none";
      return;
    }
    els.log.style.display = show ? "block" : "block";
    els.logList.innerHTML = "";
    path.forEach(step => {
      const li = document.createElement("li");
      li.textContent = `${step.scene} → ${step.choice}`;
      els.logList.appendChild(li);
    });
  }

  function choose(choice){
    const req = evalMaybeFn(choice.require, { game, player });
    const forb = evalMaybeFn(choice.forbid, { game, player });

    if(req && !hasRequirements(req)) return;
    if(forb && violatesForbid(forb)) return;

    if(choice.cost && !applyCost(choice.cost)) return;

    applyGain(choice.gain);

    if(!applyRisk(choice.risk)) return;

    if (els.hud && (choice.gain || choice.cost || choice.risk)) {
      els.hud.classList.add("pulse");
      setTimeout(() => els.hud.classList.remove("pulse"), 220);
    }

    const nextId = evalMaybeFn(choice.next, { game, player });
    if(nextId && story[nextId]) setScene(story[nextId]);
  }

  function setScene(node){
    current = node;

    if(els.aside){
      els.aside.style.display = (node && node.id === START_NODE) ? "" : "none";
    }

    els.custom.innerHTML = "";
    els.choices.innerHTML = "";
    els.endingBox.style.display = "none";

    els.name.textContent = node?.name || "";
    const baseText = node?.text || "";
    const addFlavor = node && node.id !== START_NODE && (player.sex || player.ceto || player.fazione);
    const fl = addFlavor ? `\n\n${flavorLine()}` : "";
    els.text.textContent = baseText + fl;

    const p = computeProgress(node);
    els.progress.textContent = `${p.cur} / ${p.total}`;

    els.startBtn.style.display = (node && node.id === START_NODE) ? "inline-block" : "none";
    els.restartBtn.style.display = (node && node.ending) ? "inline-block" : "none";

    renderHUD();

    if(node && node.ending){
      renderEnding(node);
      renderLog(true);
      return;
    }

    if(node && node.custom === "character"){
      renderCharacterCreator(node);
      renderLog(false);
      return;
    }

    const choices = node?.choices || [];
    const visible = choices.filter(c => {
      const req = evalMaybeFn(c.require, { game, player });
      const forb = evalMaybeFn(c.forbid, { game, player });
      return hasRequirements(req) && !violatesForbid(forb);
    });

    visible.forEach(c => {
      const btn = document.createElement("button");
      btn.className = "choice";
      btn.type = "button";
      btn.innerHTML = `${c.label}<small>${c.hint || ""}</small>`;
      btn.addEventListener("click", () => {
        path.push({ scene: node.name, choice: c.label });
        choose(c);
        renderHUD();
      });
      els.choices.appendChild(btn);
    });

    renderLog(false);
  }

  function renderCharacterCreator(node){
    const container = document.createElement("div");

    const groups = [
      {
        key: "sex",
        title: "Sesso",
        options: [
          { value: "uomo", label: "Uomo", hint: "Accesso più diretto ai luoghi formali. Esporsi costa meno." },
          { value: "donna", label: "Donna", hint: "Rete informale più forte. Alcune porte richiedono mediazioni." },
        ]
      },
      {
        key: "ceto",
        title: "Ceto",
        options: [
          { value: "patrizio", label: "Patrizio", hint: "Palazzi, regole, favori. Sei riconosciuto — e osservato." },
          { value: "popolano", label: "Popolano", hint: "Calli, lavoro, voci. Hai accesso a ciò che il potere ignora." },
        ]
      },
      {
        key: "fazione",
        title: "Fazione",
        options: [
          { value: "castellani", label: "Castellani", hint: "Sponda di San Marco. Orgoglio, tradizione, gerarchie." },
          { value: "nicolotti", label: "Nicolotti", hint: "Sponda di San Nicolò. Rivalità antiche, solidarietà di riva." },
        ]
      },
    ];

    groups.forEach(g => {
      const box = document.createElement("div");
      box.className = "optGroup";
      box.innerHTML = `<h4>${g.title}</h4>`;
      const grid = document.createElement("div");
      grid.className = "optGrid";

      g.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "optBtn";
        btn.innerHTML = `${opt.label}<small style="display:block;color:var(--muted);margin-top:4px;font-size:12px">${opt.hint}</small>`;
        btn.addEventListener("click", () => {
          player[g.key] = opt.value;
          [...grid.querySelectorAll(".optBtn")].forEach(b => b.classList.remove("selected"));
          btn.classList.add("selected");
          updateContinue();
          renderHUD();
        });
        grid.appendChild(btn);
      });

      box.appendChild(grid);
      container.appendChild(box);
    });

    els.custom.appendChild(container);

    const cont = document.createElement("button");
    cont.className = "choice";
    cont.type = "button";
    cont.disabled = true;
    cont.innerHTML = `Entra in città<small>Conferma il personaggio e prosegui.</small>`;

    cont.addEventListener("click", () => {
      game.tags = new Set([
        `sesso:${player.sex}`,
        `ceto:${player.ceto}`,
        `fazione:${player.fazione}`,
      ]);

      path.push({ scene: "Creazione del personaggio", choice: `Sesso: ${player.sex}` });
      path.push({ scene: "Creazione del personaggio", choice: `Ceto: ${player.ceto}` });
      path.push({ scene: "Creazione del personaggio", choice: `Fazione: ${player.fazione}` });

      game.viteMax = 3;
      game.vite = 3;

      setScene(story[node.next]);
    });

    els.choices.appendChild(cont);

    function updateContinue(){
      cont.disabled = !(player.sex && player.ceto && player.fazione);
    }
  }

  els.startBtn.addEventListener("click", () => setScene(story[CHARACTER_NODE]));
  els.restartBtn.addEventListener("click", resetGame);

  setScene(story[START_NODE]);
})();
