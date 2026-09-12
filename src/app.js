/* ============================================================
   SRS ENGINE (simplified Leitner / SM-2-lite)
   Intervals (days) by box: 0(new)->1, 1->2, 2->4, 3->9, 4->18, 5->35, 6+ mastered(60)
   ============================================================ */
const INTERVALS = [1,2,4,9,18,35,60];
const MASTERY_BOX = 4; // box >= this counts as "mastered" for the mastery stat

const STORAGE_KEY = "radonc-companion-progress-v1";
let PROGRESS = {}; // cardId -> {box, due (ISO date string), seen:bool, lastRating}

function loadProgress(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    PROGRESS = raw ? JSON.parse(raw) : {};
  }catch(e){ PROGRESS = {}; }
}
function saveProgress(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(PROGRESS)); }catch(e){}
}
function todayISO(){
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
}
function addDays(iso, n){
  const d = new Date(iso+"T00:00:00");
  d.setDate(d.getDate()+n);
  return d.toISOString().slice(0,10);
}
function getCardState(cardId){
  return PROGRESS[cardId] || {box:0, due: todayISO(), seen:false, lastRating:null};
}
function isDue(cardId){
  const st = getCardState(cardId);
  return st.due <= todayISO();
}
function rateCard(cardId, rating){
  let st = getCardState(cardId);
  st.seen = true;
  st.lastRating = rating;
  if(rating === "again"){
    st.box = 0;
  } else if(rating === "hard"){
    st.box = Math.max(0, st.box); // stays, small bump next time
    st.box = Math.min(st.box+0, INTERVALS.length-1);
  } else if(rating === "good"){
    st.box = Math.min(st.box+1, INTERVALS.length-1);
  } else if(rating === "easy"){
    st.box = Math.min(st.box+2, INTERVALS.length-1);
  }
  const intervalDays = rating === "again" ? 0 : INTERVALS[st.box];
  st.due = rating === "again" ? todayISO() : addDays(todayISO(), intervalDays);
  PROGRESS[cardId] = st;
  saveProgress();
}

/* ============================================================
   DERIVED STATS
   ============================================================ */
function allCards(){
  let out = [];
  for(const svc of SERVICES){
    const cards = DECKS[svc.id] || [];
    for(const c of cards) out.push({...c, service: svc.id});
  }
  return out;
}
function svcCards(svcId){ return DECKS[svcId] || []; }
function svcDueCards(svcId){ return svcCards(svcId).filter(c => isDue(c.id)); }
function svcMasteredCount(svcId){
  return svcCards(svcId).filter(c => getCardState(c.id).box >= MASTERY_BOX).length;
}
function svcSeenCount(svcId){
  return svcCards(svcId).filter(c => getCardState(c.id).seen).length;
}
function categoriesFor(svcId){
  const cards = svcCards(svcId);
  const map = new Map();
  for(const c of cards){
    if(!map.has(c.category)) map.set(c.category, []);
    map.get(c.category).push(c);
  }
  return map;
}

/* ============================================================
   RENDER: DASHBOARD
   ============================================================ */
function renderDashboard(){
  const all = allCards();
  const total = all.length;
  const mastered = all.filter(c => getCardState(c.id).box >= MASTERY_BOX).length;
  const due = all.filter(c => isDue(c.id)).length;
  const seen = all.filter(c => getCardState(c.id).seen).length;
  const modulesReviewed = SERVICES.filter(s => svcSeenCount(s.id) > 0).length;

  document.getElementById("stat-mastery").textContent = total ? Math.round(100*mastered/total)+"%" : "0%";
  document.getElementById("stat-mastery-sub").textContent = `${mastered} of ${total} cards mastered`;
  document.getElementById("stat-due").textContent = due;
  document.getElementById("stat-reviewed").textContent = modulesReviewed;
  document.getElementById("stat-seen").textContent = seen;
  document.getElementById("stat-seen-sub").textContent = `of ${total} in deck`;
  document.getElementById("study-all-count").textContent = due;

  renderBackgroundGrid();

  const grid = document.getElementById("service-grid");
  grid.innerHTML = "";
  for(const svc of SERVICES){
    const cards = svcCards(svc.id);
    const dueN = svcDueCards(svc.id).length;
    const masteredN = svcMasteredCount(svc.id);
    const pct = cards.length ? Math.round(100*masteredN/cards.length) : 0;
    const circumference = 2*Math.PI*15;
    const offset = circumference * (1 - pct/100);

    const tile = document.createElement("button");
    tile.className = "tile";
    tile.style.setProperty("--svc", svc.color);
    tile.setAttribute("aria-label", `${svc.name}: ${cards.length} cards, ${dueN} due`);
    tile.innerHTML = `
      <div class="tile-top">
        <div class="tile-icon">${svc.icon}</div>
        <div class="tile-ring-wrap">
          <svg class="mastery-ring" viewBox="0 0 36 36">
            <circle class="track" cx="18" cy="18" r="15"></circle>
            <circle class="fill" cx="18" cy="18" r="15" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
            <text x="18" y="21" text-anchor="middle">${pct}%</text>
          </svg>
        </div>
      </div>
      <div class="tile-name">${svc.name}</div>
      <div class="tile-meta">
        <span>${cards.length} cards</span>
        <span class="due-badge ${dueN===0?'zero':''}">${dueN===0?'0 due':dueN+' due'}</span>
      </div>
    `;
    tile.addEventListener("click", () => openService(svc.id));
    grid.appendChild(tile);
  }
}

/* ============================================================
   RENDER + OPEN: BACKGROUND MODULE
   ============================================================ */
function renderBackgroundGrid(){
  const grid = document.getElementById("background-grid");
  if(!grid) return;
  grid.innerHTML = "";
  for(const sec of BACKGROUND){
    const tile = document.createElement("button");
    tile.className = "tile bg-tile";
    tile.style.setProperty("--svc", "var(--accent)");
    tile.setAttribute("aria-label", `Section ${sec.num}: ${sec.title}`);
    tile.innerHTML = `
      <div class="tile-top">
        <div class="tile-icon bg-tile-num">${String(sec.num).padStart(2,"0")}</div>
      </div>
      <div class="tile-name">${sec.title}</div>
      <div class="tile-meta"><span>${sec.question}</span></div>
    `;
    tile.addEventListener("click", () => openBackground(sec.id));
    grid.appendChild(tile);
  }
}

function openBackground(id){
  const idx = BACKGROUND.findIndex(s => s.id === id);
  if(idx === -1) return;
  const sec = BACKGROUND[idx];
  currentDoc = { kind: "background", svcId: null, catName: null, bgId: id };

  document.getElementById("doc-svc-name").textContent = "Before You Start \u00b7 Section " + String(sec.num).padStart(2,"0");
  document.querySelector("#view-doc .doc-eyebrow").style.setProperty("--svc", "var(--accent)");
  document.querySelector("#view-doc .doc-eyebrow .dot").style.background = "var(--accent)";
  document.getElementById("doc-title").textContent = sec.title;
  document.getElementById("doc-title").style.setProperty("--svc", "var(--accent)");
  document.getElementById("doc-body").innerHTML = sec.html;
  document.getElementById("doc-body").style.setProperty("--svc", "var(--accent)");
  document.querySelector(".doc-wrap").style.setProperty("--svc", "var(--accent)");

  document.getElementById("disease-doc-toolbar").hidden = true;
  document.getElementById("disease-doc-footer").hidden = true;
  document.getElementById("bg-footer-nav").hidden = false;
  document.getElementById("bg-nav-current").textContent = sec.num;
  document.getElementById("btn-bg-prev").style.visibility = idx === 0 ? "hidden" : "visible";
  document.getElementById("btn-bg-next").textContent = idx === BACKGROUND.length - 1 ? "Back to dashboard" : "Next section \u2192";

  showView("view-doc");
}

/* ============================================================
   RENDER: SERVICE DETAIL
   ============================================================ */
let currentServiceId = null;

function openService(svcId){
  currentServiceId = svcId;
  const svc = SERVICES.find(s=>s.id===svcId);
  document.getElementById("svc-detail-icon").textContent = svc.icon;
  document.getElementById("svc-detail-icon").style.background = `color-mix(in srgb, ${svc.color} 16%, transparent)`;
  document.getElementById("svc-detail-icon").style.color = svc.color;
  document.getElementById("svc-detail-name").textContent = svc.name;

  const cards = svcCards(svcId);
  const dueN = svcDueCards(svcId).length;
  const masteredN = svcMasteredCount(svcId);
  document.getElementById("svc-detail-stats").innerHTML =
    `<span>${cards.length}</span> cards &nbsp;·&nbsp; <span>${masteredN}</span> mastered &nbsp;·&nbsp; <span>${dueN}</span> due today`;
  document.getElementById("svc-due-count").textContent = dueN;

  const catList = document.getElementById("cat-list");
  catList.innerHTML = "";
  const cats = categoriesFor(svcId);
  if(cats.size === 0){
    catList.innerHTML = `<div class="empty-state"><div class="e-icon">🗂️</div>No cards in this deck yet.</div>`;
  }
  for(const [catName, catCards] of cats){
    const catDue = catCards.filter(c=>isDue(c.id)).length;
    const catMastered = catCards.filter(c=>getCardState(c.id).box >= MASTERY_BOX).length;
    const pct = catCards.length ? Math.round(100*catMastered/catCards.length) : 0;
    const hasDoc = !!(DOCS[svcId] && DOCS[svcId][catName]);
    const row = document.createElement("div");
    row.className = "cat-row";
    row.style.setProperty("--svc", svc.color);
    row.style.cursor = hasDoc ? "pointer" : "default";
    row.innerHTML = `
      <div class="cat-info">
        <div class="cat-name">${catName}${hasDoc ? ' <span style="font-weight:400;color:var(--ink-faint);font-size:12px;">(read)</span>' : ''}</div>
        <div class="cat-progress-bar"><div class="cat-progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="cat-count tabular">${catCards.length} cards</div>
      <div class="due-badge ${catDue===0?'zero':''}">${catDue} due</div>
      <button data-cat="${encodeURIComponent(catName)}">Study</button>
    `;
    row.querySelector("button").addEventListener("click", (e) => { e.stopPropagation(); startStudySession(svcId, catName); });
    if(hasDoc){
      row.querySelector(".cat-info").addEventListener("click", () => openDoc(svcId, catName));
    }
    catList.appendChild(row);
  }

  document.getElementById("btn-study-service").onclick = () => startStudySession(svcId, null);

  showView("view-service");
}

/* ============================================================
   DOC VIEW
   ============================================================ */
let currentDoc = { kind: "disease", svcId: null, catName: null, bgId: null };

function openDoc(svcId, catName){
  const doc = DOCS[svcId] && DOCS[svcId][catName];
  if(!doc) return;
  currentDoc = { kind: "disease", svcId, catName, bgId: null };
  document.getElementById("disease-doc-toolbar").hidden = false;
  document.getElementById("disease-doc-footer").hidden = false;
  document.getElementById("bg-footer-nav").hidden = true;
  const svc = SERVICES.find(s=>s.id===svcId);

  document.getElementById("doc-svc-name").textContent = svc.name;
  document.querySelector("#view-doc .doc-eyebrow").style.setProperty("--svc", svc.color);
  document.querySelector("#view-doc .doc-eyebrow .dot").style.background = svc.color;
  document.getElementById("doc-title").textContent = doc.title || catName;
  document.getElementById("doc-title").style.setProperty("--svc", svc.color);
  document.getElementById("doc-body").innerHTML = doc.html;
  document.getElementById("doc-body").style.setProperty("--svc", svc.color);
  document.querySelector(".doc-wrap").style.setProperty("--svc", svc.color);

  const catCards = svcCards(svcId).filter(c=>c.category===catName);
  document.getElementById("doc-study-count").textContent = catCards.length;

  showView("view-doc");
}

/* ============================================================
   STUDY SESSION
   ============================================================ */
let session = { queue: [], index: 0, reviewedCount: 0, againCount: 0, flipped: false, contextLabel:"" };

function startStudySession(svcId, catName){
  let pool;
  if(svcId === null){
    pool = allCards().filter(c => isDue(c.id));
    session.contextLabel = "All Due Cards";
  } else if(catName === null){
    pool = svcCards(svcId).filter(c => isDue(c.id)).map(c=>({...c, service:svcId}));
    session.contextLabel = SERVICES.find(s=>s.id===svcId).name;
  } else {
    pool = svcCards(svcId).filter(c => c.category === catName && isDue(c.id)).map(c=>({...c, service:svcId}));
    session.contextLabel = catName;
  }
  // shuffle
  for(let i=pool.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [pool[i],pool[j]] = [pool[j],pool[i]];
  }
  session.queue = pool;
  session.index = 0;
  session.reviewedCount = 0;
  session.againCount = 0;

  document.getElementById("study-active").style.display = "";
  document.getElementById("study-complete").style.display = "none";

  showView("view-study");
  if(pool.length === 0){
    finishSession();
  } else {
    renderStudyCard();
  }
}

function renderStudyCard(){
  const card = session.queue[session.index];
  const svc = SERVICES.find(s=>s.id===card.service);
  const flashcard = document.getElementById("flashcard");
  flashcard.classList.remove("flipped");
  session.flipped = false;
  flashcard.style.setProperty("--svc", svc.color);

  document.getElementById("card-cat-front").textContent = card.category;
  document.getElementById("card-cat-front").style.color = svc.color;
  document.getElementById("card-cat-front").style.background = `color-mix(in srgb, ${svc.color} 14%, transparent)`;
  document.getElementById("card-cat-back").textContent = card.category;
  document.getElementById("card-cat-back").style.color = svc.color;
  document.getElementById("card-cat-back").style.background = `color-mix(in srgb, ${svc.color} 14%, transparent)`;
  document.getElementById("card-front-text").textContent = card.front;
  document.getElementById("card-back-text").textContent = card.back;

  document.getElementById("reveal-prompt").style.display = "";
  document.getElementById("rate-row").style.display = "none";

  const pct = Math.round(100*session.index/session.queue.length);
  document.getElementById("study-progress-fill").style.width = pct+"%";
  document.getElementById("study-count").textContent = `${session.index+1} / ${session.queue.length}`;
}

function flipCard(){
  const flashcard = document.getElementById("flashcard");
  session.flipped = !session.flipped;
  flashcard.classList.toggle("flipped", session.flipped);
  if(session.flipped){
    document.getElementById("reveal-prompt").style.display = "none";
    document.getElementById("rate-row").style.display = "grid";
  } else {
    document.getElementById("reveal-prompt").style.display = "";
    document.getElementById("rate-row").style.display = "none";
  }
}

function handleRate(rating){
  const card = session.queue[session.index];
  rateCard(card.id, rating);
  session.reviewedCount++;
  if(rating === "again") session.againCount++;

  session.index++;
  if(session.index >= session.queue.length){
    finishSession();
  } else {
    renderStudyCard();
  }
  renderDashboard(); // keep counts live
}

function finishSession(){
  document.getElementById("study-active").style.display = "none";
  document.getElementById("study-complete").style.display = "";
  document.getElementById("study-progress-fill").style.width = "100%";
  document.getElementById("study-count").textContent = `${session.queue.length} / ${session.queue.length}`;
  document.getElementById("complete-reviewed").textContent = session.reviewedCount;
  document.getElementById("complete-again").textContent = session.againCount;
  document.getElementById("complete-msg").textContent = session.queue.length === 0
    ? `No cards were due in "${session.contextLabel}" right now, check back later or study ahead from another set.`
    : `You've reviewed every due card in "${session.contextLabel}".`;
  renderDashboard();
}

/* ============================================================
   VIEW SWITCHING
   ============================================================ */
function showView(id){
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({top:0, behavior:"instant"});
}

/* ============================================================
   THEME
   ============================================================ */
function setTheme(mode){
  const root = document.documentElement;
  if(mode === "light") root.setAttribute("data-theme","light");
  else if(mode === "dark") root.setAttribute("data-theme","dark");
  else root.removeAttribute("data-theme");
  try{ localStorage.setItem("radonc-theme", mode); }catch(e){}
  document.querySelectorAll(".theme-toggle button").forEach(b=>b.classList.remove("active"));
  document.getElementById("theme-"+mode).classList.add("active");
}

/* ============================================================
   INIT / EVENT WIRING
   ============================================================ */
function init(){
  loadProgress();

  let savedTheme = "system";
  try{ savedTheme = localStorage.getItem("radonc-theme") || "system"; }catch(e){}
  setTheme(savedTheme);
  document.getElementById("theme-light").addEventListener("click", ()=>setTheme("light"));
  document.getElementById("theme-system").addEventListener("click", ()=>setTheme("system"));
  document.getElementById("theme-dark").addEventListener("click", ()=>setTheme("dark"));

  document.getElementById("btn-study-all").addEventListener("click", ()=> startStudySession(null, null));
  document.getElementById("btn-back-dashboard").addEventListener("click", ()=>{ renderDashboard(); showView("view-dashboard"); });
  document.getElementById("btn-back-from-doc").addEventListener("click", ()=>{
    if(currentDoc.kind === "background"){ renderDashboard(); showView("view-dashboard"); }
    else if(currentDoc.svcId){ openService(currentDoc.svcId); } else { renderDashboard(); showView("view-dashboard"); }
  });
  document.getElementById("btn-bg-prev").addEventListener("click", ()=>{
    const idx = BACKGROUND.findIndex(s=>s.id===currentDoc.bgId);
    if(idx > 0) openBackground(BACKGROUND[idx-1].id);
  });
  document.getElementById("btn-bg-next").addEventListener("click", ()=>{
    const idx = BACKGROUND.findIndex(s=>s.id===currentDoc.bgId);
    if(idx < BACKGROUND.length-1) openBackground(BACKGROUND[idx+1].id);
    else { renderDashboard(); showView("view-dashboard"); }
  });
  document.getElementById("btn-study-from-doc").addEventListener("click", ()=> startStudySession(currentDoc.svcId, currentDoc.catName));
  document.getElementById("btn-study-from-doc-2").addEventListener("click", ()=> startStudySession(currentDoc.svcId, currentDoc.catName));
  document.getElementById("btn-exit-study").addEventListener("click", ()=>{
    renderDashboard();
    if(currentServiceId){ openService(currentServiceId); } else { showView("view-dashboard"); }
  });
  document.getElementById("btn-complete-done").addEventListener("click", ()=>{
    renderDashboard();
    if(currentServiceId){ openService(currentServiceId); } else { showView("view-dashboard"); }
  });
  document.getElementById("flashcard").addEventListener("click", flipCard);
  document.querySelectorAll(".rate-btn").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      e.stopPropagation();
      handleRate(btn.dataset.rating);
    });
  });
  document.getElementById("btn-reset-progress").addEventListener("click", ()=>{
    if(confirm("Reset all study progress? This clears mastery and due dates for every card.")){
      PROGRESS = {};
      saveProgress();
      renderDashboard();
    }
  });

  document.addEventListener("keydown", (e)=>{
    const studyActive = document.getElementById("view-study").classList.contains("active")
      && document.getElementById("study-active").style.display !== "none";
    if(!studyActive) return;
    if(e.code === "Space"){ e.preventDefault(); flipCard(); }
    if(session.flipped){
      if(e.key === "1") handleRate("again");
      if(e.key === "2") handleRate("hard");
      if(e.key === "3") handleRate("good");
      if(e.key === "4") handleRate("easy");
    }
  });

  renderDashboard();
}
init();
