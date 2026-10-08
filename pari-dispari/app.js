
(()=>{
  "use strict";

  const app=document.getElementById("app");
  const tint=document.getElementById("tint");
  const pauseOverlay=document.getElementById("pauseOverlay");
  const resumeBtn=document.getElementById("resumeBtn");
  const magic67=document.getElementById("magic67");

  const STORE={
    recent:"pdAliceV3_recent",
    history:"pdAliceV3_recordHistory",
    analytics:"pdAliceV3_analytics",
    sync:"pdAliceV3_syncQueue"
  };

  const AVATARS=[
    {id:"princess",label:"PRINCIPESSA",icon:"👑",bg:"#fde8f1",accent:"#d96f9f",soft:"#fff0f6"},
    {id:"space",label:"SPAZIALE",icon:"🚀",bg:"#e8edff",accent:"#627bd8",soft:"#eef1ff"},
    {id:"rock",label:"ROCK",icon:"🎸",bg:"#f0e9ff",accent:"#8b68c9",soft:"#f5f0ff"},
    {id:"detective",label:"DETECTIVE",icon:"🕵️‍♀️",bg:"#eef1e8",accent:"#74875d",soft:"#f3f6ee"},
    {id:"sport",label:"SPORTIVA",icon:"🏃‍♀️",bg:"#e8f7f3",accent:"#4a9e88",soft:"#eefaf7"},
    {id:"rainbow",label:"ARCOBALENO",icon:"🌈",bg:"#fff1df",accent:"#e4913f",soft:"#fff6eb"}
  ];

  const LABELS={
    FULL:"PERCORSO COMPLETO",
    L1:"LIVELLO 1 · RISCALDAMENTO",
    L2:"LIVELLO 2 · RICONOSCI IL NUMERO",
    L3:"LIVELLO 3 · PARI SU / DISPARI GIÙ",
    L4:"LIVELLO 4 · PARI O DISPARI?"
  };

  const state={
    player:"ALICE", avatar:AVATARS[0], mode:"FULL",
    activeLevel:null, stage:null, attempts:0, correct:0, streak:0, current:null,
    levelErrors:0, sessionErrors:0, manualJump:false,
    l1Index:0, l3phase:0, l3pos:{}, l4count:0, highSeq:[], high67Shown:false,
    sessionStart:0, levelStart:0, pausedAt:null, pausedSession:0, pausedLevel:0,
    sessionId:null, events:[]
  };

  function load(key,def=[]){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(def))}catch(e){return def}}
  function save(key,val){localStorage.setItem(key,JSON.stringify(val))}
  function uid(){return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2)}
  function now(){return performance.now()}
  function iso(){return new Date().toISOString()}
  function formatMs(ms){
    ms=Math.max(0,Math.round(ms||0));
    const m=Math.floor(ms/60000),s=Math.floor((ms%60000)/1000),d=Math.floor((ms%1000)/100);
    return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${d}`;
  }
  function today(){return new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date())}
  function isTestPlayer(){return (state.player||"").trim().toLowerCase()==="test"}
  function sessionElapsed(){const end=state.pausedAt||now(); return state.sessionStart?end-state.sessionStart-state.pausedSession:0}
  function levelElapsed(){const end=state.pausedAt||now(); return state.levelStart?end-state.levelStart-state.pausedLevel:0}
  function applyAvatar(a){
    state.avatar=a;
    document.documentElement.style.setProperty("--accent",a.accent);
    document.documentElement.style.setProperty("--accent-soft",a.soft);
  }
  function identity(){return `${state.player||"ALICE"} · ${state.avatar.label}`}
  function shuffled(a){return [...a].sort(()=>Math.random()-.5)}
  function rnd(a,b){return Math.floor(Math.random()*(b-a+1))+a}
  function even(n){return n%2===0}
  function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

  /* Hidden analytics: every meaningful event is persisted immediately.
     TEST users never write recent results, records, analytics, or remote events. */
  function logEvent(type,data={}){
    if(isTestPlayer())return;
    const ev={
      id:uid(),ts:Date.now(),at:iso(),sessionId:state.sessionId,
      player:state.player,avatar:state.avatar.id,mode:state.mode,
      activeLevel:state.activeLevel,stage:state.stage,type,
      sessionMs:Math.round(sessionElapsed()),levelMs:Math.round(levelElapsed()),
      ...data
    };
    const arr=load(STORE.analytics,[]);
    arr.push(ev); save(STORE.analytics,arr);
    const q=load(STORE.sync,[]);q.push(ev);save(STORE.sync,q);
    flushSync();
  }
  function backendUrl(){
    const params=new URLSearchParams(window.location.search);
    const oneTime=params.get("backend");
    if(oneTime && /^https:\/\//i.test(oneTime)){
      localStorage.setItem("pdAlice_backend_url",oneTime.trim());
      params.delete("backend");
      const next=window.location.pathname+(params.toString()?"?"+params.toString():"")+window.location.hash;
      window.history.replaceState({},"",next);
    }
    return (window.ALICE_BACKEND_URL||localStorage.getItem("pdAlice_backend_url")||"").trim();
  }

  async function flushSync(){
    const url=backendUrl();
    if(!url||isTestPlayer())return;
    const batch=load(STORE.sync,[]);
    if(!batch.length)return;
    try{
      // text/plain + no-cors evita il preflight CORS con una Web App Apps Script.
      // Il backend deduplica gli eventi tramite id, quindi eventuali ritentativi sono sicuri.
      await fetch(url,{
        method:"POST",
        mode:"no-cors",
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify({source:"numbersPRV-pari-dispari-v6",events:batch})
      });
      const sent=new Set(batch.map(e=>e.id));
      const remaining=load(STORE.sync,[]).filter(e=>!sent.has(e.id));
      save(STORE.sync,remaining);
    }catch(e){/* resta in coda e verrà ritentato */ }
  }
  window.ALICE_GAME_DATA={
    recent:()=>load(STORE.recent,[]),
    history:()=>load(STORE.history,[]),
    analytics:()=>load(STORE.analytics,[]),
    export:()=>JSON.stringify({
      recent:load(STORE.recent,[]),
      history:load(STORE.history,[]),
      analytics:load(STORE.analytics,[])
    },null,2)
  };

  function tenFrame(n,{compact=false,highlightIntruder=false}={}){
    let h=`<div class="tenFrame ${compact?"compact":""}">`;
    for(let i=1;i<=10;i++){
      const visible=i<=n;
      const intruder=highlightIntruder && n%2===1 && i===n;
      h+=`<span class="dot ${visible?"":"empty"} ${intruder?"intruder":""}"></span>`;
    }
    return h+"</div>";
  }
  function miniTen(n){
    let h='<div class="miniTen">';
    for(let i=1;i<=10;i++)h+=`<i class="${i<=n?"":"empty"}"></i>`;
    return h+"</div>";
  }
  function progress(pct,text){
    return `<div class="progress"><div class="progressBar"><i style="width:${Math.max(0,Math.min(100,pct))}%"></i></div><div class="progressText">${text}</div></div>`;
  }
  function flash(ok){
    tint.className=`tint ${ok?"ok":"no"} show`;
    setTimeout(()=>tint.className="tint",190);
  }
  function feedback(msg,ok){
    const el=document.getElementById("feedback");
    if(el){el.textContent=msg;el.className=`feedback ${ok?"ok":"no"}`}
    flash(ok);
  }

  function play67Sound(){
    try{
      const C=window.AudioContext||window.webkitAudioContext;
      const ctx=new C();
      [523.25,659.25,783.99,1046.5].forEach((f,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type="sine";o.frequency.value=f;
        g.gain.setValueAtTime(0.0001,ctx.currentTime+i*.09);
        g.gain.exponentialRampToValueAtTime(.18,ctx.currentTime+i*.09+.02);
        g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+i*.09+.28);
        o.connect(g);g.connect(ctx.destination);o.start(ctx.currentTime+i*.09);o.stop(ctx.currentTime+i*.09+.32);
      });
    }catch(e){}
  }
  function celebrate67(){
    if(state.high67Shown)return;
    state.high67Shown=true;
    magic67.classList.remove("hidden");
    play67Sound();
    logEvent("magic_67_shown",{number:67});
    setTimeout(()=>magic67.classList.add("hidden"),1300);
  }

  function splash(){
    app.innerHTML=`
      <section class="splash" id="splashTap">
        <div class="splashInner">
          <div class="splashTitle">PARI O DISPARI?</div>
          <div class="splashSub">PARI = COPPIA · DISPARI = INTRUSO</div>
          <div class="conceptGrid">
            <div class="conceptCard">
              <div class="prompt">4 È PARI</div>
              ${tenFrame(4,{compact:true})}
              <h2>COPPIE COMPLETE</h2>
              <p>NESSUN INTRUSO</p>
            </div>
            <div class="conceptCard">
              <div class="prompt">7 È DISPARI</div>
              ${tenFrame(7,{compact:true,highlightIntruder:true})}
              <h2>C'È UN INTRUSO</h2>
              <p>UNA PALLINA RESTA SOLA</p>
            </div>
          </div>
          <button class="primary" id="enterBtn">ENTRA NEL GIOCO</button>
          <div class="tapHint">PUOI ANCHE TOCCARE LA SCHERMATA</div>
        </div>
      </section>`;
    const go=()=>choosePlayer();
    document.getElementById("enterBtn").onclick=e=>{e.stopPropagation();go()};
    document.getElementById("splashTap").onclick=go;
  }

  function commonHead(title,sub,showRecords=true,showHome=true){
    return `<div class="screenHead">
      <div><div class="screenTitle">${title}</div><div class="screenSub">${sub||""}</div></div>
      <div class="headActions">
        ${showRecords?'<button class="iconBtn" id="recordsCross">🏆 I RECORD DI ALICE</button>':""}
        ${showHome?'<button class="iconBtn" id="homeCross">⌂ HOME</button>':""}
      </div>
    </div>`;
  }
  function bindHeaderActions(backFn){
    const r=document.getElementById("recordsCross");
    if(r)r.onclick=()=>showRecords(backFn);
    const h=document.getElementById("homeCross");
    if(h)h.onclick=splash;
  }

  function choosePlayer(){
    app.innerHTML=`<section class="screen">
      ${commonHead("CHI VUOI ESSERE OGGI?","Scrivi il nome e poi scegli il personaggio: il personaggio ti porta subito alla scelta del gioco.")}
      <div class="panel avatarScreenBody">
        <input id="playerName" class="nameInput heroName" value="${escapeHtml(state.player)}" maxlength="28" aria-label="Nome giocatore">
        <div class="avatarGrid">
          ${AVATARS.map(a=>`<button class="avatarCard ${a.id===state.avatar.id?"selected":""}" data-id="${a.id}">
            <div class="avatarFace" style="background:${a.bg}">${a.icon}</div><b>ALICE ${a.label}</b>
          </button>`).join("")}
        </div>
      </div>
    </section>`;
    bindHeaderActions(choosePlayer);
    const inp=document.getElementById("playerName");
    inp.focus();
    inp.oninput=e=>{e.target.value=e.target.value.toUpperCase();state.player=e.target.value;};
    app.querySelectorAll(".avatarCard").forEach(b=>b.onclick=()=>{
      state.player=(inp.value||"ALICE").trim().toUpperCase()||"ALICE";
      applyAvatar(AVATARS.find(a=>a.id===b.dataset.id));
      chooseMode();
    });
  }

  function modeCard(mode,title,desc){
    return `<button class="modeBtn ${state.mode===mode?"selected":""}" data-mode="${mode}">
      <strong>${title}</strong><span>${desc}</span>
    </button>`;
  }
  function chooseMode(){
    app.innerHTML=`<section class="screen">
      ${commonHead("COME GIOCHIAMO?",`${identity()} · Tocca direttamente la modalità per iniziare.`)}
      <div class="panel">
        <div class="modeGrid">
          ${modeCard("FULL","PERCORSO COMPLETO","Livelli 1 → 2 → 3 → 4. Nel percorso completo puoi anche tornare indietro o saltare avanti.")}
          ${modeCard("L1","LIVELLO 1 · RISCALDAMENTO","Da 1 a 10 e ritorno, scrivendo il numero visto nei pallini.")}
          ${modeCard("L2","LIVELLO 2 · RICONOSCI IL NUMERO","Pallini → simbolo numerico: scelta multipla e poi scrittura.")}
          ${modeCard("L3","LIVELLO 3 · PARI SU / DISPARI GIÙ","Sposta le tessere: pari in alto, dispari in basso.")}
          ${modeCard("L4","LIVELLO 4 · PARI O DISPARI?","Pallini e poi numeri sempre più grandi, fino a 100.")}
        </div>
      </div>
    </section>`;
    bindHeaderActions(chooseMode);
    app.querySelectorAll(".modeBtn").forEach(b=>b.onclick=()=>{
      state.mode=b.dataset.mode;
      startGame();
    });
  }

  function gameShell(content){
    app.innerHTML=`<div class="gameWrap">
      <div class="gameTop">
        <div class="gameIdentity">
          <div class="miniAvatar">${state.avatar.icon}</div>
          <div><b>${escapeHtml(identity())}</b><div class="screenSub">${LABELS[state.activeLevel]||""}</div></div>
        </div>
        <div class="headActions">
          <button class="iconBtn" id="gameRecords">🏆 RECORD</button>
          <button class="iconBtn" id="pauseBtn">⏸ PAUSA</button>
          <button class="iconBtn" id="homeBtn">⌂ HOME</button>
        </div>
      </div>
      <nav id="jumpNav" class="jumpNav ${state.mode==="FULL"?"":"hidden"}"></nav>
      <section class="panel">${content}</section>
    </div>`;
    document.getElementById("gameRecords").onclick=()=>showRecords(()=>renderCurrentStage());
    document.getElementById("pauseBtn").onclick=pause;
    document.getElementById("homeBtn").onclick=()=>{if(confirm("TORNARE ALLA SCHERMATA INIZIALE? LA PROVA IN CORSO RESTERÀ NEI DATI DI ATTIVITÀ MA NON SARÀ UN RISULTATO COMPLETATO.")){logEvent("session_abandoned");splash()}};
    setupJumpNav();
  }
  function setupJumpNav(){
    const nav=document.getElementById("jumpNav");if(!nav||state.mode!=="FULL")return;
    nav.innerHTML=["L1","L2","L3","L4"].map(l=>`<button class="${l===state.activeLevel?"active":""}" data-l="${l}">${LABELS[l].replace("LIVELLO ","L")}</button>`).join("");
    nav.querySelectorAll("button").forEach(b=>b.onclick=()=>{
      const l=b.dataset.l;if(l===state.activeLevel)return;
      state.manualJump=true;logEvent("manual_jump",{from:state.activeLevel,to:l});startLevel(l,false);
    });
  }

  function pause(){
    if(state.pausedAt)return;state.pausedAt=now();pauseOverlay.classList.remove("hidden");logEvent("pause");
  }
  resumeBtn.onclick=()=>{
    if(!state.pausedAt)return;
    const d=now()-state.pausedAt;state.pausedSession+=d;state.pausedLevel+=d;state.pausedAt=null;
    pauseOverlay.classList.add("hidden");logEvent("resume");
  };

  function startGame(){
    state.sessionId=uid();state.manualJump=false;state.sessionErrors=0;state.events=[];
    state.sessionStart=now();state.pausedSession=0;state.pausedAt=null;
    logEvent("session_start",{selectedMode:state.mode});
    startLevel(state.mode==="FULL"?"L1":state.mode,false);
  }
  function startLevel(level){
    state.activeLevel=level;state.levelStart=now();state.pausedLevel=0;state.levelErrors=0;
    state.attempts=0;state.correct=0;state.streak=0;state.current=null;
    logEvent("level_start",{level});
    if(level==="L1")startL1();
    if(level==="L2")startL2A();
    if(level==="L3")startL3();
    if(level==="L4")startL4Dots();
  }

  function recordAnswer(payload){
    logEvent("answer",{...payload,attempt:state.attempts,streak:state.streak});
  }
  function saveCompletion(level){
    const result={
      id:uid(),ts:Date.now(),date:today(),player:identity(),playerRaw:state.player,avatar:state.avatar.id,
      level,label:LABELS[level],timeMs:Math.round(level==="FULL"?sessionElapsed():levelElapsed()),
      errors:level==="FULL"?state.sessionErrors:state.levelErrors,sessionId:state.sessionId
    };
    if(isTestPlayer())return {result,isRecord:false,rank:null};
    const recent=load(STORE.recent,[]);recent.push(result);save(STORE.recent,recent);

    const history=load(STORE.history,[]);
    const prior=history.filter(r=>r.level===level);
    const best=prior.length?prior.reduce((a,b)=>a.timeMs<b.timeMs||(a.timeMs===b.timeMs&&a.errors<=b.errors)?a:b):null;
    const isRecord=!best || result.timeMs<best.timeMs || (result.timeMs===best.timeMs && result.errors<best.errors);
    if(isRecord){
      history.push({...result,recordEvent:true});save(STORE.history,history);
      logEvent("new_record",{level,timeMs:result.timeMs,errors:result.errors});
    }
    const all=[...recent].filter(r=>r.level===level).sort((a,b)=>a.timeMs-b.timeMs||a.errors-b.errors);
    return {result,isRecord,rank:all.findIndex(r=>r.id===result.id)+1};
  }
  function completeLevel(level){
    logEvent("level_complete",{level,timeMs:Math.round(levelElapsed()),errors:state.levelErrors});
    const info=saveCompletion(level);
    if(state.mode==="FULL"){
      if(level==="L4"){
        let fullInfo=null;
        if(!state.manualJump){
          logEvent("session_complete",{timeMs:Math.round(sessionElapsed()),errors:state.sessionErrors});
          fullInfo=saveCompletion("FULL");
        }else logEvent("session_complete_training",{timeMs:Math.round(sessionElapsed()),errors:state.sessionErrors});
        finishFull(fullInfo);
      }else{
        const next={L1:"L2",L2:"L3",L3:"L4"}[level];
        levelDone(level,info,()=>startLevel(next,false));
      }
    }else{
      logEvent("session_complete",{timeMs:Math.round(sessionElapsed()),errors:state.sessionErrors});
      levelDone(level,info,chooseMode);
    }
  }
  function levelDone(level,info,nextFn){
    gameShell(`<div class="levelDone">
      <div class="prompt">${LABELS[level]} COMPLETATO!</div>
      <div class="timeBig">${formatMs(info.result.timeMs)}</div>
      ${info.isRecord?'<div class="badgeRecord">🏆 NUOVO RECORD!</div>':(info.rank?`<div class="pill">POSIZIONE: ${info.rank}</div>`:"")}
      <div class="stats"><span class="pill">ERRORI ${info.result.errors}</span></div>
      <div class="answers"><button id="nextDone" class="primary">${state.mode==="FULL"?"CONTINUA":"TORNA A COME GIOCHIAMO"}</button></div>
    </div>`);
    document.getElementById("nextDone").onclick=nextFn;
  }
  function finishFull(info){
    gameShell(`<div class="levelDone">
      <div class="prompt">🎉 PERCORSO COMPLETATO!</div>
      <div class="timeBig">${formatMs(sessionElapsed())}</div>
      ${state.manualJump?'<div class="pill">ALLENAMENTO LIBERO: HAI USATO I SALTI TRA LIVELLI</div>':(info?.isRecord?'<div class="badgeRecord">🏆 NUOVO RECORD DEL PERCORSO!</div>':'<div class="pill">PARTITA COMPLETA REGISTRATA</div>')}
      <div class="legendInline"><span class="legendPill">PARI = COPPIA</span><span class="legendPill">DISPARI = INTRUSO</span></div>
      <div class="answers"><button id="finishHome" class="primary">COME GIOCHIAMO</button><button id="finishRecords" class="secondary">🏆 RECORD</button></div>
    </div>`);
    document.getElementById("finishHome").onclick=chooseMode;
    document.getElementById("finishRecords").onclick=()=>showRecords(chooseMode);
  }

  /* LEVEL 1 - warm-up */
  const L1SEQ=[1,2,3,4,5,6,7,8,9,10,9,8,7,6,5,4,3,2,1];
  function startL1(){state.stage="L1_WARMUP";state.l1Index=0;renderL1()}
  function renderL1(){
    state.current=L1SEQ[state.l1Index];
    gameShell(`${progress(state.l1Index/L1SEQ.length*100,`${state.l1Index+1}/${L1SEQ.length}`)}
      <div class="center"><div class="prompt">CHE NUMERO È?</div>
      <div class="help">DA 1 A 10 E POI INDIETRO. SE SBAGLI, RIPARTI DA 1.</div>
      ${tenFrame(state.current)}
      <div class="answers"><input id="numIn" class="numberInput" inputmode="numeric" maxlength="2"><button id="confirm" class="primary">CONFERMA</button></div>
      <div id="feedback" class="feedback"></div><div class="stats"><span class="pill">ERRORI ${state.levelErrors}</span></div></div>`);
    const inp=document.getElementById("numIn");inp.focus();
    const check=()=>{
      if(inp.value==="")return;
      state.attempts++;const ok=+inp.value===state.current;
      if(ok){state.correct++;feedback("GIUSTO!",true);recordAnswer({number:state.current,response:+inp.value,correct:true});state.l1Index++;setTimeout(()=>state.l1Index>=L1SEQ.length?completeLevel("L1"):renderL1(),440)}
      else{state.levelErrors++;state.sessionErrors++;recordAnswer({number:state.current,response:+inp.value,correct:false});feedback("RIPARTIAMO DA 1.",false);state.l1Index=0;setTimeout(renderL1,650)}
    };
    document.getElementById("confirm").onclick=check;inp.onkeydown=e=>{if(e.key==="Enter")check()};
  }

  /* LEVEL 2 */
  function startL2A(){state.stage="L2_MULTI";state.attempts=0;state.correct=0;state.streak=0;renderL2A()}
  function renderL2A(){
    state.current=rnd(1,10);const opts=new Set([state.current]);
    while(opts.size<3){let x=state.current+rnd(-2,2);if(x<1||x>10||x===state.current)x=rnd(1,10);opts.add(x)}
    gameShell(`${progress(Math.min(100,state.attempts/10*100),`A · ${state.attempts} TURNI · SERIE ${state.streak}/4`)}
      <div class="center"><div class="prompt">QUANTE PALLINE VEDI?</div><div class="help">MINIMO 10 TURNI. POI SERVONO 4 CORRETTE DI FILA.</div>
      ${tenFrame(state.current)}
      <div class="answers">${shuffled([...opts]).map(n=>`<button class="answer" data-n="${n}">${n}</button>`).join("")}</div>
      <div id="feedback" class="feedback"></div></div>`);
    app.querySelectorAll(".answer").forEach(b=>b.onclick=()=>{
      state.attempts++;const ans=+b.dataset.n,ok=ans===state.current;
      state.correct+=ok?1:0;state.streak=ok?state.streak+1:0;
      if(!ok){state.levelErrors++;state.sessionErrors++}
      recordAnswer({number:state.current,response:ans,correct:ok});
      b.classList.add(ok?"good":"bad");feedback(ok?"BRAVISSIMA!":"GUARDA ANCORA LE COPPIE.",ok);
      setTimeout(()=>{if(state.attempts>=10&&state.streak>=4)startL2B();else renderL2A()},520);
    });
  }
  function startL2B(){state.stage="L2_WRITE";state.attempts=0;state.correct=0;state.streak=0;renderL2B()}
  function renderL2B(){
    state.current=rnd(1,10);
    gameShell(`${progress(Math.min(100,state.attempts/10*100),`B · ${state.attempts} TURNI · SERIE ${state.streak}/4`)}
      <div class="center"><div class="prompt">SCRIVI IL NUMERO</div><div class="help">MINIMO 10 TURNI. POI SERVONO 4 CORRETTE DI FILA.</div>
      ${tenFrame(state.current)}
      <div class="answers"><input id="numIn" class="numberInput" inputmode="numeric" maxlength="2"><button id="confirm" class="primary">CONFERMA</button></div>
      <div id="feedback" class="feedback"></div></div>`);
    const inp=document.getElementById("numIn");inp.focus();
    const check=()=>{
      if(inp.value==="")return;
      state.attempts++;const ans=+inp.value,ok=ans===state.current;
      state.correct+=ok?1:0;state.streak=ok?state.streak+1:0;
      if(!ok){state.levelErrors++;state.sessionErrors++}
      recordAnswer({number:state.current,response:ans,correct:ok});feedback(ok?"ESATTO!":"RIGUARDA LO SPAZIO DA 10.",ok);
      setTimeout(()=>{if(state.attempts>=10&&state.streak>=4)completeLevel("L2");else renderL2B()},520);
    };
    document.getElementById("confirm").onclick=check;inp.onkeydown=e=>{if(e.key==="Enter")check()};
  }

  /* LEVEL 3 - drag */
  function startL3(){state.stage="L3_DRAG";state.l3phase=0;state.l3pos={};renderL3()}
  function makeMessyL3Start(){
    const positions=["up","center","down"];
    let map,wrong,centers,ups,downs;
    do{
      map={};
      for(let n=1;n<=10;n++)map[n]=positions[rnd(0,2)];
      wrong=0;centers=0;ups=0;downs=0;
      for(let n=1;n<=10;n++){
        const want=even(n)?"up":"down";
        if(map[n]!==want)wrong++;
        if(map[n]==="center")centers++;
        if(map[n]==="up")ups++;
        if(map[n]==="down")downs++;
      }
    }while(wrong<5 || centers<2 || ups<2 || downs<2);
    return map;
  }
  function renderL3(){
    if(Object.keys(state.l3pos||{}).length!==10){
      state.l3pos=state.l3phase===2?makeMessyL3Start():{};
      if(state.l3phase!==2)for(let n=1;n<=10;n++)state.l3pos[n]="center";
    }
    const titles=[
      ["PORTA IN ALTO I NUMERI PARI","PARI = COPPIA"],
      ["PORTA IN BASSO I NUMERI DISPARI","DISPARI = INTRUSO"],
      ["DIVIDI TUTTA LA FILA","PARI IN ALTO · DISPARI IN BASSO"]
    ];
    const [title,help]=titles[state.l3phase];
    gameShell(`${progress(state.l3phase/3*100,`QUADRO ${state.l3phase+1}/3`)}
      <div class="center level3Wrap"><div class="prompt">${title}</div><div class="help">${help}. TRASCINA LE TESSERE O TOCCALE.</div>
      <div class="l3Guide"><div class="dropZone up">↑ PARI</div><div class="tileRow">
      ${[1,2,3,4,5,6,7,8,9,10].map(n=>`<div class="tileSlot"><div class="numTile ${state.l3pos[n]!=="center"?state.l3pos[n]:""}" data-n="${n}" draggable="true"><div class="num">${n}</div>${miniTen(n)}</div></div>`).join("")}
      </div><div class="dropZone down">DISPARI ↓</div></div>
      <div class="answers"><button id="confirmL3" class="primary">CONFERMA</button></div><div id="feedback" class="feedback"></div></div>`);
    setupL3Interactions();document.getElementById("confirmL3").onclick=checkL3;
  }
  function setTile(n,pos){state.l3pos[n]=pos;const t=app.querySelector(`.numTile[data-n="${n}"]`);if(t){t.classList.remove("up","down");if(pos!=="center")t.classList.add(pos)}}
  function cycleTile(n){const cur=state.l3pos[n];if(state.l3phase===0)setTile(n,cur==="up"?"center":"up");else if(state.l3phase===1)setTile(n,cur==="down"?"center":"down");else setTile(n,cur==="center"?"up":cur==="up"?"down":"center")}
  function setupL3Interactions(){
    app.querySelectorAll(".numTile").forEach(t=>{
      const n=+t.dataset.n;t.onclick=()=>cycleTile(n);
      t.ondragstart=e=>e.dataTransfer.setData("text/plain",String(n));
    });
    app.querySelectorAll(".dropZone").forEach(z=>{
      z.ondragover=e=>e.preventDefault();
      z.ondrop=e=>{e.preventDefault();setTile(+e.dataTransfer.getData("text/plain"),z.classList.contains("up")?"up":"down")};
    });
  }
  function checkL3(){
    let ok=true;
    for(let n=1;n<=10;n++){
      const want=state.l3phase===0?(even(n)?"up":"center"):state.l3phase===1?(!even(n)?"down":"center"):(even(n)?"up":"down");
      if(state.l3pos[n]!==want){ok=false;break}
    }
    state.attempts++;recordAnswer({phase:state.l3phase+1,correct:ok,positions:{...state.l3pos}});
    if(ok){feedback("PERFETTO! GUARDA L'ALTERNANZA.",true);setTimeout(()=>{if(state.l3phase<2){state.l3phase++;state.l3pos={};renderL3()}else completeLevel("L3")},650)}
    else{state.levelErrors++;state.sessionErrors++;feedback("C'È QUALCOSA DA SISTEMARE.",false)}
  }

  /* LEVEL 4 */
  function parityButtons(){return `<div class="twoChoice"><button class="choice" data-v="even">PARI<br><span class="screenSub">COPPIA</span></button><button class="choice" data-v="odd">DISPARI<br><span class="screenSub">INTRUSO</span></button></div>`}
  function bindParity(fn){app.querySelectorAll(".choice").forEach(b=>b.onclick=()=>fn(b.dataset.v,b))}
  function startL4Dots(){state.stage="L4_DOTS";state.attempts=0;state.correct=0;state.streak=0;state.high67Shown=false;renderL4Dots()}
  function renderL4Dots(){
    state.current=rnd(1,10);
    gameShell(`${progress(state.streak/5*100,`PALLINI · SERIE ${state.streak}/5`)}
      <div class="center"><div class="prompt">QUESTA TESSERA È PARI O DISPARI?</div><div class="help">SERVONO 5 RISPOSTE CORRETTE CONSECUTIVE.</div>
      ${tenFrame(state.current,{highlightIntruder:true})}${parityButtons()}<div id="feedback" class="feedback"></div></div>`);
    bindParity((v,b)=>{
      state.attempts++;const ok=(v==="even")===even(state.current);
      state.correct+=ok?1:0;state.streak=ok?state.streak+1:0;if(!ok){state.levelErrors++;state.sessionErrors++}
      recordAnswer({number:state.current,response:v,correct:ok});b.classList.add(ok?"good":"bad");feedback(ok?"GIUSTO!":"CERCA LA COPPIA O L'INTRUSO.",ok);
      setTimeout(()=>state.streak>=5?startL4Small():renderL4Dots(),520);
    });
  }
  function startL4Small(){state.stage="L4_SMALL";state.attempts=0;state.correct=0;state.streak=0;renderL4Small()}
  function renderL4Small(){
    state.current=rnd(1,9);
    gameShell(`${progress(Math.min(100,state.attempts/5*100),`UNA CIFRA · ${state.attempts} TURNI · SERIE ${state.streak}/4`)}
      <div class="center"><div class="prompt">PARI O DISPARI?</div><div class="bigNumber">${state.current}</div>${parityButtons()}<div id="feedback" class="feedback"></div></div>`);
    bindParity((v,b)=>{
      state.attempts++;const ok=(v==="even")===even(state.current);
      state.correct+=ok?1:0;state.streak=ok?state.streak+1:0;if(!ok){state.levelErrors++;state.sessionErrors++}
      recordAnswer({number:state.current,response:v,correct:ok});b.classList.add(ok?"good":"bad");feedback(ok?"ESATTO!":"RIPENSA ALLE COPPIE.",ok);
      setTimeout(()=>{if(state.attempts>=5&&state.streak>=4)startL4Combined();else renderL4Small()},520);
    });
  }
  function buildHighSeq(){
    const pos=rnd(0,9),arr=[];
    for(let i=0;i<10;i++){
      if(i===pos)arr.push(67);
      else{let n;do{n=rnd(20,99)}while(n===67);arr.push(n)}
    }
    return arr;
  }
  function startL4Combined(){
    state.stage="L4_BIG";state.l4count=0;state.streak=0;state.correct=0;state.highSeq=buildHighSeq();renderL4Combined();
  }
  function renderL4Combined(){
    const idx=state.l4count;
    state.current=idx<7?rnd(10,19):(idx<17?state.highSeq[idx-7]:(()=>{let n;do{n=rnd(20,99)}while(n===67);return n})());
    const phase=idx<7?"FINO A 20":"FINO A 100";
    gameShell(`${progress(Math.min(100,idx/17*100),`${phase} · ${idx}/17 MINIMI · SERIE ${state.streak}/3`)}
      <div class="center"><div class="prompt">QUESTO NUMERO È PARI O DISPARI?</div><div class="bigNumber">${state.current}</div>${parityButtons()}
      <div id="feedback" class="feedback"></div>
      <div class="stats"><span class="pill">PRIMI 7: 10–19</span><span class="pill">POI 10: 20–99</span><span class="pill">DOPO 17 SERVONO 3 CORRETTE DI FILA</span></div></div>`);
    if(state.current===67)setTimeout(celebrate67,120);
    bindParity((v,b)=>{
      state.l4count++;const ok=(v==="even")===even(state.current);
      state.correct+=ok?1:0;state.streak=ok?state.streak+1:0;if(!ok){state.levelErrors++;state.sessionErrors++}
      recordAnswer({number:state.current,response:v,correct:ok});b.classList.add(ok?"good":"bad");feedback(ok?"GIUSTO!":"GUARDA L'ULTIMA CIFRA.",ok);
      setTimeout(()=>{if(state.l4count>=17&&state.streak>=3)completeLevel("L4");else renderL4Combined()},520);
    });
  }

  function renderCurrentStage(){
    if(state.stage==="L1_WARMUP")renderL1();
    else if(state.stage==="L2_MULTI")renderL2A();
    else if(state.stage==="L2_WRITE")renderL2B();
    else if(state.stage==="L3_DRAG")renderL3();
    else if(state.stage==="L4_DOTS")renderL4Dots();
    else if(state.stage==="L4_SMALL")renderL4Small();
    else if(state.stage==="L4_BIG")renderL4Combined();
    else chooseMode();
  }

  /* Records */
  function recordRow(r,i){
    const m=["🥇","🥈","🥉"][i]||"•";
    return `<div class="recordRow"><div class="medal">${m}</div><div><b>${escapeHtml(r.player)}</b><div class="recordMeta">${r.label} · ${r.date} · ${r.errors} errori</div></div><div class="recordTime">${formatMs(r.timeMs)}</div></div>`;
  }
  function recentHtml(){
    const rows=load(STORE.recent,[]).sort((a,b)=>b.ts-a.ts).slice(0,20);
    if(!rows.length)return '<div class="emptyState">Nessun risultato recente.</div>';
    return rows.map((r,i)=>recordRow(r,i)).join("");
  }
  function historyHtml(){
    const rows=load(STORE.history,[]).sort((a,b)=>b.ts-a.ts).slice(0,30);
    if(!rows.length)return '<div class="emptyState">Il primo vero record comparirà qui e non verrà cancellato.</div>';
    return rows.map((r,i)=>recordRow(r,i)).join("");
  }
  function showRecords(backFn=chooseMode){
    app.innerHTML=`<section class="screen">
      ${commonHead("I RECORD DI ALICE","I recenti si possono pulire. I record storici restano conservati.",false,true)}
      <div class="recordsLayout">
        <div class="recordsBox"><h2>RISULTATI RECENTI</h2>${recentHtml()}<div class="recordsFooter"><button id="clearRecent" class="danger">CANCELLA I RECENTI</button></div></div>
        <div class="recordsBox"><h2>RECORD STORICI</h2><div class="screenSub">Ogni volta che viene battuto un vero record, rimane qui.</div>${historyHtml()}</div>
      </div>
      <div class="recordsFooter"><button id="recordsBack" class="primary">← INDIETRO</button></div>
    </section>`;
    bindHeaderActions(backFn);
    document.getElementById("recordsBack").onclick=backFn;
    document.getElementById("clearRecent").onclick=()=>{
      if(confirm("Cancellare solo i risultati recenti? I record storici e i dati di analisi NON verranno cancellati.")){save(STORE.recent,[]);showRecords(backFn)}
    };
  }

  applyAvatar(state.avatar);
  splash();
})();