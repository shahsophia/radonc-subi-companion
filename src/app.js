/* ============================================================
   MOTION HELPERS (scroll reveal, count-up, view transitions)
   ============================================================ */
const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const revealObserver = ("IntersectionObserver" in window) ? new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  }
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }) : null;

function armReveal(el, delayMs = 0) {
  if (REDUCED_MOTION || !revealObserver) return;
  el.classList.add("reveal-pending");
  el.style.setProperty("--d", delayMs + "ms");
  revealObserver.observe(el);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}

function animateNumber(el, to, suffix = "") {
  const from = parseFloat((el.textContent || "").replace(/[^0-9.-]/g, "")) || 0;
  if (REDUCED_MOTION || from === to) { el.textContent = to + suffix; return; }
  const duration = 650;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * eased) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ============================================================
   SRS ENGINE (simplified Leitner / SM-2-lite)
   Intervals (days) by box: 0(new)->1, 1->2, 2->4, 3->9, 4->18, 5->35, 6+ mastered(60)
   ============================================================ */
const INTERVALS = [1,2,4,9,18,35,60];
const MASTERY_BOX = 4; // box >= this counts as "mastered" for the mastery stat

const STORAGE_KEY = "radonc-companion-progress-v1";
// Signed-in progress lives in localStorage; guests can study and do cases too,
// but their progress is kept in sessionStorage (gone when the tab closes).
function progressStore(){ return (typeof isSignedIn === "function" && isSignedIn()) ? localStorage : sessionStorage; }
let PROGRESS = {}; // cardId -> {box, due (ISO date string), seen:bool, lastRating}

function loadProgress(){
  try{
    const raw = progressStore().getItem(STORAGE_KEY);
    PROGRESS = raw ? JSON.parse(raw) : {};
  }catch(e){ PROGRESS = {}; }
}
function saveProgress(){
  try{ progressStore().setItem(STORAGE_KEY, JSON.stringify(PROGRESS)); }catch(e){}
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
  if(isSuspended(cardId)) return false;
  const st = getCardState(cardId);
  return st.due <= todayISO();
}

/* ------------------------------------------------------------
   SUSPENSION (Anki-style). Every card starts suspended, so the
   due count starts at zero; students unsuspend the sections they
   want in their daily review from the Flashcards page, and can
   suspend single cards mid-session. Only explicit choices are
   stored, so flipping CARDS_START_SUSPENDED changes the default
   for anything the student hasn't touched.
   ------------------------------------------------------------ */
const CARDS_START_SUSPENDED = true;
const SUSPEND_KEY = "radonc-companion-suspended-v1";
let SUSPENDED = {}; // cardId -> true (suspended) | false (active)
function loadSuspended(){
  try{ const raw = progressStore().getItem(SUSPEND_KEY); SUSPENDED = raw ? JSON.parse(raw) : {}; }catch(e){ SUSPENDED = {}; }
}
function saveSuspended(){
  try{ progressStore().setItem(SUSPEND_KEY, JSON.stringify(SUSPENDED)); }catch(e){}
}
function isSuspended(cardId){
  return Object.prototype.hasOwnProperty.call(SUSPENDED, cardId) ? SUSPENDED[cardId] : CARDS_START_SUSPENDED;
}
function setSuspended(cardIds, value){
  for(const id of cardIds) SUSPENDED[id] = value;
  saveSuspended();
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
// The overview deck has no dashboard tile; its cards belong to "Before You Start".
const OVERVIEW_GROUP = { id: "overview", name: "Before You Start", icon: "✦", color: "var(--accent)" };
const DECK_GROUPS = [OVERVIEW_GROUP, ...SERVICES];
function svcMeta(svcId){ return DECK_GROUPS.find(s => s.id === svcId); }

function allCards(){
  let out = [];
  for(const svc of DECK_GROUPS){
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
// Reading sections (DOCS) are the primary navigation structure and don't require
// a matching flashcard deck (mirrors how "Before You Start" pages work). This
// returns category names in doc order first, then any deck-only categories.
function docCategoriesFor(svcId){
  const names = [];
  const seen = new Set();
  const docs = DOCS[svcId] || {};
  for(const k of Object.keys(docs)){ names.push(k); seen.add(k); }
  for(const [k] of categoriesFor(svcId)){ if(!seen.has(k)){ names.push(k); seen.add(k); } }
  return names;
}

/* ============================================================
   RENDER: HOME (curriculum first, learning dashboard second)
   ============================================================ */
// One entry per Before You Start page and per disease site. The home grid
// shows the disease sites; the Before You Start pages live in the learning path.
function homeSections(){
  const out = [];
  for(const sec of BACKGROUND){
    const fc = BACKGROUND_FLASHCARD_MAP[sec.id];
    out.push({
      kind: "bg", id: sec.id, order: sec.num, name: sec.title, blurb: sec.question,
      badge: "Before You Start", color: "var(--svc-overview)",
      cards: fc ? svcCards(fc.svcId).filter(c => c.category === fc.catName) : [],
      cases: [], sections: 1,
      topics: [sec.title],
    });
  }
  SERVICES.forEach((svc, i) => {
    const docs = docCategoriesFor(svc.id);
    out.push({
      kind: "site", id: svc.id, order: 100 + i, name: svc.name, blurb: svc.blurb,
      badge: "Disease Site", color: svc.color,
      cards: svcCards(svc.id), cases: casesFor(svc.id), sections: docs.length,
      topics: docs,
    });
  });
  return out;
}

// Flashcard states for a set of cards: suspended, new (active, never seen),
// learning (seen, not yet mastered), mastered, plus how many are due today.
function cardStats(cards){
  const st = { total: cards.length, suspended: 0, fresh: 0, learning: 0, mastered: 0, due: 0 };
  for(const c of cards){
    if(isSuspended(c.id)){ st.suspended++; continue; }
    const s = getCardState(c.id);
    if(s.box >= MASTERY_BOX) st.mastered++;
    else if(s.seen) st.learning++;
    else st.fresh++;
    if(isDue(c.id)) st.due++;
  }
  return st;
}
const CARD_SEGMENTS = [
  { key: "suspended", label: "Suspended", color: "var(--trk-suspended)" },
  { key: "fresh", label: "New", color: "var(--trk-new)" },
  { key: "learning", label: "Learning", color: "var(--trk-learning)" },
  { key: "mastered", label: "Mastered", color: "var(--trk-mastered)" },
];
function segBarHTML(parts, total){
  if(!total) return `<span class="seg-empty"></span>`;
  return parts.filter(p => p.n > 0)
    .map(p => `<span class="seg" style="flex-grow:${p.n};background:${p.color}" title="${escapeHtml(p.label)}: ${p.n}"></span>`).join("");
}
function caseDoneCount(sec){ return sec.cases.filter(c => isCaseDone(sec.id, c.id)).length; }
function sectionProgress(sec){
  const st = cardStats(sec.cards);
  const cardPart = st.total ? (st.mastered + 0.5*st.learning) / st.total : null;
  const casePart = sec.cases.length ? caseDoneCount(sec) / sec.cases.length : null;
  const parts = [cardPart, casePart].filter(x => x !== null);
  return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
}

let homeFilters = { type: new Set(), status: new Set(), has: new Set(), sort: "course" };
const FILTER_INPUTS = {
  "f-due": ["status", "due"], "f-cases": ["status", "cases"], "f-new": ["status", "new"], "f-mastered": ["status", "mastered"],
  "f-has-cards": ["has", "cards"], "f-has-cases": ["has", "cases"],
};
function sectionMatches(sec){
  const f = homeFilters;
  if(f.type.size && !f.type.has(sec.kind === "bg" ? "background" : "site")) return false;
  const st = cardStats(sec.cards);
  const casesLeft = sec.cases.length - caseDoneCount(sec);
  for(const s of f.status){
    if(s === "due" && !st.due) return false;
    if(s === "cases" && !casesLeft) return false;
    if(s === "new" && (st.learning + st.mastered > 0 || caseDoneCount(sec) > 0)) return false;
    if(s === "mastered" && !(st.total && st.mastered / st.total >= 0.8)) return false;
  }
  if(f.has.has("cards") && !st.total) return false;
  if(f.has.has("cases") && !sec.cases.length) return false;
  return true;
}

// --- shared bits of curriculum data ---
function siteInfo(svcId){ return (typeof CURRICULUM !== "undefined" && CURRICULUM.sites && CURRICULUM.sites[svcId]) || {}; }
const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + "s")}`;
// Interactive plates (anatomy + imaging) for a site: both the old single-module
// format ({plates}) and the keyed plate-group format.
function plateCount(svcId){
  let n = 0;
  for(const reg of [ANATOMY[svcId], IMAGING[svcId]]){
    if(!reg) continue;
    const groups = reg.plates ? [reg] : Object.values(reg);
    for(const g of groups) n += (g && g.plates ? g.plates.length : 0);
  }
  return n;
}
function totalPlates(){ return SERVICES.reduce((n, s) => n + plateCount(s.id), 0); }
function casesSites(){ return SERVICES.filter(s => casesFor(s.id).length); }
// The first unfinished case, in course order (or the first case if all are done).
function nextCase(){
  for(const svc of casesSites()){
    const list = casesFor(svc.id);
    const i = list.findIndex(c => !isCaseDone(svc.id, c.id));
    if(i >= 0) return { svc, idx: i, kase: list[i] };
  }
  const svc = casesSites()[0];
  return svc ? { svc, idx: 0, kase: casesFor(svc.id)[0], allDone: true } : null;
}
function glanceItems(){
  const { total } = caseTotals();
  return [
    [BACKGROUND.length, "foundation sections", "Workflow, physics, consults, presentations, and planning"],
    [SERVICES.length, "disease-site modules", "Epidemiology to treatment paradigms"],
    [total, "clinical cases", "Stage, treat, and dose, step by step"],
    [allCards().length, "flashcards", "Spaced repetition, deck by deck"],
    [totalPlates(), "interactive plates", "Anatomy and imaging, explore and quiz"],
  ];
}
function glanceHTML(){
  return glanceItems().map(([n, label, sub]) =>
    `<div class="glance-item"><dt><span class="glance-n tabular">${n}</span> ${label}</dt><dd>${sub}</dd></div>`).join("");
}

const ICONS = {
  framework: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10l4 4v12H5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M15 4v4h4M8.5 12h7M8.5 15.5h7M8.5 8.5h3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  site: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>`,
  cases: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v3H8zM6 5.5h-.5A1.5 1.5 0 0 0 4 7v12.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V7a1.5 1.5 0 0 0-1.5-1.5H18" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8.5 13l2.3 2.3 4.7-4.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  cards: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="14" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7 3h11.5A2.5 2.5 0 0 1 21 5.5V16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  physics: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="1.8" fill="currentColor"/><ellipse cx="12" cy="12" rx="9" ry="3.6" fill="none" stroke="currentColor" stroke-width="1.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" fill="none" stroke="currentColor" stroke-width="1.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-60 12 12)" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`,
  start: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 5h11l-2 3.5L15 12H4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  play: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>`,
};

function renderPillars(){
  const { total } = caseTotals();
  const pillars = [
    { icon: "framework", label: "Clinical frameworks", text: "Learn how to approach consults, presentations, staging, treatment decisions, and follow-up.", meta: plural(BACKGROUND.length, "foundation section"), go: "learn" },
    { icon: "site", label: "Disease-site learning", text: "Build high-yield knowledge across the most important radiation oncology disease sites.", meta: plural(SERVICES.length, "disease-site module"), go: "sites" },
    { icon: "cases", label: "Clinical cases", text: "Practice applying staging, imaging, pathology, and treatment principles to realistic clinical scenarios.", meta: plural(total, "case"), go: "cases" },
    { icon: "cards", label: "Flashcards", text: "Reinforce high-yield concepts with focused spaced-repetition review.", meta: plural(allCards().length, "card"), go: "flashcards" },
  ];
  document.getElementById("pillar-grid").innerHTML = pillars.map((p, i) => `
    <button class="pillar" data-go="${p.go}">
      <span class="pillar-top"><span class="pillar-icon">${ICONS[p.icon]}</span><span class="pillar-num tabular">${String(i + 1).padStart(2, "0")}</span></span>
      <span class="pillar-label">${p.label}</span>
      <span class="pillar-text">${p.text}</span>
      <span class="pillar-meta">${p.meta}<span class="pillar-arrow">${ICONS.arrow}</span></span>
    </button>`).join("");
}

function bgSection(id){ return BACKGROUND.find(s => s.id === id); }
function bgLinksHTML(ids){
  return ids.map(bgSection).filter(Boolean).map(s =>
    `<button class="lp-link" data-go="bg:${s.id}"><span class="lp-link-num tabular">${String(s.num).padStart(2, "0")}</span>${escapeHtml(s.title)}</button>`).join("");
}
function renderLearningPath(){
  const all = allCards(), st = cardStats(all);
  const { done, total } = caseTotals();
  const steps = [
    { label: "Before you start", text: "Understand the specialty, the four treatment intents, and how a patient moves through radiation treatment.", links: bgLinksHTML(["rad-onc-101"]), go: "bg:rad-onc-101", cta: "Start here" },
    { label: "Clinical skills", text: "Learn what happens in a rad onc consult and how to present new patients, follow-ups, and on-treatment visits.", links: bgLinksHTML(["the-consult", "presenting-patients"]), go: "bg:the-consult", cta: "Open" },
    { label: "How radiation works", text: "Radiobiology and physics, the machines and techniques, and how contours and beams become a plan.", links: bgLinksHTML(["how-rt-works", "machines-modalities", "treatment-planning"]), go: "bg:how-rt-works", cta: "Open" },
    { label: "Disease sites", text: "Build clinical knowledge site by site, from epidemiology and anatomy to staging and treatment paradigms.", status: plural(SERVICES.length, "module"), go: "sites", cta: "Browse sites" },
    { label: "Clinical cases", text: "Apply what you've learned: commit to a stage, a treatment, and a dose, one step at a time.", status: `${done} of ${total} completed`, go: "start-case", cta: done && done < total ? "Continue" : "Start a case" },
    { label: "Flashcards", text: "Reinforce high-yield knowledge with spaced repetition. Choose the decks that match what you've read.", status: st.due ? `${st.due} due today` : `${all.length - st.suspended} of ${all.length} cards active`, go: "flashcards", cta: st.due ? "Review" : "Choose decks" },
  ];
  const el = document.getElementById("learning-path-list");
  el.innerHTML = steps.map((s, i) => `
    <li class="lp-step">
      <span class="lp-num tabular" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
      <div class="lp-body">
        <h3 class="lp-title"><span class="visually-hidden">Step ${i + 1}: </span>${s.label}</h3>
        <p class="lp-text">${s.text}</p>
        ${s.links ? `<div class="lp-links">${s.links}</div>` : ""}
        ${s.status ? `<p class="lp-status">${s.status}</p>` : ""}
      </div>
      <button class="lp-cta" data-go="${s.go}" aria-label="${escapeHtml(s.cta)}: ${escapeHtml(s.label)}">${s.cta}${ICONS.arrow}</button>
    </li>`).join("");
}

function renderCasesFeature(){
  const { done, total } = caseTotals();
  const sites = casesSites();
  animateNumber(document.getElementById("stat-cases-done"), done);
  document.getElementById("stat-cases-total").textContent = total;
  document.getElementById("cf-site-count").textContent = sites.length;
  const caseParts = sites.map(s => ({
    label: s.name, color: s.color, n: casesFor(s.id).filter(c => isCaseDone(s.id, c.id)).length, of: casesFor(s.id).length,
  }));
  document.getElementById("cases-seg").innerHTML = segBarHTML([...caseParts, { label: "Not done", color: "var(--trk-suspended)", n: total - done }], total);
  document.getElementById("cases-legend").innerHTML = caseParts
    .map(p => `<li><span class="dot" style="background:${p.color}"></span>${escapeHtml(p.label)}<b class="tabular">${p.n}/${p.of}</b></li>`).join("");

  const nx = nextCase();
  const nextEl = document.getElementById("cf-next");
  if(nx){
    const steps = caseSteps(nx.kase, nx.svc.id).map(st => st.label);
    nextEl.innerHTML = `
      <div class="cf-next-head"><span class="edu-badge badge-case">Case</span><span>${nx.allDone ? "All cases complete. Revisit one" : "Next up"} &middot; ${escapeHtml(nx.svc.name)}</span></div>
      <h3 class="cf-next-title">${escapeHtml(nx.kase.title)}</h3>
      <p class="cf-next-one">${escapeHtml(nx.kase.oneLiner || "")}</p>
      <ol class="cf-steps" aria-label="Case steps">${steps.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`;
    document.getElementById("btn-start-case").innerHTML = `${done && !nx.allDone ? "Continue cases" : "Start a case"} <span aria-hidden="true">&rarr;</span>`;
  }
  document.getElementById("cf-sites").innerHTML = sites.map(s => {
    const list = casesFor(s.id), d = list.filter(c => isCaseDone(s.id, c.id)).length;
    return `<li><button class="cf-site" data-go="cases:${s.id}" style="--svc:${s.color}">
      <span class="cf-site-name"><span class="dot" aria-hidden="true"></span>${escapeHtml(s.name)}</span>
      <span class="cf-site-bar" aria-hidden="true"><span style="width:${list.length ? Math.round(100 * d / list.length) : 0}%"></span></span>
      <span class="cf-site-count tabular">${d}/${list.length}<span class="visually-hidden"> cases completed</span></span>
    </button></li>`;
  }).join("");
}

function renderFlashTracker(){
  const all = allCards();
  const st = cardStats(all);
  animateNumber(document.getElementById("stat-due"), st.due);
  document.getElementById("study-all-count").textContent = st.due;
  document.getElementById("btn-study-all").disabled = false;
  document.getElementById("cards-seg").innerHTML = segBarHTML(CARD_SEGMENTS.map(s => ({ ...s, n: st[s.key] })), st.total);
  document.getElementById("cards-legend").innerHTML =
    `<li><span class="dot" style="background:var(--trk-due)"></span>Due today<b class="tabular">${st.due}</b></li>` +
    [...CARD_SEGMENTS].reverse().map(s => `<li><span class="dot" style="background:${s.color}"></span>${s.label}<b class="tabular">${st[s.key]}</b></li>`).join("");
  const activeN = st.total - st.suspended;
  document.getElementById("stat-due-sub").textContent = activeN
    ? `${activeN} of ${st.total} cards unsuspended.`
    : `All ${st.total} cards start suspended. Choose the decks you want in your daily review.`;
}

function renderMethod(){
  const el = document.getElementById("method-list");
  if(!el) return;
  const { total } = caseTotals();
  const steps = [
    ["Learn the framework", "Structured readings for the workflow and for each disease site, each ending in a high-yield summary.", `${BACKGROUND.length + SERVICES.reduce((n, s) => n + docCategoriesFor(s.id).filter(c => DOCS[s.id] && DOCS[s.id][c]).length, 0)} readings`],
    ["See it applied", "Interactive anatomy and imaging plates, worked examples, and staging tools put the framework onto real images.", `${totalPlates()} interactive plates`],
    ["Practice clinical reasoning", "Step-by-step cases ask you to commit to a stage, a treatment, and a dose before revealing the answer.", `${total} clinical cases`],
    ["Reinforce with spaced repetition", "Flashcards that mirror each reading return right before you'd forget them.", `${allCards().length} flashcards`],
  ];
  el.innerHTML = steps.map(([t, p, m], i) => `
    <li class="method-step">
      <span class="method-num tabular">${i + 1}</span>
      <h3>${t}</h3>
      <p>${p}</p>
      <span class="method-meta">${m}</span>
    </li>`).join("");
}

// Which reference categories the modules actually name (from curriculum.json).
function referenceCategories(){
  const sites = SERVICES.map(s => ({ svc: s, info: siteInfo(s.id) }));
  const names = (pred) => sites.filter(x => pred(x.info)).map(x => x.svc.name);
  const trialCount = sites.reduce((n, x) => n + (x.info.trials || []).length, 0);
  const cats = [
    { label: "Clinical practice guidelines", title: "NCCN Clinical Practice Guidelines in Oncology", text: "Workup and treatment tables in each module are simplified from the NCCN guideline for that site.", sites: names(i => i.guideline) },
    { label: "Staging systems", title: "AJCC, FIGO, and WHO classification", text: "Each module states the staging edition it teaches: AJCC 8th or 9th edition, FIGO for gynecologic cancers, and WHO 2021 for CNS tumors.", sites: names(i => (i.staging || []).length) },
    { label: "Clinical trials", title: "Cooperative-group and landmark trials", text: `${trialCount} trials are discussed across the modules, including RTOG and NRG Oncology, EORTC, NSABP, GOG, and other landmark studies.`, sites: names(i => (i.trials || []).length) },
    { label: "Peer-reviewed literature", title: "Open-access imaging and figures", text: "Most radiographic images and figures come from open-access, peer-reviewed articles and openly licensed collections; where recorded, the source and license are given in the caption.", sites: [] },
  ];
  return cats;
}
function renderSourcesTeaser(){
  const el = document.getElementById("src-teaser");
  if(!el) return;
  el.innerHTML = referenceCategories().map(c => `
    <div class="src-cat">
      <div class="src-cat-label">${c.label}</div>
      <div class="src-cat-title">${c.title}</div>
      <p>${c.text}</p>
    </div>`).join("");
}

function renderDashboard(){
  document.getElementById("glance-list").innerHTML = glanceHTML();
  renderPillars();
  renderLearningPath();
  renderSectionGrid();
  renderCasesFeature();
  renderFlashTracker();
  renderMethod();
  renderSourcesTeaser();
  renderSidebar();
  renderMegaMenus();
  updateTopNav();
}

function renderSectionGrid(){
  const grid = document.getElementById("section-grid");
  let list = homeSections().filter(s => s.kind === "site").filter(sectionMatches);
  const sort = homeFilters.sort;
  if(sort === "az") list.sort((a, b) => a.name.localeCompare(b.name));
  else if(sort === "due") list.sort((a, b) => cardStats(b.cards).due - cardStats(a.cards).due || a.order - b.order);
  else if(sort === "progress") list.sort((a, b) => sectionProgress(a) - sectionProgress(b) || a.order - b.order);
  else list.sort((a, b) => a.order - b.order);

  const activeFilters = homeFilters.status.size + homeFilters.has.size;
  document.getElementById("home-count").textContent = activeFilters
    ? `${plural(list.length, "site")} match` : `${plural(list.length, "disease site")}`;
  const fc = document.getElementById("filter-count");
  if(fc){ fc.hidden = !activeFilters; fc.textContent = activeFilters; }
  document.getElementById("home-empty").hidden = list.length > 0;

  grid.innerHTML = list.map(sec => {
    const art = CARD_ART[sec.id];
    const info = siteInfo(sec.id);
    const st = cardStats(sec.cards);
    const cDone = caseDoneCount(sec);
    const started = st.learning + st.mastered + cDone > 0;
    const counts = [
      plural(sec.sections, "reading"),
      st.total ? plural(st.total, "flashcard") : "",
      sec.cases.length ? plural(sec.cases.length, "case") : "",
    ].filter(Boolean).join(" &middot; ");
    const topics = (info.topics || sec.topics).map(t => `<span>${escapeHtml(t)}</span>`).join(" ");
    const progress = started || st.due ? `
        <div class="sc-progress">
          <div class="seg-bar sm" aria-hidden="true">${segBarHTML(CARD_SEGMENTS.map(s => ({ ...s, n: st[s.key] })), st.total)}</div>
          <span class="sc-progress-text tabular">${st.mastered} mastered${st.due ? ` &middot; <b class="is-due">${st.due} due</b>` : ""}${sec.cases.length ? ` &middot; ${cDone}/${sec.cases.length} cases` : ""}</span>
        </div>` : "";
    return `
    <article class="sec-card" style="--svc:${sec.color}" data-kind="${sec.kind}" data-id="${sec.id}">
      <button class="sec-media" data-open tabindex="-1" aria-hidden="true">
        ${art ? `<img src="${art.image}" alt="" loading="lazy">` : ""}
      </button>
      <div class="sec-body">
        <div class="sc-kicker"><span class="sc-dot" aria-hidden="true"></span>Disease site</div>
        <h3 class="sc-title">${escapeHtml(info.title || sec.name)}</h3>
        <p class="sc-topics" aria-label="Topics covered">${topics}</p>
        <p class="sc-counts">${counts}</p>
        ${progress}
      </div>
      <div class="sec-foot">
        <button class="sc-cta" data-open>Explore module<span class="visually-hidden">: ${escapeHtml(sec.name)}</span>${ICONS.arrow}</button>
        ${st.total ? `<button class="icon-btn" data-study title="Study ${escapeHtml(sec.name)} flashcards" aria-label="Study ${escapeHtml(sec.name)} flashcards">${ICONS.play}</button>` : ""}
      </div>
    </article>`;
  }).join("") + (list.length && !activeFilters ? `
    <aside class="sec-card structure-card" aria-label="How every module is built">
      <div class="sc-kicker">How every module is built</div>
      <ol class="structure-list">
        <li>Epidemiology &amp; risk factors</li><li>Anatomy &amp; lymphatics</li><li>Imaging</li><li>Workup &amp; staging</li><li>Treatment paradigms</li>
      </ol>
      <p class="structure-note">Each section ends with a high-yield summary and has its own flashcard deck. Most sites add a set of clinical cases.</p>
    </aside>` : "");

  grid.querySelectorAll(".sec-card:not(.structure-card)").forEach((card, i) => {
    const { kind, id } = card.dataset;
    card.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", () => kind === "bg" ? openBackground(id) : openService(id)));
    const study = card.querySelector("[data-study]");
    if(study) study.addEventListener("click", () => {
      if(kind === "bg"){ const fc = BACKGROUND_FLASHCARD_MAP[id]; startStudySession(fc.svcId, fc.catName); }
      else startStudySession(id, null);
    });
    armReveal(card, Math.min(i, 6) * 40);
  });

  const credits = document.getElementById("card-credits-list");
  if(credits && !credits.childElementCount){
    credits.innerHTML = homeSections().filter(s => s.kind === "site" && CARD_ART[s.id])
      .map(s => `<li><b>${escapeHtml(s.name)}:</b> ${escapeHtml(CARD_ART[s.id].credit)}</li>`).join("");
  }
}

function wireHomeControls(){
  for(const [id, [group, val]] of Object.entries(FILTER_INPUTS)){
    const el = document.getElementById(id);
    el.addEventListener("change", () => {
      el.checked ? homeFilters[group].add(val) : homeFilters[group].delete(val);
      saveHomePrefs(); renderSectionGrid();
    });
  }
  const clear = () => {
    homeFilters.type.clear(); homeFilters.status.clear(); homeFilters.has.clear();
    for(const id of Object.keys(FILTER_INPUTS)) document.getElementById(id).checked = false;
    saveHomePrefs(); renderSectionGrid();
  };
  document.getElementById("filters-clear").addEventListener("click", clear);
  document.getElementById("home-empty-clear").addEventListener("click", clear);
  const sort = document.getElementById("home-sort");
  sort.addEventListener("change", () => { homeFilters.sort = sort.value; saveHomePrefs(); renderSectionGrid(); });
  document.getElementById("btn-manage-decks").addEventListener("click", openDecks);
  document.getElementById("btn-open-cases").addEventListener("click", openCasesHub);
  document.getElementById("btn-start-case").addEventListener("click", startNextCase);
  // close the filter popover on outside click / Escape
  const pop = document.getElementById("home-filters");
  document.addEventListener("click", (e) => { if(pop.open && !pop.contains(e.target)) pop.open = false; });
  pop.addEventListener("keydown", (e) => { if(e.key === "Escape"){ pop.open = false; pop.querySelector("summary").focus(); } });

  // restore remembered filters (per browser). The old "Section" type filter
  // no longer applies: the home grid is disease sites only.
  try{
    const saved = JSON.parse(localStorage.getItem("radonc-home-prefs") || "null");
    if(saved){
      for(const g of ["status", "has"]) homeFilters[g] = new Set(saved[g] || []);
      homeFilters.sort = saved.sort || "course";
      sort.value = homeFilters.sort;
      for(const [id, [group, val]] of Object.entries(FILTER_INPUTS)) document.getElementById(id).checked = homeFilters[group].has(val);
    }
  }catch(e){}
}
function saveHomePrefs(){
  try{
    localStorage.setItem("radonc-home-prefs", JSON.stringify({
      type: [...homeFilters.type], status: [...homeFilters.status], has: [...homeFilters.has], sort: homeFilters.sort,
    }));
  }catch(e){}
}
function startNextCase(){
  const nx = nextCase();
  if(!nx) return openCasesHub();
  casesOrigin = "hub";
  openCaseStepper(nx.svc.id, nx.idx);
}

/* ============================================================
   NAVIGATION: one handler for every [data-go] link
   ("home", "learn", "sites", "cases", "flashcards", "resources",
    "about", "start", "start-case", "bg:<id>", "site:<id>",
    "cases:<svcId>", optionally with "#anchor")
   ============================================================ */
function goHome(anchorId){
  renderDashboard();
  showView("view-dashboard");
  if(anchorId){
    const el = document.getElementById(anchorId);
    if(el) requestAnimationFrame(() => el.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "start" }));
  }
}
function scrollToAnchor(id){
  const el = id && document.getElementById(id);
  if(el) requestAnimationFrame(() => el.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "start" }));
}
function navTo(target){
  const [route, anchor] = String(target).split("#");
  const [kind, arg] = route.split(":");
  closeSearchDialog();
  if(kind === "home") goHome();
  else if(kind === "learn") goHome("learning-path");
  else if(kind === "sites") goHome("disease-sites");
  else if(kind === "start") openBackground(BACKGROUND[0].id);
  else if(kind === "start-case") startNextCase();
  else if(kind === "cases") arg ? openCaseList(arg, "hub") : openCasesHub();
  else if(kind === "flashcards") openDecks();
  else if(kind === "resources") openResources();
  else if(kind === "about") openAbout();
  else if(kind === "bg") openBackground(arg);
  else if(kind === "site") openService(arg);
  if(anchor) scrollToAnchor(anchor);
  closeSidebarIfNarrow();
}
// Which primary-nav item is "current" for the active view.
function currentNavKey(){
  const active = document.querySelector(".view.active")?.id;
  if(active === "view-cases-hub" || active === "view-cases") return "cases";
  if(active === "view-decks" || active === "view-study") return "flashcards";
  if(active === "view-service" || (active === "view-doc" && currentDoc.kind === "disease")) return "sites";
  if(active === "view-doc" && currentDoc.kind === "background") return "learn";
  if(active === "view-resources") return "resources";
  if(active === "view-about") return "about";
  return null;
}

/* ============================================================
   RESOURCES + ABOUT pages
   ============================================================ */
function openResources(){
  renderResources();
  showView("view-resources");
}
function renderResources(){
  document.getElementById("ref-cats").innerHTML = referenceCategories().map(c => `
    <div class="src-cat">
      <div class="src-cat-label">${c.label}</div>
      <div class="src-cat-title">${c.title}</div>
      <p>${c.text}</p>
      ${c.sites.length ? `<p class="src-cat-sites">Named in: ${c.sites.map(escapeHtml).join(", ")}</p>` : ""}
    </div>`).join("");
  document.getElementById("ref-sites").innerHTML = SERVICES.map(s => `
    <details class="ref-site" id="sources-${s.id}" style="--svc:${s.color}">
      <summary><span class="ref-site-dot" aria-hidden="true"></span>${escapeHtml(siteInfo(s.id).title || s.name)}<span class="ref-site-n">${plural((siteInfo(s.id).trials || []).length, "trial")}</span></summary>
      ${siteSourcesHTML(s.id)}
    </details>`).join("");
  const credits = document.getElementById("resources-credits");
  credits.innerHTML = SERVICES.filter(s => CARD_ART[s.id]).map(s => `<li><b>${escapeHtml(s.name)}:</b> ${escapeHtml(CARD_ART[s.id].credit)}</li>`).join("");
}
function siteSourcesHTML(svcId){
  const info = siteInfo(svcId);
  const imgs = imageCount(svcId);
  const rows = [];
  if(info.guideline) rows.push(["Clinical practice guideline", `${escapeHtml(info.guideline)}<span class="ref-note">Workup and treatment tables are simplified from this guideline for learning.</span>`]);
  if((info.staging || []).length) rows.push(["Staging", info.staging.map(escapeHtml).join(" &middot; ")]);
  if((info.trials || []).length) rows.push(["Trials discussed", `<span class="trial-list">${info.trials.map(t => `<span>${escapeHtml(t)}</span>`).join("")}</span>`]);
  if(imgs.total) rows.push(["Images", imgs.credited === imgs.total
    ? `${plural(imgs.total, "image")} in the interactive plates, from open-access, peer-reviewed literature and openly licensed collections. The source and license are in each caption.`
    : `${plural(imgs.total, "image")} in the interactive plates. Sources and licenses are listed in the captions where recorded.`]);
  return `<dl class="ref-dl">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
}
// Images embedded in a site's interactive plates and galleries, and how many
// of them name their source/license in the caption.
const CREDIT_RE = /CC[ -]?BY|CC0|public domain|PMC\d|Wikimedia|OpenNeuro|licen[cs]e/i;
function imageCount(svcId){
  let total = 0, credited = 0;
  const walk = (o) => {
    if(Array.isArray(o)) o.forEach(walk);
    else if(o && typeof o === "object"){
      if(typeof o.image === "string" && o.image){
        total++;
        if(CREDIT_RE.test([o.caption, o.credit, o.source].filter(Boolean).join(" "))) credited++;
      }
      for(const [k, v] of Object.entries(o)) if(k !== "image") walk(v);
    }
  };
  walk(ANATOMY[svcId]); walk(IMAGING[svcId]);
  return { total, credited };
}
function openAbout(){
  document.getElementById("about-glance").innerHTML = glanceHTML();
  showView("view-about");
}

/* ============================================================
   SEARCH: every reading page, disease-site module, flashcard
   category, case set, and individual case
   ============================================================ */
let SEARCH_INDEX = null;
function buildSearchIndex(){
  const idx = [];
  const strip = (html) => String(html || "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ");
  for(const sec of BACKGROUND){
    idx.push({ title: sec.title, where: "Before You Start", kind: "Reading", raw: sec.question + " " + strip(sec.html),
      go: () => openBackground(sec.id) });
  }
  for(const svc of SERVICES){
    const info = siteInfo(svc.id);
    idx.push({ title: info.title || svc.name, where: "Disease site", kind: "Module",
      raw: svc.name + " " + svc.blurb + " " + (info.summary || "") + " " + (info.topics || []).join(" ") + " " + (info.objectives || []).join(" "),
      go: () => openService(svc.id) });
    for(const cat of docCategoriesFor(svc.id)){
      const doc = DOCS[svc.id] && DOCS[svc.id][cat];
      const cards = svcCards(svc.id).filter(c => c.category === cat);
      const cardText = cards.map(c => c.front + " " + c.back).join(" ");
      idx.push({ title: cat, where: svc.name, kind: doc ? "Reading" : "Flashcards",
        raw: cat + " " + svc.name + " " + strip(doc && doc.html) + " " + strip(cardText),
        go: () => doc ? openDoc(svc.id, cat) : startStudySession(svc.id, cat) });
    }
    const list = casesFor(svc.id);
    if(list.length){
      idx.push({ title: "Case-Based Practice", where: svc.name, kind: "Cases", raw: "Cases clinical cases " + svc.name + " " + strip(CASES[svc.id].intro),
        go: () => openCaseList(svc.id, "service") });
      list.forEach((c, i) => {
        idx.push({ title: c.title, where: svc.name, kind: "Case",
          raw: svc.name + " " + caseSearchText(c, svc.id),
          go: () => { currentCasesSvcId = svc.id; casesOrigin = "service"; openCaseStepper(svc.id, i); } });
      });
    }
    const trials = (info.trials || []).join(" ");
    if(info.guideline || trials){
      idx.push({ title: `${svc.name}: Sources & References`, where: "Resources", kind: "Sources",
        raw: [info.guideline, ...(info.staging || []), trials].join(" "),
        go: () => { openResources(); const d = document.getElementById("sources-" + svc.id); if(d){ d.open = true; scrollToAnchor(d.id); } } });
    }
  }
  idx.push({ title: "About RadOnc Sub-I Companion", where: "About", kind: "Page", raw: "about independent educational resource disclaimer philosophy", go: openAbout });
  for(const item of idx){ item.raw = strip(item.raw); item.text = item.raw.toLowerCase(); }
  return idx;
}
function searchTopics(q){
  SEARCH_INDEX = SEARCH_INDEX || buildSearchIndex();
  const phrase = q.toLowerCase().trim();
  const terms = phrase.split(/\s+/).filter(Boolean);
  if(!terms.length) return [];
  const count = (hay, needle) => { let n = 0, i = 0; while((i = hay.indexOf(needle, i)) !== -1 && n < 40){ n++; i += needle.length; } return n; };
  const scored = [];
  for(const item of SEARCH_INDEX){
    const t = item.title.toLowerCase(), w = item.where.toLowerCase();
    let score = 0, ok = true;
    for(const term of terms){
      const inTitle = t.includes(term), inWhere = w.includes(term), n = count(item.text, term);
      if(!inTitle && !inWhere && !n){ ok = false; break; }
      score += (inTitle ? 8 : 0) + (inWhere ? 5 : 0) + Math.sqrt(n);
    }
    if(!ok) continue;
    if(terms.length > 1) score += 4 * Math.sqrt(count(item.text, phrase));
    scored.push({ item, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 10).map(({ item }) => {
    const i = item.text.indexOf(terms.length > 1 && item.text.includes(phrase) ? phrase : terms[0]);
    const snippet = i < 0 || item.title.toLowerCase().includes(phrase) ? "" :
      (i > 40 ? "…" : "") + item.raw.slice(Math.max(0, i - 40), i + 70).trim() + "…";
    return { ...item, snippet };
  });
}
const SEARCH_KIND_CLASS = { Module: "k-module", Reading: "k-reading", Flashcards: "k-cards", Cases: "k-case", Case: "k-case", Sources: "k-source", Page: "k-source" };
// Wires one search input + results listbox. Used by the hero search and the
// header search dialog; both share the same index.
function wireSearch(inputId, boxId){
  const input = document.getElementById(inputId);
  const box = document.getElementById(boxId);
  if(!input || !box) return;
  let results = [], active = -1;
  const close = () => { box.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); };
  const go = (i) => { const r = results[i]; if(!r) return; close(); input.value = ""; input.blur(); closeSearchDialog(); r.go(); };
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  const render = () => {
    const q = input.value.trim();
    if(!q){ close(); return; }
    results = searchTopics(q);
    box.innerHTML = results.length
      ? results.map((r, i) => `<button class="sr-item ${i === active ? "active" : ""}" role="option" id="${boxId}-opt-${i}" aria-selected="${i === active}" data-i="${i}" tabindex="-1">
          <span class="sr-kind ${SEARCH_KIND_CLASS[r.kind] || ""}">${r.kind}</span>
          <span class="sr-main"><span class="sr-title">${escapeHtml(r.title)}</span><span class="sr-where">${escapeHtml(r.where)}</span>${r.snippet ? `<span class="sr-snip">${escapeHtml(r.snippet)}</span>` : ""}</span>
        </button>`).join("")
      : `<div class="sr-empty">No results for "${escapeHtml(q)}". Try a disease site, a trial, or a term like "PTV".</div>`;
    box.hidden = false;
    input.setAttribute("aria-expanded", "true");
    if(active >= 0){
      input.setAttribute("aria-activedescendant", `${boxId}-opt-${active}`);
      const el = document.getElementById(`${boxId}-opt-${active}`);
      if(el) el.scrollIntoView({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
    box.querySelectorAll(".sr-item").forEach(b => b.addEventListener("mousedown", (e) => { e.preventDefault(); go(+b.dataset.i); }));
  };
  input.addEventListener("input", () => { active = -1; render(); });
  input.addEventListener("focus", render);
  input.addEventListener("blur", () => setTimeout(close, 120));
  input.addEventListener("keydown", (e) => {
    if(e.key === "Escape"){ if(!box.hidden) close(); else closeSearchDialog(); return; }
    if(box.hidden) return;
    if(e.key === "ArrowDown"){ e.preventDefault(); active = Math.min(results.length - 1, active + 1); render(); }
    else if(e.key === "ArrowUp"){ e.preventDefault(); active = Math.max(0, active - 1); render(); }
    else if(e.key === "Enter"){ e.preventDefault(); go(active >= 0 ? active : 0); }
  });
}
let searchReturnFocus = null;
function openSearchDialog(){
  // On the home page the hero search is right there; use it.
  const home = document.getElementById("view-dashboard").classList.contains("active");
  if(home){
    const hero = document.getElementById("hero-search");
    hero.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "center" });
    hero.focus({ preventScroll: true });
    return;
  }
  searchReturnFocus = document.activeElement;
  document.getElementById("search-dialog").hidden = false;
  setTimeout(() => document.getElementById("site-search").focus(), 20);
}
function closeSearchDialog(){
  const d = document.getElementById("search-dialog");
  if(!d || d.hidden) return;
  d.hidden = true;
  if(searchReturnFocus && searchReturnFocus.focus) searchReturnFocus.focus();
  searchReturnFocus = null;
}
function wireSearchUI(){
  wireSearch("hero-search", "hero-search-results");
  wireSearch("site-search", "search-results");
  document.getElementById("nav-search-btn").addEventListener("click", openSearchDialog);
  document.getElementById("search-dialog").addEventListener("click", (e) => { if(e.target.id === "search-dialog") closeSearchDialog(); });
  // "/" opens search from anywhere (except while typing or studying)
  document.addEventListener("keydown", (e) => {
    if(e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
    if(e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
    if(document.getElementById("view-study").classList.contains("active")) return;
    e.preventDefault();
    openSearchDialog();
  });
}

/* ============================================================
   ACCOUNT: a simple per-browser profile. Everything (reading,
   flashcards, cases) is open to guests; an account saves progress.
   ============================================================ */
const PROFILE_KEY = "radonc-companion-profile-v1";
let PROFILE = null;
let afterSignIn = null;
function loadProfile(){ try{ PROFILE = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); }catch(e){ PROFILE = null; } }
function saveProfile(){ try{ PROFILE ? localStorage.setItem(PROFILE_KEY, JSON.stringify(PROFILE)) : localStorage.removeItem(PROFILE_KEY); }catch(e){} }
function isSignedIn(){ return !!(PROFILE && PROFILE.name); }
function loadAllProgress(){ loadProgress(); loadSuspended(); loadCaseProgress(); }
function saveAllProgress(){ saveProgress(); saveSuspended(); saveCaseProgress(); }
// After creating an account / signing in: keep what the guest did this session
// on top of anything already saved in this browser, then clear the guest copy.
function mergeGuestIntoAccount(){
  const guest = { p: PROGRESS, s: SUSPENDED, c: CASE_PROGRESS };
  loadAllProgress();
  PROGRESS = { ...PROGRESS, ...guest.p };
  SUSPENDED = { ...SUSPENDED, ...guest.s };
  CASE_PROGRESS = { ...CASE_PROGRESS, ...guest.c };
  saveAllProgress();
  try{ [STORAGE_KEY, SUSPEND_KEY, CASE_STORAGE_KEY].forEach(k => sessionStorage.removeItem(k)); }catch(e){}
}
function guestHasProgress(){
  return Object.keys(PROGRESS).length > 0 || Object.keys(CASE_PROGRESS).length > 0 || Object.keys(SUSPENDED).length > 0;
}
// Guest bar on the flashcard and case views: studying works without an
// account, but progress only lasts until the tab closes.
const GUEST_BAR_VIEWS = ["view-decks", "view-study", "view-cases-hub", "view-cases"];
function updateGuestBar(){
  const bar = document.getElementById("guest-bar");
  if(!bar) return;
  const active = document.querySelector(".view.active")?.id;
  bar.hidden = isSignedIn() || !GUEST_BAR_VIEWS.includes(active);
}
function initials(name){ return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase(); }
function updateSignInButton(){
  const label = document.getElementById("nav-signin-label");
  const btn = document.getElementById("nav-signin");
  if(isSignedIn()){
    label.textContent = PROFILE.name.split(/\s+/)[0];
    btn.classList.add("is-signed-in");
    btn.title = "Your profile and progress";
  } else {
    label.textContent = "Sign In";
    btn.classList.remove("is-signed-in");
    btn.title = "Sign in to track your progress";
  }
}
function progressCode(){
  const payload = { v: 1, profile: PROFILE, progress: PROGRESS, suspended: SUSPENDED, cases: CASE_PROGRESS };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}
function restoreFromCode(code){
  const data = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
  if(!data || data.v !== 1) throw new Error("bad code");
  PROGRESS = data.progress || {}; SUSPENDED = data.suspended || {}; CASE_PROGRESS = data.cases || {};
  if(data.profile && data.profile.name) PROFILE = data.profile;
  saveProgress(); saveSuspended(); saveCaseProgress(); saveProfile();
}
function openAccount(reason){
  const signedIn = isSignedIn();
  document.getElementById("account-signin").hidden = signedIn;
  document.getElementById("account-guest-note").hidden = signedIn || !guestHasProgress();
  document.getElementById("account-profile").hidden = !signedIn;
  document.getElementById("reset-confirm").hidden = true;
  document.getElementById("account-msg").textContent = "";
  document.getElementById("import-msg-a").textContent = "";
  if(signedIn){
    document.getElementById("profile-avatar").textContent = initials(PROFILE.name);
    document.getElementById("profile-name").textContent = PROFILE.name;
    document.getElementById("profile-school").textContent = PROFILE.school || "Progress saved in this browser";
    const st = cardStats(allCards()); const { done, total } = caseTotals();
    document.getElementById("profile-stats").innerHTML = [
      [st.due, "cards due today"], [st.mastered, "cards mastered"], [`${done}/${total}`, "cases done"],
    ].map(([n, l]) => `<div><b class="tabular">${n}</b><span>${l}</span></div>`).join("");
    document.getElementById("export-code").value = progressCode();
  } else {
    document.getElementById("account-reason").textContent = reason || "Everything is open without an account. Create one to save your flashcard and case progress in this browser.";
  }
  document.getElementById("account").hidden = false;
  setTimeout(() => (signedIn ? document.getElementById("account-close") : document.getElementById("signin-name")).focus(), 30);
}
function closeAccount(){ document.getElementById("account").hidden = true; afterSignIn = null; }
function refreshAfterDataChange(){
  SEARCH_INDEX = null;
  updateSignInButton();
  updateGuestBar();
  const active = document.querySelector(".view.active")?.id;
  if(active === "view-decks") renderDecks();
  else if(active === "view-cases-hub") renderCasesHub();
  else if(active === "view-cases" && currentCasesSvcId && !caseUI) renderCaseListView(currentCasesSvcId);
  renderDashboard();
}
function wireAccount(){
  updateSignInButton();
  document.getElementById("nav-signin").addEventListener("click", () => openAccount());
  document.getElementById("guest-bar-btn").addEventListener("click", () => openAccount());
  document.getElementById("account-close").addEventListener("click", closeAccount);
  document.getElementById("account").addEventListener("click", (e) => { if(e.target.id === "account") closeAccount(); });
  document.addEventListener("keydown", (e) => { if(e.key === "Escape" && !document.getElementById("account").hidden) closeAccount(); });
  document.getElementById("signin-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("signin-name").value.trim();
    if(!name) return;
    PROFILE = { name, school: document.getElementById("signin-school").value.trim(), since: todayISO() };
    saveProfile();
    mergeGuestIntoAccount();
    const next = afterSignIn;
    closeAccount();
    refreshAfterDataChange();
    if(next) next();
  });
  const doImport = (areaId, msgId) => {
    const msg = document.getElementById(msgId);
    try{
      restoreFromCode(document.getElementById(areaId).value);
      msg.textContent = "Progress restored.";
      refreshAfterDataChange();
      if(document.getElementById("account-signin").hidden === false && isSignedIn()) openAccount();
    }catch(err){ msg.textContent = "That code didn't work. Copy the whole code from your other device and paste it again."; }
  };
  document.getElementById("import-btn-a").addEventListener("click", () => doImport("import-code-a", "import-msg-a"));
  document.getElementById("import-btn-b").addEventListener("click", () => doImport("import-code-b", "account-msg"));
  document.getElementById("export-copy").addEventListener("click", () => {
    const area = document.getElementById("export-code");
    const msg = document.getElementById("account-msg");
    const fallback = () => { area.focus(); area.select(); msg.textContent = "Code selected. Press Ctrl+C (or Cmd+C) to copy it."; };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(area.value).then(() => { msg.textContent = "Copied. Paste it on your other device."; }, fallback);
    } else fallback();
  });
  document.getElementById("btn-signout").addEventListener("click", () => {
    PROFILE = null; saveProfile(); loadAllProgress(); closeAccount(); refreshAfterDataChange();
  });
  document.getElementById("btn-reset-progress").addEventListener("click", () => { document.getElementById("reset-confirm").hidden = false; });
  document.getElementById("reset-no").addEventListener("click", () => { document.getElementById("reset-confirm").hidden = true; });
  document.getElementById("reset-yes").addEventListener("click", () => {
    PROGRESS = {}; saveProgress();
    document.getElementById("reset-confirm").hidden = true;
    document.getElementById("account-msg").textContent = "Flashcard progress reset.";
    refreshAfterDataChange(); openAccount();
  });
}

/* ============================================================
   TOP NAV: Flashcards (due count) + Cases (completed count)
   ============================================================ */
function totalDue(){ return allCards().filter(c => isDue(c.id)).length; }
function caseTotals(){
  let done = 0, total = 0;
  for(const svc of SERVICES){
    const list = casesFor(svc.id);
    total += list.length;
    done += list.filter(c => isCaseDone(svc.id, c.id)).length;
  }
  return { done, total };
}
function updateTopNav(){
  const due = totalDue();
  const dueEl = document.getElementById("nav-due");
  dueEl.textContent = due;
  dueEl.classList.toggle("zero", due === 0);
  dueEl.setAttribute("aria-label", `${due} due today`);
  updateSignInButton();
  const key = currentNavKey();
  document.querySelectorAll(".pn-link").forEach(b => {
    const on = b.dataset.navKey === key;
    b.classList.toggle("active", on);
    if(on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  document.body.classList.toggle("on-home", document.getElementById("view-dashboard").classList.contains("active"));
}
// Top-nav Flashcards: straight into due cards; with nothing due, the deck list.
function onNavCards(){
  if(totalDue() > 0) startStudySession(null, null, "decks");
  else openDecks();
}

/* ============================================================
   FLASHCARD DECKS: suspend / unsuspend by section
   ============================================================ */
function sectionState(cards){
  const suspendedN = cards.filter(c => isSuspended(c.id)).length;
  return { suspendedN, allActive: suspendedN === 0, allSuspended: suspendedN === cards.length };
}
function sectionStatusHTML(cards){
  const { suspendedN, allActive, allSuspended } = sectionState(cards);
  if(allActive) return `<span class="deck-status active">Active</span>`;
  if(allSuspended) return `<span class="deck-status">Suspended</span>`;
  return `<span class="deck-status partial">${suspendedN} of ${cards.length} suspended</span>`;
}
// Anything active -> offer "Suspend"; otherwise "Unsuspend". A partly suspended
// section offers "Unsuspend" so one click brings the whole section back.
function suspendToggleHTML(cards, attr){
  const { allActive } = sectionState(cards);
  return allActive
    ? `<button class="deck-toggle" ${attr} data-to="suspend">Suspend</button>`
    : `<button class="deck-toggle on" ${attr} data-to="unsuspend">Unsuspend</button>`;
}

function openDecks(){
  DECKS_JUST_ADDED = null;
  renderDecks();
  showView("view-decks");
}

// The section the student just unsuspended on the Flashcards page, so the page
// can offer "study just these" next to "study all": { svcId, catName, label, ids }.
let DECKS_JUST_ADDED = null;
function isJustAdded(svcId, catName){
  return !!DECKS_JUST_ADDED && DECKS_JUST_ADDED.svcId === svcId && DECKS_JUST_ADDED.catName === catName;
}
function deckStudyHTML(due, attr){
  return due ? `<button class="deck-study" ${attr}>Study ${due}</button>` : "";
}
function justAddedBarHTML(totalDueN){
  const a = DECKS_JUST_ADDED;
  if(!a) return "";
  const addedDue = a.ids.filter(id => isDue(id)).length;
  const isEverything = a.svcId === null;
  const studyThese = !isEverything && addedDue
    ? `<button class="btn-primary" id="decks-study-added">Study just these <span class="count-pill">${addedDue}</span></button>` : "";
  const studyAll = totalDueN
    ? `<button class="${studyThese ? "btn-secondary" : "btn-primary"}" id="decks-study-all-bar">Study all my cards <span class="count-pill">${totalDueN}</span></button>` : "";
  return `
    <div class="decks-added-bar" role="status">
      <div class="decks-added-text"><span class="decks-added-check">&#10003;</span>
        Added <b>${a.ids.length} card${a.ids.length === 1 ? "" : "s"}</b> from ${escapeHtml(a.label)} to your reviews.</div>
      <div class="decks-added-actions">${studyThese}${studyAll}
        <button class="decks-added-close" id="decks-added-close" aria-label="Dismiss">&times;</button>
      </div>
    </div>`;
}

function renderDecks(){
  const wrap = document.getElementById("decks-wrap");
  const all = allCards();
  const activeN = all.filter(c => !isSuspended(c.id)).length;
  const due = all.filter(c => isDue(c.id)).length;

  let html = `
    <div class="hub-header">
      <div>
        <h2 class="hub-title">Flashcards</h2>
        <div class="hub-sub"><span>${due}</span> due today &middot; <span>${activeN}</span> of <span>${all.length}</span> cards active</div>
      </div>
      <div class="hub-actions">
        <button class="btn-secondary" id="decks-unsuspend-all">Unsuspend all</button>
        <button class="btn-secondary" id="decks-suspend-all">Suspend all</button>
        <button class="btn-primary" id="decks-study" ${due ? "" : "disabled"}>Study all my cards <span class="count-pill">${due}</span></button>
      </div>
    </div>
    <p class="hub-hint">Cards start suspended. Unsuspend the sections you want in your daily review, then study one section on its own or all of your cards at once. Suspended cards never come up as due, and you can also suspend a single card while studying.</p>
    ${justAddedBarHTML(due)}
  `;

  for(const grp of DECK_GROUPS){
    const cats = categoriesFor(grp.id);
    if(!cats.size) continue;
    const grpCards = svcCards(grp.id);
    const grpDue = grpCards.filter(c => isDue(c.id)).length;
    const grpActive = grpCards.filter(c => !isSuspended(c.id)).length;
    html += `
      <section class="deck-group" style="--svc:${grp.color}">
        <div class="deck-group-head">
          <div class="tile-icon">${grp.icon}</div>
          <div class="deck-group-title">
            <h3>${escapeHtml(grp.name)}</h3>
            <div class="deck-group-meta">${grpActive} of ${grpCards.length} active${grpDue ? ` &middot; <b>${grpDue} due</b>` : ""}</div>
          </div>
          ${deckStudyHTML(grpDue, `data-group="${grp.id}"`)}
          ${suspendToggleHTML(grpCards, `data-group="${grp.id}"`).replace('class="deck-toggle', 'class="deck-toggle deck-toggle-group').replace(">Suspend<", ">Suspend all<").replace(">Unsuspend<", ">Unsuspend all<")}
        </div>
        <div class="deck-rows">
          ${[...cats].map(([catName, cards]) => {
            const catDue = cards.filter(c => isDue(c.id)).length;
            return `
              <div class="deck-row ${sectionState(cards).allSuspended ? "is-suspended" : ""} ${isJustAdded(grp.id, catName) ? "just-added" : ""}">
                <div class="deck-row-info">
                  <div class="deck-row-name">${escapeHtml(catName)}</div>
                  <div class="deck-row-meta">${cards.length} cards${catDue ? ` &middot; <b>${catDue} due</b>` : ""}</div>
                </div>
                ${sectionStatusHTML(cards)}
                ${deckStudyHTML(catDue, `data-group="${grp.id}" data-cat="${encodeURIComponent(catName)}"`)}
                ${suspendToggleHTML(cards, `data-group="${grp.id}" data-cat="${encodeURIComponent(catName)}"`)}
              </div>`;
          }).join("")}
        </div>
      </section>`;
  }
  wrap.innerHTML = html;

  wrap.querySelectorAll(".deck-toggle").forEach(btn => btn.addEventListener("click", () => {
    const svcId = btn.dataset.group;
    const catName = btn.dataset.cat ? decodeURIComponent(btn.dataset.cat) : null;
    let cards = svcCards(svcId);
    if(catName !== null) cards = cards.filter(c => c.category === catName);
    const suspend = btn.dataset.to === "suspend";
    setSuspended(cards.map(c => c.id), suspend);
    const grpName = svcMeta(svcId).name;
    DECKS_JUST_ADDED = suspend ? null
      : { svcId, catName, label: catName === null ? grpName : `${grpName} \u00b7 ${catName}`, ids: cards.map(c => c.id) };
    renderDashboard();
    renderDecks();
  }));
  wrap.querySelectorAll(".deck-study").forEach(btn => btn.addEventListener("click", () => {
    startStudySession(btn.dataset.group, btn.dataset.cat ? decodeURIComponent(btn.dataset.cat) : null, "decks");
  }));
  document.getElementById("decks-unsuspend-all").addEventListener("click", () => {
    setSuspended(all.map(c => c.id), false);
    DECKS_JUST_ADDED = { svcId: null, catName: null, label: "every deck", ids: all.map(c => c.id) };
    renderDashboard(); renderDecks();
  });
  document.getElementById("decks-suspend-all").addEventListener("click", () => {
    setSuspended(all.map(c => c.id), true); DECKS_JUST_ADDED = null; renderDashboard(); renderDecks();
  });
  document.getElementById("decks-study").addEventListener("click", () => startStudySession(null, null, "decks"));
  const addedBtn = document.getElementById("decks-study-added");
  if(addedBtn) addedBtn.addEventListener("click", () => startStudySession(DECKS_JUST_ADDED.svcId, DECKS_JUST_ADDED.catName, "decks"));
  const allBarBtn = document.getElementById("decks-study-all-bar");
  if(allBarBtn) allBarBtn.addEventListener("click", () => startStudySession(null, null, "decks"));
  const closeBtn = document.getElementById("decks-added-close");
  if(closeBtn) closeBtn.addEventListener("click", () => { DECKS_JUST_ADDED = null; renderDecks(); });
}

/* ============================================================
   CASES HUB: every disease site, with completion tracking
   ============================================================ */
function openCasesHub(){
  renderCasesHub();
  showView("view-cases-hub");
}

function renderCasesHub(){
  const wrap = document.getElementById("cases-hub-wrap");
  const { done, total } = caseTotals();
  const pct = total ? Math.round(100*done/total) : 0;
  wrap.innerHTML = `
    <div class="hub-header">
      <div>
        <h2 class="hub-title">Cases</h2>
        <div class="hub-sub"><span>${done}</span> of <span>${total}</span> cases completed</div>
      </div>
    </div>
    <div class="hub-progress"><div class="hub-progress-fill" style="width:${pct}%"></div></div>
    <p class="hub-hint">Pick a disease site to work through its cases step by step: one-liner, imaging, stage, treatment, and dose.</p>
    <div class="grid case-hub-grid">
      ${SERVICES.map(svc => {
        const list = casesFor(svc.id);
        const d = list.filter(c => isCaseDone(svc.id, c.id)).length;
        const p = list.length ? Math.round(100*d/list.length) : 0;
        const complete = list.length && d === list.length;
        return `
          <button class="tile case-hub-tile ${list.length ? "" : "is-empty"}" data-svc="${svc.id}" style="--svc:${svc.color}" ${list.length ? "" : "disabled"}
            aria-label="${escapeHtml(svc.name)}: ${list.length ? `${d} of ${list.length} cases completed` : "no cases yet"}">
            <div class="tile-top">
              <div class="tile-icon">${svc.icon}</div>
              ${complete ? `<span class="case-card-check">&#10003;</span>` : ""}
            </div>
            <div class="tile-name">${escapeHtml(svc.name)}</div>
            ${list.length ? `
              <div class="case-hub-bar"><div style="width:${p}%"></div></div>
              <div class="tile-meta"><span>${list.length} cases</span><span class="case-hub-count">${d}/${list.length} done</span></div>
            ` : `<div class="tile-meta"><span>Cases coming soon</span></div>`}
          </button>`;
      }).join("")}
    </div>
  `;
  wrap.querySelectorAll("[data-svc]:not([disabled])").forEach((btn, i) => {
    btn.addEventListener("click", () => openCaseList(btn.dataset.svc, "hub"));
    armReveal(btn, i * 50);
  });
}

/* ============================================================
   TOP NAV MEGA MENUS (desktop): Learn, Disease Sites, Cases
   ============================================================ */
function megaLink(label, attrs, extra = ""){
  return `<li><button class="mega-link" ${attrs}>${label}${extra}</button></li>`;
}
function megaCol(title, items){
  return `<div class="mega-col"><div class="mega-head">${title}</div><ul class="mega-list">${items.join("")}</ul></div>`;
}
function megaSiteModules(svcId){
  const svc = SERVICES.find(s => s.id === svcId);
  const mods = docCategoriesFor(svcId).map(cat => megaLink(escapeHtml(cat), `data-mega-svc="${svc.id}" data-mega-cat="${escapeHtml(cat)}"`));
  if(casesFor(svcId).length) mods.push(megaLink("Case-Based Practice", `data-go="cases:${svc.id}"`));
  return `<div class="mega-head"><span class="mega-dot" style="background:${svc.color}"></span>${escapeHtml(svc.name)} modules</div>
    <ul class="mega-list">${mods.join("")}</ul>
    <button class="mega-more" data-go="site:${svc.id}">${escapeHtml(svc.name)} overview <span aria-hidden="true">&rarr;</span></button>`;
}
function renderMegaMenus(){
  const learn = document.getElementById("mega-learn");
  if(!learn) return;
  learn.innerHTML = `<div class="mega-inner">
    ${megaCol("Before You Start", BACKGROUND.map(sec => megaLink(`<span class="mega-num">${String(sec.num).padStart(2, "0")}</span>${escapeHtml(sec.title)}`, `data-go="bg:${sec.id}"`)))}
    ${megaCol("Your Curriculum", [
      megaLink("Your learning path", `data-go="learn"`),
      megaLink("Start the curriculum", `data-go="start"`),
      megaLink("All disease sites", `data-go="sites"`),
      megaLink("Resources &amp; sources", `data-go="resources"`),
    ])}
  </div>`;

  const sites = document.getElementById("mega-sites");
  const first = SERVICES[0] && SERVICES[0].id;
  sites.innerHTML = `<div class="mega-inner">
    ${megaCol("Disease Sites", SERVICES.map(svc => {
      const dueN = svcDueCards(svc.id).length;
      return megaLink(`<span class="mega-dot" style="background:${svc.color}"></span>${escapeHtml(svc.name)}`,
        `data-go="site:${svc.id}" data-mega-preview="${svc.id}"${svc.id === first ? ' aria-current="true"' : ""}`,
        dueN > 0 ? `<span class="due-mini">${dueN} due</span>` : "");
    }))}
    <div class="mega-col mega-col-wide" id="mega-site-modules">${first ? megaSiteModules(first) : ""}</div>
  </div>`;

  const casesEl = document.getElementById("mega-cases");
  const caseSites = SERVICES.filter(s => casesFor(s.id).length);
  casesEl.innerHTML = `<div class="mega-inner">
    ${megaCol("Clinical Cases", [
      megaLink("Browse all cases", `data-go="cases"`),
      megaLink("Start the next case", `data-go="start-case"`),
    ])}
    ${megaCol("By Disease Site", caseSites.map(svc => megaLink(`<span class="mega-dot" style="background:${svc.color}"></span>${escapeHtml(svc.name)}`,
      `data-go="cases:${svc.id}"`, `<span class="mega-count">${casesFor(svc.id).length}</span>`)))}
  </div>`;
}

let megaCloseTimer = null, megaOpenedAt = 0;
function openMega(item){
  clearTimeout(megaCloseTimer);
  if(!item.classList.contains("open")) megaOpenedAt = Date.now();
  document.querySelectorAll(".pn-item.has-mega").forEach(it => { if(it !== item) closeMega(it); });
  item.classList.add("open");
  // line the panel's first column up under the first menu item
  const nav = document.getElementById("primary-nav"), bar = nav.closest(".topbar");
  bar.style.setProperty("--mega-x", Math.max(0, nav.getBoundingClientRect().left - bar.getBoundingClientRect().left + 12) + "px");
  item.querySelector(".mega").hidden = false;
  item.querySelector(".pn-trigger").setAttribute("aria-expanded", "true");
}
function closeMega(item){
  item.classList.remove("open");
  item.querySelector(".mega").hidden = true;
  item.querySelector(".pn-trigger").setAttribute("aria-expanded", "false");
}
function closeAllMegas(){
  clearTimeout(megaCloseTimer);
  document.querySelectorAll(".pn-item.has-mega").forEach(closeMega);
}
function wireMegaMenus(){
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
  document.querySelectorAll(".pn-item.has-mega").forEach(item => {
    const trigger = item.querySelector(".pn-trigger");
    // a click right after hover-open shouldn't immediately close the panel
    trigger.addEventListener("click", () => {
      if(!item.classList.contains("open")) openMega(item);
      else if(Date.now() - megaOpenedAt > 400) closeMega(item);
    });
    item.addEventListener("mouseenter", () => { if(canHover.matches) openMega(item); });
    item.addEventListener("mouseleave", () => {
      if(!canHover.matches) return;
      clearTimeout(megaCloseTimer);
      megaCloseTimer = setTimeout(() => closeMega(item), 160);
    });
    item.addEventListener("focusout", (e) => { if(!item.contains(e.relatedTarget)) closeMega(item); });
  });
  const nav = document.getElementById("primary-nav");
  // hovering/focusing a disease site previews its modules in the right column
  const preview = (e) => {
    const btn = e.target.closest && e.target.closest("[data-mega-preview]");
    if(!btn) return;
    const col = document.getElementById("mega-site-modules");
    if(col.dataset.svc === btn.dataset.megaPreview) return;
    col.dataset.svc = btn.dataset.megaPreview;
    col.innerHTML = megaSiteModules(btn.dataset.megaPreview);
    nav.querySelectorAll("[data-mega-preview]").forEach(b => b.toggleAttribute("aria-current", b === btn));
  };
  nav.addEventListener("mouseover", preview);
  nav.addEventListener("focusin", preview);
  nav.addEventListener("click", (e) => {
    const mod = e.target.closest && e.target.closest("[data-mega-cat]");
    if(mod){
      const svc = mod.dataset.megaSvc, cat = mod.dataset.megaCat;
      if(DOCS[svc] && DOCS[svc][cat]) openDoc(svc, cat); else startStudySession(svc, cat);
    }
    if(e.target.closest && e.target.closest(".mega [data-go], .mega [data-mega-cat]")) closeAllMegas();
  });
  document.addEventListener("click", (e) => { if(!nav.contains(e.target)) closeAllMegas(); });
  document.addEventListener("keydown", (e) => {
    if(e.key !== "Escape") return;
    const open = document.querySelector(".pn-item.has-mega.open");
    if(open){ closeMega(open); open.querySelector(".pn-trigger").focus(); }
  });
}

/* ============================================================
   SIDEBAR: browse all content
   ============================================================ */
function renderSidebar(){
  const nav = document.getElementById("sidebar-nav");
  if(!nav) return;
  nav.innerHTML = "";

  // primary destinations (this is the whole menu on phones)
  const dueAll = totalDue();
  const primary = [
    ["dashboard", "Home", "home", "var(--accent)"],
    [null, "Learn", "learn", "var(--accent)"],
    [null, "Disease Sites", "sites", "var(--accent)"],
    ["cases-hub", "Cases", "cases", "var(--mastery-high)"],
    ["decks", "Flashcards", "flashcards", "var(--accent-2)"],
    ["resources", "Resources", "resources", "var(--ink-faint)"],
    ["about", "About", "about", "var(--ink-faint)"],
  ];
  for(const [key, label, go, color] of primary){
    const b = document.createElement("button");
    b.className = "sidebar-link sidebar-dash";
    if(key) b.dataset.nav = key;
    b.dataset.go = go;
    b.innerHTML = `<span class="sidebar-link-dot" style="background:${color}"></span>${escapeHtml(label)}` +
      (go === "flashcards" && dueAll > 0 ? `<span class="due-mini">${dueAll}</span>` : "");
    nav.appendChild(b);
  }

  const bgLabel = document.createElement("div");
  bgLabel.className = "sidebar-section-label";
  bgLabel.textContent = "Before You Start";
  nav.appendChild(bgLabel);

  for(const sec of BACKGROUND){
    const b = document.createElement("button");
    b.className = "sidebar-link sidebar-sub";
    b.dataset.navBg = sec.id;
    b.innerHTML = `<span class="sidebar-num">${String(sec.num).padStart(2,"0")}</span>${escapeHtml(sec.title)}`;
    b.addEventListener("click", () => { openBackground(sec.id); closeSidebarIfNarrow(); });
    nav.appendChild(b);
  }

  const svcLabel = document.createElement("div");
  svcLabel.className = "sidebar-section-label";
  svcLabel.textContent = "Disease Sites";
  nav.appendChild(svcLabel);

  for(const svc of SERVICES){
    const dueN = svcDueCards(svc.id).length;

    const head = document.createElement("button");
    head.className = "sidebar-link sidebar-group-head";
    head.dataset.navSvc = svc.id;
    head.innerHTML = `<span class="sidebar-link-dot" style="background:${svc.color}"></span>${escapeHtml(svc.name)}` +
      (dueN > 0 ? `<span class="due-mini">${dueN}</span>` : "");
    head.addEventListener("click", () => { openService(svc.id); closeSidebarIfNarrow(); });
    nav.appendChild(head);

    const catWrap = document.createElement("div");
    catWrap.className = "sidebar-cats";
    for(const catName of docCategoriesFor(svc.id)){
      const hasDoc = !!(DOCS[svc.id] && DOCS[svc.id][catName]);
      const c = document.createElement("button");
      c.className = "sidebar-link sidebar-cat";
      c.dataset.navSvc = svc.id;
      c.dataset.navCat = catName;
      c.textContent = catName;
      c.addEventListener("click", () => {
        if(hasDoc) openDoc(svc.id, catName); else startStudySession(svc.id, catName);
        closeSidebarIfNarrow();
      });
      catWrap.appendChild(c);
    }
    if(casesFor(svc.id).length){
      const casesBtn = document.createElement("button");
      casesBtn.className = "sidebar-link sidebar-cat";
      casesBtn.dataset.navCases = svc.id;
      casesBtn.textContent = "Case-Based Practice";
      casesBtn.addEventListener("click", () => { openCaseList(svc.id, "service"); closeSidebarIfNarrow(); });
      catWrap.appendChild(casesBtn);
    }
    nav.appendChild(catWrap);
  }

  updateSidebarActive();
}

function updateSidebarActive(){
  const activeView = document.querySelector(".view.active")?.id;
  document.querySelectorAll(".sidebar-link").forEach((el) => {
    let isActive = false;
    if(activeView === "view-dashboard" && el.dataset.nav === "dashboard") isActive = true;
    else if(activeView === "view-decks" && el.dataset.nav === "decks") isActive = true;
    else if(activeView === "view-cases-hub" && el.dataset.nav === "cases-hub") isActive = true;
    else if(activeView === "view-resources" && el.dataset.nav === "resources") isActive = true;
    else if(activeView === "view-about" && el.dataset.nav === "about") isActive = true;
    else if(activeView === "view-service" && el.classList.contains("sidebar-group-head") && el.dataset.navSvc === currentServiceId) isActive = true;
    else if(activeView === "view-doc"){
      if(currentDoc.kind === "background" && el.dataset.navBg === currentDoc.bgId) isActive = true;
      if(currentDoc.kind === "disease" && el.dataset.navSvc === currentDoc.svcId && el.dataset.navCat === currentDoc.catName) isActive = true;
    }
    else if(activeView === "view-cases" && el.dataset.navCases === currentCasesSvcId) isActive = true;
    el.classList.toggle("active", isActive);
  });
}

/* ============================================================
   RENDER + OPEN: BACKGROUND MODULE
   ============================================================ */
// background pages are read-only by design (no flashcard deck attached),
// except where explicitly mapped here to an existing DECKS category.
const BACKGROUND_FLASHCARD_MAP = {
  "how-rt-works": { svcId: "overview", catName: "How Radiation Works" },
  "machines-modalities": { svcId: "overview", catName: "Radiation Modalities" },
  "treatment-planning": { svcId: "overview", catName: "Treatment Planning" },
};

function openBackground(id){
  const idx = BACKGROUND.findIndex(s => s.id === id);
  if(idx === -1) return;
  const sec = BACKGROUND[idx];
  const fc = BACKGROUND_FLASHCARD_MAP[sec.id] || null;
  currentDoc = { kind: "background", svcId: fc ? fc.svcId : null, catName: fc ? fc.catName : null, bgId: id };
  const pos = (i) => String(BACKGROUND[i].num).padStart(2, "0");
  renderModulePage({
    color: "var(--accent)",
    crumbs: [["Learn", "learn"], ["Before You Start", "learn"], [sec.title]],
    eyebrow: "Before You Start",
    position: `Section ${pos(idx)} of ${String(BACKGROUND.length).padStart(2, "0")}`,
    title: sec.title,
    lede: sec.question,
    html: sec.html,
    introLabel: "Orientation",
    mount: (bodyEl) => { mountInteractiveModule(null, null, "var(--accent)"); mountContourExercises(); },
    cards: fc ? svcCards(fc.svcId).filter(c => c.category === fc.catName) : [],
    facts: [["Section", sec.title]],
    path: { title: "Before You Start", items: BACKGROUND.map((s, i) => ({ label: s.title, go: () => openBackground(s.id), current: i === idx })) },
    prev: idx > 0 ? { name: BACKGROUND[idx - 1].title } : null,
    next: idx < BACKGROUND.length - 1 ? { name: BACKGROUND[idx + 1].title } : { name: "Home", label: "Back to" },
    navLabel: `Section ${sec.num} of ${BACKGROUND.length}`,
  });
  showView("view-doc");
}

/* ============================================================
   CONTOUR-DRAWING EXERCISES
   (schematic canvas scenes; freehand draw + compare to the
    correct contour. Point arrays are shared between the scene
    that gets drawn and the "correct" overlay, so they can't drift.)
   ============================================================ */

const BRAINMET_EDEMA_PTS = [
  [300, 92], [330, 100], [348, 122], [355, 150], [348, 178],
  [325, 198], [292, 202], [265, 188], [252, 160], [255, 128],
  [272, 104]
];
const BRAINMET_LESION_PTS = [
  [300, 126], [317, 130], [324, 146], [321, 163],
  [305, 172], [287, 166], [279, 148], [286, 132]
];

const PELVIS_BLADDER_PTS = [
  [230, 82], [268, 90], [282, 116], [272, 142],
  [230, 150], [188, 142], [178, 116], [192, 90]
];
const PELVIS_PROSTATE_PTS = [
  [230, 158], [258, 165], [268, 186], [255, 208],
  [230, 216], [205, 208], [192, 186], [202, 165]
];
const PELVIS_RECTUM_PTS = [
  [195, 222], [230, 214], [268, 222], [280, 244],
  [262, 263], [230, 270], [198, 263], [180, 244]
];

function smoothClosedPathTo(ctx, pts){
  const n = pts.length;
  if(n < 3) return;
  const mid = (a,b) => [(a[0]+b[0])/2, (a[1]+b[1])/2];
  const start = mid(pts[n-1], pts[0]);
  ctx.moveTo(start[0], start[1]);
  for(let i=0;i<n;i++){
    const cur = pts[i], next = pts[(i+1)%n];
    const m = mid(cur, next);
    ctx.quadraticCurveTo(cur[0], cur[1], m[0], m[1]);
  }
}

function drawSmoothBlob(ctx, pts, { fill, stroke, lineWidth, fillAlpha } = {}){
  ctx.save();
  ctx.beginPath();
  smoothClosedPathTo(ctx, pts);
  ctx.closePath();
  if(fill){
    ctx.globalAlpha = fillAlpha == null ? 1 : fillAlpha;
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if(stroke){
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth || 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawBrainMetScene(ctx, W, H){
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#05070c";
  ctx.fillRect(0, 0, W, H);
  // skull + brain
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(230, 180, 150, 133, 0, 0, Math.PI*2);
  ctx.fillStyle = "#2b2f36";
  ctx.fill();
  ctx.strokeStyle = "#565c66";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
  // ventricles
  ctx.save();
  ctx.fillStyle = "#17191d";
  ctx.beginPath(); ctx.ellipse(210, 178, 15, 8, -0.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(252, 178, 15, 8, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  // vasogenic edema (schematic)
  drawSmoothBlob(ctx, BRAINMET_EDEMA_PTS, { fill: "#c7d2cc", fillAlpha: 0.14 });
  // enhancing lesion (the true GTV)
  drawSmoothBlob(ctx, BRAINMET_LESION_PTS, { fill: "#f2ecd9", stroke: "#d8d0b0", lineWidth: 1.5 });
}

// generic axial brain for CNS cases (skull, brain, falx, ventricles; lesions drawn by drawCaseScene)
function drawBrainSchematic(ctx, W, H){
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#05070c";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath(); ctx.ellipse(230, 180, 158, 141, 0, 0, Math.PI*2);
  ctx.fillStyle = "#cfd0d2"; ctx.fill();
  ctx.beginPath(); ctx.ellipse(230, 180, 150, 133, 0, 0, Math.PI*2);
  ctx.fillStyle = "#2b2f36"; ctx.fill();
  ctx.strokeStyle = "#3a3f47"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(230, 50); ctx.lineTo(230, 310); ctx.stroke();
  ctx.fillStyle = "#17191d";
  ctx.beginPath(); ctx.ellipse(210, 178, 15, 8, -0.2, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(252, 178, 15, 8, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

// axial upper abdomen for pancreas/liver cases (liver on the viewer's left, spine posterior)
function drawAbdomenSchematic(ctx, W, H){
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#05070c";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath(); ctx.ellipse(230, 180, 200, 140, 0, 0, Math.PI*2);
  ctx.fillStyle = "#494d52"; ctx.fill();
  ctx.strokeStyle = "#63676d"; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = "#5e5a55"; // liver
  ctx.beginPath(); ctx.ellipse(130, 150, 95, 80, -0.2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#57534f"; // spleen
  ctx.beginPath(); ctx.ellipse(365, 150, 30, 50, 0.3, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#3d4046"; // stomach / bowel
  ctx.beginPath(); ctx.ellipse(300, 110, 45, 30, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#6a6660"; // pancreas
  ctx.beginPath(); ctx.ellipse(250, 185, 70, 14, -0.15, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#5a5f66"; // kidneys
  ctx.beginPath(); ctx.ellipse(160, 245, 26, 36, 0.3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(310, 245, 26, 36, -0.3, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#cfd0d2"; // vertebra
  ctx.beginPath(); ctx.ellipse(232, 265, 28, 24, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#8a8f96"; // aorta
  ctx.beginPath(); ctx.arc(250, 228, 10, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

// sagittal spine for cord-compression cases (vertebral bodies, cord)
function drawSpineSchematic(ctx, W, H){
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#05070c";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  for(let i = 0; i < 7; i++){
    const y = 20 + i * 48;
    ctx.fillStyle = "#8d9096";
    ctx.fillRect(150, y, 90, 38);
    ctx.fillStyle = "#3b3f46";
    ctx.fillRect(150, y + 38, 90, 10);
  }
  ctx.fillStyle = "#1b3a4a";
  ctx.fillRect(250, 10, 44, 340);
  ctx.fillStyle = "#6b7078";
  ctx.fillRect(262, 10, 20, 340);
  ctx.fillStyle = "#4a4e55";
  for(let i = 0; i < 7; i++) ctx.fillRect(304, 26 + i * 48, 50, 26);
  ctx.restore();
}

function drawPelvisScene(ctx, W, H){
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#05070c";
  ctx.fillRect(0, 0, W, H);
  // body outline
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(230, 180, 195, 132, 0, 0, Math.PI*2);
  ctx.fillStyle = "#494d52";
  ctx.fill();
  ctx.strokeStyle = "#63676d";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
  // pelvic bone hints
  ctx.save();
  ctx.fillStyle = "#cfd0d2";
  ctx.beginPath(); ctx.ellipse(65, 180, 16, 58, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(395, 180, 16, 58, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  // bladder
  drawSmoothBlob(ctx, PELVIS_BLADDER_PTS, { fill: "#33373c", stroke: "#54585d", lineWidth: 1.5 });
  // prostate
  drawSmoothBlob(ctx, PELVIS_PROSTATE_PTS, { fill: "#5c5c5c", stroke: "#7a7a7a", lineWidth: 1.5 });
  // rectum (the true OAR)
  drawSmoothBlob(ctx, PELVIS_RECTUM_PTS, { fill: "#3a3a3a", stroke: "#5a5a5a", lineWidth: 1.5 });
  ctx.save();
  ctx.fillStyle = "#0e0e0e";
  ctx.beginPath(); ctx.arc(224, 240, 3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(244, 235, 2, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function ellipsePoints(cx, cy, rx, ry, n = 10){
  const pts = [];
  for(let i=0;i<n;i++){
    const a = (i/n) * Math.PI * 2;
    pts.push([cx + rx*Math.cos(a), cy + ry*Math.sin(a)]);
  }
  return pts;
}

function drawChestSchematic(ctx, W, H){
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#05070c";
  ctx.fillRect(0, 0, W, H);
  // body outline
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(230, 180, 200, 140, 0, 0, Math.PI*2);
  ctx.fillStyle = "#33383f";
  ctx.fill();
  ctx.strokeStyle = "#54585d";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
  // lung fields
  ctx.save();
  ctx.fillStyle = "#22262c";
  ctx.beginPath(); ctx.ellipse(140, 185, 90, 125, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(320, 185, 90, 125, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  // heart
  ctx.save();
  ctx.fillStyle = "#4a3438";
  ctx.beginPath(); ctx.ellipse(210, 235, 52, 48, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#63474c";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  // trachea + carina + main bronchi
  ctx.save();
  ctx.strokeStyle = "#7d828a";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(230, 45);
  ctx.lineTo(230, 120);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(230, 120); ctx.lineTo(190, 150); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(230, 120); ctx.lineTo(270, 150); ctx.stroke();
  ctx.restore();
  // spine (posterior)
  ctx.save();
  ctx.fillStyle = "#cfd0d2";
  ctx.beginPath(); ctx.ellipse(230, 322, 14, 10, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  // L / R orientation labels (radiologic convention: patient's right on viewer's left)
  ctx.save();
  ctx.font = "600 13px monospace";
  ctx.fillStyle = "#8a8f97";
  ctx.textAlign = "center";
  ctx.fillText("R", 55, 60);
  ctx.fillText("L", 405, 60);
  ctx.restore();
}

function drawContourOverlay(ctx, pts, color, { smooth, close } = {}){
  if(pts.length < 2) return;
  ctx.save();
  ctx.beginPath();
  if(smooth && pts.length >= 3){
    smoothClosedPathTo(ctx, pts);
    ctx.closePath();
  } else {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if(close) ctx.closePath();
  }
  if(pts.length >= 3){
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

function renderContourExercise(container, opts){
  const W = opts.W || 460, H = opts.H || 360;
  container.classList.add("contour-widget");
  container.innerHTML = `
    <div class="cw-title">${escapeHtml(opts.title)}</div>
    <div class="cw-instructions">${opts.instructions}</div>
    <div class="cw-canvas-wrap"><canvas width="${W}" height="${H}"></canvas></div>
    <div class="cw-controls">
      <button type="button" class="cw-btn" data-act="clear">Clear my contour</button>
      <button type="button" class="cw-btn primary" data-act="compare">Compare to correct contour</button>
      <button type="button" class="cw-btn" data-act="retry" hidden>Try again</button>
    </div>
    <div class="cw-legend" hidden>
      <span><span class="cw-swatch" style="--sw:${opts.userColor}"></span>Your contour</span>
      <span><span class="cw-swatch" style="--sw:${opts.correctColor}"></span>${escapeHtml(opts.correctLabel)}</span>
    </div>
    <div class="cw-explanation" hidden></div>
  `;

  const canvas = container.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const legendEl = container.querySelector(".cw-legend");
  const explanationEl = container.querySelector(".cw-explanation");
  const compareBtn = container.querySelector('[data-act="compare"]');
  const retryBtn = container.querySelector('[data-act="retry"]');
  const clearBtn = container.querySelector('[data-act="clear"]');

  let userPts = [];
  let drawing = false;
  let revealed = false;

  function toCanvasCoords(evt){
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
    return [(evt.clientX - rect.left) * scaleX, (evt.clientY - rect.top) * scaleY];
  }

  function redraw(){
    opts.sceneDraw(ctx, W, H);
    if(revealed) drawContourOverlay(ctx, opts.correctPts, opts.correctColor, { smooth: true });
    if(userPts.length > 1) drawContourOverlay(ctx, userPts, opts.userColor, { smooth: false, close: !drawing });
  }

  canvas.addEventListener("pointerdown", (e) => {
    if(revealed) return;
    drawing = true;
    userPts = [toCanvasCoords(e)];
    canvas.setPointerCapture(e.pointerId);
    redraw();
  });
  canvas.addEventListener("pointermove", (e) => {
    if(!drawing || revealed) return;
    userPts.push(toCanvasCoords(e));
    redraw();
  });
  const endStroke = () => { if(drawing){ drawing = false; redraw(); } };
  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointerleave", endStroke);
  canvas.addEventListener("pointercancel", endStroke);

  clearBtn.addEventListener("click", () => { userPts = []; redraw(); });

  compareBtn.addEventListener("click", () => {
    revealed = true;
    legendEl.hidden = false;
    explanationEl.hidden = false;
    explanationEl.innerHTML = opts.explanation;
    compareBtn.hidden = true;
    retryBtn.hidden = false;
    redraw();
    if(typeof opts.onCompare === "function") opts.onCompare();
  });

  retryBtn.addEventListener("click", () => {
    revealed = false;
    userPts = [];
    legendEl.hidden = true;
    explanationEl.hidden = true;
    compareBtn.hidden = false;
    retryBtn.hidden = true;
    redraw();
  });

  redraw();
}

function mountContourExercises(){
  const gtvMount = document.getElementById("exercise-gtv-brainmet");
  if(gtvMount){
    renderContourExercise(gtvMount, {
      title: "Try It: Contour the GTV",
      instructions: "This is a schematic axial T1 post-contrast brain MRI with a solitary metastasis. Freehand-draw what you think the GTV is, then compare. Remember: GTV = the visible, enhancing tumor only, not the surrounding edema.",
      sceneDraw: drawBrainMetScene,
      correctPts: BRAINMET_LESION_PTS,
      correctColor: "#4ade80",
      userColor: "#f5b942",
      correctLabel: "Correct GTV",
      explanation: "<strong>How'd you do?</strong> The correct GTV hugs only the enhancing lesion itself. The lighter, blurrier halo around it is vasogenic edema, real, and worth noting, but it isn't part of the GTV. For brain mets, CTV is usually skipped entirely (see &ldquo;When a Layer Gets Skipped&rdquo; above): GTV goes straight to PTV.",
    });
  }
  const oarMount = document.getElementById("exercise-oar-rectum");
  if(oarMount){
    renderContourExercise(oarMount, {
      title: "Try It: Contour the Rectum (OAR)",
      instructions: "This is a schematic axial pelvic CT at the level of the prostate. Freehand-draw the rectum, the key posterior OAR for prostate radiation.",
      sceneDraw: drawPelvisScene,
      correctPts: PELVIS_RECTUM_PTS,
      correctColor: "#60a5fa",
      userColor: "#f5b942",
      correctLabel: "Correct Rectum",
      explanation: "<strong>How'd you do?</strong> The rectum is contoured as a solid organ immediately posterior to the prostate, from the rectosigmoid junction down to the anus. It's one of the two dose-limiting OARs (with the bladder) that shapes how tightly a prostate plan can be built.",
    });
  }
}

/* ============================================================
   QUIZ CAROUSELS
   (one question at a time: think first, reveal the answer,
    then step to another question on the same topic.)
   ============================================================ */

const QUIZ_SETS = {
  "rad101-intents": [
    {
      q: "A patient with rectal cancer receives chemoradiation <em>before</em> surgery, to shrink the tumor and improve the odds of a clean resection. What intent is this?",
      a: "<strong>Neoadjuvant.</strong> Radiation is being given before the primary treatment (surgery) specifically to set that treatment up for success.",
    },
    {
      q: "A patient completes a lumpectomy for early breast cancer, then receives whole-breast radiation to lower the chance the cancer returns locally. What intent is this?",
      a: "<strong>Adjuvant.</strong> The visible tumor is already gone; radiation is cleaning up any microscopic disease left behind after the primary treatment (surgery).",
    },
    {
      q: "A patient with locally advanced head and neck cancer isn't a surgical candidate. She receives chemoradiation as her main treatment, aiming to cure her disease. What intent is this?",
      a: "<strong>Definitive.</strong> Radiation (often with concurrent chemotherapy) is the main treatment, aiming to cure or permanently control the cancer, with nothing else planned to follow it.",
    },
    {
      q: "A patient with widely metastatic cancer has a painful bone metastasis. She receives a short course of radiation to that site to relieve the pain, not to treat her cancer overall. What intent is this?",
      a: "<strong>Palliative.</strong> The goal is symptom relief, not cure, which is why these courses are usually shorter than definitive treatment.",
    },
  ],
  "modalities-pick": [
    {
      q: "A head and neck tumor wraps around the spinal cord and parotid glands, and needs a highly sculpted dose distribution over several weeks. Which technique, and why?",
      a: "<strong>IMRT or VMAT.</strong> The target sits close to critical structures, so beam intensity modulation is needed to shape dose around them while sparing the cord and parotids &mdash; a job 3D-CRT's simple fixed beams can't do as precisely.",
    },
    {
      q: "A patient has a single, small brain metastasis. The team wants to deliver a very high, tightly conformal dose in a single session, with minimal margin and rapid falloff outside the target. Which technique?",
      a: "<strong>SRS</strong> (stereotactic radiosurgery). It's used for small intracranial targets like brain mets, delivering a highly precise, high dose in one or a few fractions, with no incision involved.",
    },
    {
      q: "A patient with cervical cancer is receiving definitive chemoradiation. After external beam treatment, the team plans to place a radioactive source directly in the uterus and vagina to boost dose to the cervix. Which technique, and why can't it just be replaced with more external beam?",
      a: "<strong>Brachytherapy.</strong> Because dose falls off so rapidly with distance from the source, it can deliver a very high dose right at the cervix while sparing nearby tissue &mdash; a dose gradient external beam alone can't reproduce. For definitive cervical cancer, brachytherapy is considered essential, not optional.",
    },
    {
      q: "A patient needs palliative radiation to a painful bone metastasis. The team wants a simple, fast plan without much sculpting. Which technique fits best?",
      a: "<strong>3D-CRT.</strong> A few fixed beams shaped to the target is often all that's needed for a straightforward palliative course, where speed and simplicity matter more than a highly conformal dose distribution.",
    },
  ],
  "consult-spiel": [
    {
      q: "How would you adjust the side-effect discussion for a head and neck patient versus a pelvic patient?",
      a: "For head and neck, emphasize mucositis, dysphagia, dry mouth, and skin changes in the neck. For pelvic radiation, emphasize bowel changes (diarrhea), bladder symptoms (frequency, urgency, burning), and skin changes in the treated area. Same framework, different expected toxicity profile.",
    },
    {
      q: "A patient assumes that today's simulation appointment means treatment is starting today. What should you clarify?",
      a: "<strong>Simulation is not treatment</strong> &mdash; it's a planning CT done in the treatment position, used to build the plan. Actual treatment typically doesn't start until one to two weeks later, after contouring, planning, and quality assurance are complete.",
    },
    {
      q: "A patient is worried that daily treatment visits will take up their whole day. What can you tell them about how that time is actually spent?",
      a: "Visits are usually around an hour, but the actual radiation delivery itself only takes a few minutes &mdash; most of the visit is spent getting the patient positioned and lined up correctly.",
    },
    {
      q: "A patient feels completely fine during week one of treatment and wonders if it's even working. What should you prepare them for?",
      a: "Side effects generally build gradually over the course of treatment, so the later weeks (and sometimes the period right after finishing) are often harder than the first few days. Feeling well early on doesn't mean the treatment isn't working.",
    },
  ],
  "breast-epi": [
    {
      q: "A 38-year-old with a newly diagnosed triple-negative breast cancer asks if it could be genetic. Which gene is most associated with this subtype?",
      a: "<strong>BRCA1.</strong> BRCA1 carriers disproportionately develop triple-negative (basal-like) cancer. She should be referred for genetic testing, which can also affect surgery and radiation choices.",
    },
    {
      q: "Which molecular subtype has the best prognosis, and what is its receptor profile?",
      a: "<strong>Luminal A</strong>: ER/PR positive, HER2 negative, low Ki-67 (&lt;14%). About 70% of breast cancers.",
    },
    {
      q: "A patient treated with mantle-field radiation for Hodgkin lymphoma at age 16 asks about her breast cancer risk. What should you tell her?",
      a: "Her risk is <strong>substantially increased</strong>. Chest radiation at a young age is a major risk factor, and she qualifies for <strong>high-risk screening with annual MRI</strong> plus mammography, usually starting 8 years after radiation or at age 25.",
    },
    {
      q: "Why might a patient with a germline TP53 mutation be steered toward mastectomy instead of lumpectomy?",
      a: "<strong>Li-Fraumeni syndrome.</strong> Lumpectomy requires whole-breast radiation, and these patients have a high risk of <strong>radiation-induced second cancers</strong>, so avoiding RT is preferred when possible.",
    },
  ],
  "breast-anatomy": [
    {
      q: "A pathologist describes a tumor as E-cadherin negative with cells in single-file lines. Which histology is this, and why does it matter for imaging?",
      a: "<strong>Invasive lobular carcinoma.</strong> ILC often doesn't form a mass and can be <strong>missed on mammogram</strong>; it's more often multicentric or bilateral, so <strong>MRI</strong> is commonly used to define extent.",
    },
    {
      q: "A node lies directly behind the pectoralis minor. Which axillary level is it?",
      a: "<strong>Level II.</strong> Lateral to the pec minor is level I, behind it is level II (including Rotter's interpectoral nodes), and medial to it is level III (infraclavicular).",
    },
    {
      q: "A lower inner quadrant tumor is being planned. Which nodal basin is it more likely to drain to than an upper outer tumor?",
      a: "The <strong>internal mammary nodes</strong>, which run next to the sternum in intercostal spaces 1&ndash;3. The axilla is still the main basin for every quadrant.",
    },
    {
      q: "A tumor invades the pectoralis major but not the ribs or intercostal muscles. Is it T4a?",
      a: "<strong>No.</strong> Pectoralis muscle invasion alone does not count as chest wall invasion. T4a requires the <strong>ribs, intercostal muscles, or serratus anterior</strong>.",
    },
  ],
  "breast-imaging": [
    {
      q: "A screening mammogram shows fine linear branching (casting) calcifications. What do they suggest?",
      a: "<strong>High-grade (comedo) DCIS.</strong> Linear/casting calcifications follow a duct filled with necrotic tumor. Next step: diagnostic views and <strong>stereotactic core biopsy</strong>.",
    },
    {
      q: "On ultrasound, a mass is taller than wide with posterior shadowing. Benign or suspicious?",
      a: "<strong>Suspicious.</strong> Taller-than-wide orientation, irregular margins, and posterior acoustic shadowing favor cancer. A benign cyst is wider than tall with posterior enhancement.",
    },
    {
      q: "Which breast MRI kinetic curve is most suspicious for malignancy?",
      a: "<strong>Type III (washout)</strong>: fast uptake, then a drop. Type II (plateau) is intermediate; Type I (persistent rise) favors benign.",
    },
    {
      q: "A 55-year-old has a 1.2 cm ER+ cancer and no palpable nodes. Should she get a PET/CT?",
      a: "<strong>No.</strong> Systemic staging imaging isn't recommended for asymptomatic stage I&ndash;II disease; it finds more false positives than metastases. PET/CT is for <strong>stage III</strong> (and select stage IIB).",
    },
  ],
  "breast-staging": [
    {
      q: "A 4.5 cm tumor with fixed, matted level II axillary nodes. What are the T, N, and group stage?",
      a: "<strong>cT2 cN2a = Stage IIIA.</strong> 2&ndash;5 cm is T2; fixed or matted level I/II nodes are cN2a; T0&ndash;2 N2 is IIIA.",
    },
    {
      q: "After surgery, 5 of 14 axillary nodes are positive. What is the pN stage?",
      a: "<strong>pN2a</strong> (4&ndash;9 positive axillary nodes). 1&ndash;3 = pN1a, &ge;10 = pN3a.",
    },
    {
      q: "A sentinel node shows a 0.15 mm cluster of tumor cells. How is it staged?",
      a: "<strong>pN0(i+)</strong>: isolated tumor cells &le;0.2 mm count as node-negative. 0.2&ndash;2 mm would be a micrometastasis (pN1mi).",
    },
    {
      q: "A patient has a positive contralateral axillary node. What does that do to the stage?",
      a: "It's <strong>M1 (Stage IV)</strong>. Contralateral nodes count as distant disease, unlike <strong>ipsilateral</strong> supraclavicular nodes, which are cN3c (Stage IIIC).",
    },
  ],
  "breast-treatment": [
    {
      q: "A 62-year-old has a 1.8 cm ER+ cancer with 1 of 3 positive sentinel nodes after lumpectomy. Does she need an axillary dissection?",
      a: "<strong>No.</strong> She fits <strong>ACOSOG Z0011</strong>: cT1&ndash;2 cN0, 1&ndash;2 positive sentinel nodes, lumpectomy with planned whole-breast RT. Omitting ALND didn't change survival.",
    },
    {
      q: "After mastectomy, pathology shows a 3 cm tumor with 5 of 12 positive nodes and negative margins. Is PMRT indicated?",
      a: "<strong>Yes.</strong> <strong>&ge;4 positive nodes</strong> is an absolute PMRT indication. Treat the chest wall plus regional nodes (SCV, level III, IMN).",
    },
    {
      q: "A 74-year-old has a 1.1 cm ER+ grade 1 cancer, node-negative, with clear margins, and plans to take an aromatase inhibitor. What's a reasonable radiation option?",
      a: "<strong>Omitting radiation</strong> (CALGB 9343, PRIME II): RT lowers local recurrence but doesn't change survival for this group. Short-course whole-breast or partial breast RT are also reasonable.",
    },
    {
      q: "Why isn't chemotherapy given at the same time as breast radiation?",
      a: "Concurrent cytotoxic chemo adds <strong>toxicity</strong> (skin, lung, blood counts) without a clear benefit, so RT follows chemo. <strong>Trastuzumab</strong> and <strong>endocrine therapy</strong> can be given during RT.",
    },
  ],
  "hn-epi": [
    {
      q: "What is the surrogate IHC marker used clinically to identify HPV-driven oropharyngeal cancer, and what upstream viral event causes it to be overexpressed?",
      a: "<strong>p16.</strong> HPV's E7 oncoprotein inactivates the retinoblastoma protein (pRb), which normally keeps p16 suppressed, so p16 becomes overexpressed. A p16-positive oropharynx cancer is staged with the HPV-associated system.",
    },
    {
      q: "A 45-year-old non-smoker presents with a tonsil mass. Compared to a 65-year-old heavy smoker/drinker with the same diagnosis, what's different about the tumor biology to expect?",
      a: "The younger nonsmoker's tumor is more likely <strong>HPV-positive</strong>: nonkeratinizing/basaloid histology, p16+, driven by E6/E7 oncoproteins - and it carries a substantially better prognosis stage-for-stage, even though it may present with more extensive nodal disease.",
    },
    {
      q: "What premalignant oral mucosal lesion should never be dismissed as “just irritation,” and what's its approximate 10-year transformation risk?",
      a: "<strong>Leukoplakia</strong> - a white mucosal patch with roughly a 1-20% risk of transforming into invasive squamous cell carcinoma over 10 years. Any nonhealing white or red oral lesion deserves biopsy.",
    },
    {
      q: "What single virus is detectable in nearly 95% of endemic nasopharyngeal carcinoma cases, and what dietary exposure is classically linked to it?",
      a: "<strong>Epstein-Barr virus (EBV).</strong> Salt-preserved fish (along with other preserved foods and a low fruit/vegetable diet) is the classic dietary risk factor in endemic regions.",
    },
  ],
  "hn-anatomy": [
    {
      q: "A patient has a lower motor neuron injury to CN XII on the right. Which way does the tongue deviate on protrusion, and why?",
      a: "<strong>Toward the right</strong> (the side of the lesion) - the unopposed, intact left genioglossus pushes the tongue tip toward the weak side.",
    },
    {
      q: "A patient with a tonsil mass presents with ear pain but a completely normal ear exam. What's the anatomic explanation?",
      a: "Referred otalgia via <strong>CN IX (glossopharyngeal)</strong> - specifically Jacobson's nerve (tympanic nerve), which carries sensation from the middle ear and shares its root with the nerve supplying the oropharynx/tonsil.",
    },
    {
      q: "Why does early glottic cancer so rarely need elective neck treatment, while early supraglottic cancer almost always does?",
      a: "The glottis has almost no lymphatics, so early glottic cancer rarely spreads to nodes (~2% for T1). The supraglottis has a rich lymphatic network, so occult nodal spread is assumed from the outset.",
    },
    {
      q: "A patient develops hoarseness and is found to have vocal cord paralysis from tumor invasion near the tracheoesophageal groove. Which nerve is involved, and what does this finding mean for T-stage?",
      a: "The <strong>recurrent laryngeal nerve</strong> (a branch of CN X). Cord immobility/fixation is a T-stage-defining finding - at least T3 disease.",
    },
  ],
  "hn-lymph": [
    {
      q: "A tumor of the anterior oral tongue is being planned. Which nodal level, not routinely covered for most other oral cavity subsites, needs specific attention here?",
      a: "<strong>Level Ia (submental)</strong> - at risk from the lower lip, anterior oral tongue, and anterior floor of mouth specifically; most other oral cavity subsites drain to Ib instead.",
    },
    {
      q: "Which nodal regions are at risk in nasopharyngeal carcinoma, and how does that differ from most other H&N sites?",
      a: "The <strong>retropharyngeal</strong> nodes, <strong>level II</strong>, and <strong>level V</strong>, usually on <strong>both sides</strong>. NPC has rich lymphatic drainage, so level V (posterior triangle) is routinely at risk, which is not true for most other subsites.",
    },
    {
      q: "A patient has a grossly involved level II node and no other visible nodes. How are the involved node and the rest of the neck treated differently?",
      a: "The node itself is <strong>GTVn</strong> and gets the <strong>full definitive dose</strong>. The levels at risk for microscopic spread (which become more likely when a neighboring level is involved) form the <strong>elective CTV</strong> at a lower dose. The exact levels depend on the primary site, laterality, and extent.",
    },
    {
      q: "Subglottic tumor extension specifically mandates coverage of which nodal level, and why?",
      a: "<strong>Level VI</strong> (central/pretracheal, including the Delphian node) - the subglottis' lymphatics drain directly into this central compartment.",
    },
  ],
  "hn-imaging": [
    {
      q: "Why is MRI generally preferred over CT for staging an oral cavity primary?",
      a: "Depth of invasion - the single biggest driver of oral cavity T-stage - is a soft-tissue measurement, and MRI's soft-tissue contrast resolves it far better than CT.",
    },
    {
      q: "What is the earliest imaging sign of nasopharyngeal carcinoma, and where does it occur?",
      a: "Effacement of the <strong>fossa of Rosenm&uuml;ller</strong>, the mucosal recess (still confined by the pharyngobasilar fascia) where most NPC arises.",
    },
    {
      q: "A patient finishes chemoradiation for a node-positive oropharynx cancer. Which scan is used to look for residual neck disease, and when?",
      a: "<strong>PET/CT about 12 weeks after treatment.</strong> Active tumor is FDG-avid while scar usually is not, so a negative scan can spare the patient a neck dissection.",
    },
    {
      q: "A patient completes chemoradiation for oropharyngeal cancer and a follow-up scan shows an FDG-avid area along a nerve near the treated site. How does PET-CT help distinguish what this represents?",
      a: "True recurrent tumor spreading along a nerve is <strong>FDG-avid</strong>, while radiation-induced neuritis typically is <strong>not</strong> - a distinction plain CT or MRI alone often cannot make.",
    },
  ],
  "hn-staging": [
    {
      q: "A patient's oral tongue tumor is 1.8cm on exam (which alone would suggest T1) but has a measured depth of invasion of 7mm on MRI. What does DOI >5mm do to the T-stage here?",
      a: "It upgrades the tumor from <strong>T1 to T2</strong>, despite the small surface diameter - DOI, not surface size, is driving the stage. (For tumors &gt;2cm, a DOI &gt;10mm pushes the tumor to T3, or to T4a if it is also &gt;4cm.)",
    },
    {
      q: "What two variables define N-stage in nasopharyngeal carcinoma, replacing the size/count-based system used elsewhere?",
      a: "<strong>Location of involved nodes relative to the caudal border of the cricoid cartilage, and laterality.</strong> Any node below the cricoid, or over 6cm, is N3 regardless of node count.",
    },
    {
      q: "A resected tumor has extranodal extension (ENE) on final pathology, with negative margins. Does this patient need adjuvant treatment intensification, and why?",
      a: "Yes - ENE is one of only two definite indications for postoperative chemoradiation (the other being a positive margin), because it signals disease already outside the node's capsule.",
    },
    {
      q: "A patient's workup shows no evidence of disease outside the head and neck region. What M-stage is this?",
      a: "<strong>M0.</strong> There's no further subdivision in H&N cancer - M-stage is simply M0 or M1, unlike some other cancers that split M1 into subcategories.",
    },
  ],
  "hn-treatment": [
    {
      q: "A patient with T4a, cN2 oropharyngeal cancer is being treated definitively with radiation. What should be added to the radiation, and to what dose is the gross disease treated?",
      a: "<strong>Concurrent cisplatin</strong> (given cT3-4 or cN2+ in the definitive setting) - with <strong>70 Gy/35 fractions</strong> to the gross primary/involved nodes as a simultaneous integrated boost.",
    },
    {
      q: "A patient with locally advanced laryngeal cancer has a non-functional larynx due to extensive tumor destruction. What's the treatment approach, and how does this differ from a patient with a functional larynx?",
      a: "Upfront <strong>total laryngectomy</strong>. A patient with a functional larynx and similarly advanced disease would instead get definitive concurrent chemoradiation as an organ-preservation approach - the decision is a functional judgment, not purely a staging one.",
    },
    {
      q: "Why is surgery not the primary treatment for nasopharyngeal carcinoma, unlike most other H&N subsites?",
      a: "The tumor's deep skull-base location makes primary resection extremely difficult - surgery is reserved as a salvage option for recurrence, while chemoradiation is the primary approach.",
    },
    {
      q: "A patient with HPV-positive oropharyngeal cancer asks whether they can get a less intense treatment given their better prognosis. What's the current standard answer?",
      a: "Outside of a clinical trial, HPV-positive disease is still treated with the <strong>same intensity</strong> as HPV-negative disease. Substituting cetuximab for cisplatin produced worse survival, and dose de-escalation strategies have so far failed to show they're safe.",
    },
    {
      q: "A patient asks why the plan is trying to keep dose low in the muscles at the back of the throat. Which structures are these, and what toxicity are they linked to?",
      a: "The <strong>pharyngeal constrictors</strong>. Higher dose to them is linked to long-term <strong>dysphagia</strong> and aspiration, just as parotid dose drives xerostomia and mandible dose drives osteoradionecrosis risk.",
    },
  ],
  "th-epi": [
    {
      q: "A 42-year-old woman who has never smoked is diagnosed with a peripheral lung adenocarcinoma. Which driver mutation is she most likely to have, and why does it matter?",
      a: "<strong>EGFR</strong> (exon 19 deletion or L858R). It's most common in never-smokers, women, and patients of East Asian ancestry. It matters because it's <strong>targetable</strong> (osimertinib), including after surgery (ADAURA) and after chemoradiation (LAURA).",
    },
    {
      q: "A heavy smoker presents with a central lung mass and a calcium of 13.1. Which histology fits best, and what's the mechanism?",
      a: "<strong>Squamous cell carcinoma</strong>, secreting <strong>PTH-related peptide (PTHrP)</strong>. Squamous is classically central, cavitates, and is strongly smoking-related.",
    },
    {
      q: "A smoker with a bulky hilar mass has a sodium of 124 and proximal leg weakness that improves after repeated effort. What histology do you suspect?",
      a: "<strong>Small cell lung cancer.</strong> SIADH (hyponatremia) and <strong>Lambert-Eaton</strong> (antibodies to presynaptic calcium channels; strength improves with repeated use) are classic neuroendocrine paraneoplastic syndromes.",
    },
    {
      q: "Who qualifies for low-dose CT lung cancer screening under the USPSTF (2021) criteria?",
      a: "Age <strong>50&ndash;80</strong>, at least a <strong>20 pack-year</strong> history, and <strong>currently smoking or quit within the past 15 years</strong>. Screen annually. NLST showed a <strong>20% relative reduction</strong> in lung cancer mortality with LDCT vs chest X-ray.",
    },
    {
      q: "What is the most common cause of lung cancer in people who have never smoked?",
      a: "<strong>Radon</strong>, the second leading cause of lung cancer overall. Asbestos multiplies the risk from smoking rather than simply adding to it.",
    },
  ],
  "th-anatomy": [
    {
      q: "How many lobes does each lung have, and what is the left lung's equivalent of the right middle lobe?",
      a: "Right: <strong>3 lobes</strong> (upper, middle, lower; separated by the horizontal and oblique fissures). Left: <strong>2 lobes</strong> (upper, lower; one oblique fissure). The <strong>lingula</strong> of the left upper lobe is the counterpart of the right middle lobe.",
    },
    {
      q: "What is the \"no-fly zone,\" and why does it matter for SBRT?",
      a: "A <strong>2 cm zone in all directions around the proximal bronchial tree</strong> (trachea, carina, main bronchi, and lobar bronchi). Tumors inside it are <strong>central</strong>. In Timmerman's early SBRT experience, 3-fraction ablative doses to central tumors caused far more severe toxicity, so central tumors get more fractions.",
    },
    {
      q: "A left upper lobe tumor causes hoarseness. Which nerve is involved, and where does it run?",
      a: "The <strong>left recurrent laryngeal nerve</strong>, which loops under the <strong>aortic arch</strong> in the <strong>aortopulmonary (AP) window</strong>, right where station 5 nodes sit. Recurrent laryngeal nerve invasion makes the tumor <strong>T4</strong>.",
    },
    {
      q: "At what vertebral level is the carina, and what else is at that level?",
      a: "The <strong>sternal angle (T4&ndash;T5)</strong>. It marks the carina, the bottom of the aortic arch, the azygos vein joining the SVC, and the boundary between the superior and inferior mediastinum.",
    },
    {
      q: "An apical tumor causes ptosis, miosis, and anhidrosis plus pain down the inner arm. Which structures are involved?",
      a: "The <strong>sympathetic chain / stellate ganglion</strong> (Horner syndrome) and the <strong>lower brachial plexus (C8&ndash;T1)</strong>. This is a <strong>Pancoast (superior sulcus) tumor</strong>, best evaluated with <strong>MRI</strong>.",
    },
  ],
  "th-nodes": [
    {
      q: "What is the one-line rule for converting a nodal station number into N1 vs N2?",
      a: "<strong>Single-digit stations (1&ndash;9) are mediastinal/supraclavicular; double-digit stations (10&ndash;14) are hilar and intrapulmonary.</strong> Ipsilateral 10&ndash;14 = N1, ipsilateral 2&ndash;9 = N2, and anything contralateral or supraclavicular = N3.",
    },
    {
      q: "A right lower lobe tumor has an FDG-avid station 5 (AP window) node. What N stage?",
      a: "<strong>N3.</strong> Stations 5 and 6 are <strong>left-sided</strong> stations, so for a right-sided tumor they're contralateral. This is a classic staging trap.",
    },
    {
      q: "Where is the boundary between stations 2R/4R and 2L/4L?",
      a: "The <strong>left lateral border of the trachea</strong>, not the midline. Nodes in front of the trachea count as right-sided (R), which is why right paratracheal nodes are far more common.",
    },
    {
      q: "A left upper lobe tumor has a positive subcarinal node. Is that N2 or N3?",
      a: "<strong>N2.</strong> Station 7 is a midline station that drains both lungs, and it's always counted as <strong>ipsilateral</strong> mediastinal disease, whichever side the tumor is on.",
    },
    {
      q: "Which stations can EBUS reach that mediastinoscopy cannot?",
      a: "The <strong>hilar and interlobar stations (10, 11)</strong>. EBUS reaches 2, 4, 7, 10, 11; mediastinoscopy reaches 2, 4, 7. Neither reaches <strong>5 and 6</strong>, which need an anterior mediastinotomy (Chamberlain) or VATS.",
    },
  ],
  "th-imaging": [
    {
      q: "Which three nodule features on CT most strongly favor malignancy?",
      a: "A <strong>spiculated margin</strong>, <strong>upper lobe location</strong>, and <strong>larger size</strong> (above 3 cm it's called a mass and treated as cancer until proven otherwise). A <strong>part-solid</strong> nodule also carries a high cancer risk, with the solid part usually representing invasive tumor.",
    },
    {
      q: "Why does a patient with a PET/CT that's negative for distant disease still need a brain MRI before treatment for stage II&ndash;III NSCLC?",
      a: "The brain has <strong>high normal FDG uptake</strong>, so PET is poor at finding brain metastases. <strong>Contrast-enhanced brain MRI</strong> is the test of choice, and finding a met changes the stage to IV.",
    },
    {
      q: "Name two classic causes of a false-positive FDG PET in the chest.",
      a: "<strong>Infection and inflammation</strong>: tuberculosis, fungal infection, sarcoidosis, pneumonia, and recent radiation or surgery. That's why a PET-positive mediastinal node is usually <strong>sampled (EBUS)</strong> before it changes treatment.",
    },
    {
      q: "Why do lower lobe tumors need extra attention during CT simulation?",
      a: "They <strong>move the most with breathing</strong> (diaphragm). A <strong>4D-CT</strong> captures the motion to build an <strong>ITV</strong>; motion over about 1 cm usually prompts abdominal compression, gating, or breath hold.",
    },
    {
      q: "A patient treated with SBRT 18 months ago has a growing, bulging opacity at the treated site that is losing its air bronchograms. What are you worried about?",
      a: "<strong>Local recurrence.</strong> Post-SBRT fibrosis is expected, but <strong>enlargement after 12 months</strong>, a <strong>bulging margin</strong>, loss of air bronchograms, and craniocaudal growth are high-risk features. Next step: PET/CT and consider biopsy.",
    },
  ],
  "th-staging": [
    {
      q: "A 2.4 cm tumor invades the visceral pleura. What's the T stage?",
      a: "<strong>T2a.</strong> Visceral pleural invasion makes any tumor at least T2, even if it measures &le;3 cm.",
    },
    {
      q: "A tumor has a separate nodule in a different lobe of the same lung. T3, T4, or M1a?",
      a: "<strong>T4.</strong> Same lobe = T3. Different ipsilateral lobe = T4. Contralateral lung = M1a.",
    },
    {
      q: "Under the AJCC 9th edition, what's the difference between N2a and N2b?",
      a: "<strong>N2a</strong> = a <strong>single</strong> ipsilateral mediastinal (or subcarinal) station. <strong>N2b</strong> = <strong>multiple</strong> ipsilateral mediastinal stations. It matters: T1N2a is IIB, but T1N2b is IIIA.",
    },
    {
      q: "A patient has a malignant pleural effusion and no other metastases. What M stage and stage group?",
      a: "<strong>M1a, Stage IVA.</strong> Malignant pleural/pericardial effusion, pleural nodules, and contralateral lung nodules are all M1a. The effusion is no longer T4 disease.",
    },
    {
      q: "What defines limited-stage small cell lung cancer?",
      a: "Disease confined to <strong>one hemithorax</strong> (plus regional nodes) that can be encompassed in a <strong>tolerable radiation field</strong>. Anything beyond that, including a malignant effusion or distant metastases, is <strong>extensive stage</strong>. (TNM: LS is roughly stage I&ndash;III.)",
    },
  ],
  "th-treatment-n0": [
    {
      q: "A 1.8 cm peripheral adenocarcinoma, N0 on PET and EBUS, in a patient with FEV1 32% predicted. What's the treatment?",
      a: "<strong>Definitive SBRT</strong>, e.g., <strong>54 Gy in 3 fractions</strong> or 48 Gy in 4 or 50 Gy in 5. No chemotherapy. Local control is roughly 90&ndash;95%.",
    },
    {
      q: "A 2.2 cm tumor sits against the chest wall, N0. What changes in the SBRT plan?",
      a: "Nothing about the indication; the concern is <strong>chest wall pain and rib fracture</strong>. Many centers favor <strong>4&ndash;5 fractions</strong> (48 Gy/4 or 50 Gy/5) and limit the chest wall volume getting 30 Gy.",
    },
    {
      q: "A 2 cm tumor sits 1.2 cm from the right main bronchus. What's the tumor called, and which regimen do you use?",
      a: "<strong>Central</strong> (within 2 cm of the proximal bronchial tree). Avoid 3 fractions; use <strong>50 Gy in 5 fractions</strong> (RTOG 0813) or 60 Gy in 8.",
    },
    {
      q: "What makes a tumor ultracentral, and what toxicity are you most afraid of?",
      a: "The tumor (or PTV) <strong>directly abuts or overlaps</strong> the trachea, main bronchi, or esophagus. The fear is <strong>fatal hemoptysis</strong> and fistula (HILUS trial). Use more fractions (e.g., <strong>60 Gy/8 or 60 Gy/15</strong>) or conventional fractionation.",
    },
  ],
  "th-treatment": [
    {
      q: "A patient has T2a N2b (4R and 7) adenocarcinoma, judged unresectable. PD-L1 50%, no driver mutation. What's the plan?",
      a: "<strong>Concurrent chemoradiation</strong> to <strong>60 Gy in 30 fractions</strong> with a platinum doublet, then <strong>durvalumab for 12 months</strong> (PACIFIC).",
    },
    {
      q: "Same patient, but the tumor has an EGFR exon 19 deletion. What changes?",
      a: "Consolidation is <strong>osimertinib</strong> instead of durvalumab (<strong>LAURA</strong>, a large PFS benefit). Immunotherapy works poorly in EGFR-mutant disease and raises pneumonitis risk with osimertinib.",
    },
    {
      q: "Why don't we treat stage III NSCLC to 74 Gy?",
      a: "<strong>RTOG 0617</strong>: 74 Gy was <strong>worse</strong> than 60 Gy for overall survival, likely related to heart dose and toxicity. <strong>60 Gy</strong> is the standard.",
    },
    {
      q: "After lobectomy, pathology is pT2a N2a with negative margins. Does the patient need PORT?",
      a: "<strong>Not routinely.</strong> <strong>LungART</strong> found no disease-free survival benefit from PORT for resected N2 disease and more cardiopulmonary toxicity. PORT is for <strong>positive margins</strong> (R1/R2).",
    },
    {
      q: "Limited-stage SCLC: what's the classic radiation regimen, and what's given after chemoradiation?",
      a: "<strong>45 Gy in 30 twice-daily fractions</strong> (Turrisi) or 60&ndash;66 Gy daily (CONVERT), <strong>concurrent with cisplatin/etoposide</strong>, starting early. Then <strong>durvalumab</strong> consolidation (ADRIATIC) and <strong>PCI or MRI surveillance</strong>.",
    },
  ],
  "pr-epi": [
    {
      q: "What is a US man's lifetime risk of prostate cancer, and where does it rank for cancer death?",
      a: "About <strong>1 in 8</strong>. It's the most common non-skin cancer in men and the <strong>2nd leading cause of cancer death</strong> in men, after lung.",
    },
    {
      q: "Which germline mutation is most strongly linked to aggressive prostate cancer, and why does a radiation oncologist care?",
      a: "<strong>BRCA2.</strong> Carriers get earlier, higher-grade disease with worse outcomes. Germline testing is recommended for high-risk, node-positive, and metastatic disease, and a BRCA2/ATM mutation can open the door to <strong>PARP inhibitors</strong>.",
    },
    {
      q: "A 50-year-old Black man whose father had prostate cancer at 58 asks about screening. What do you tell him?",
      a: "He's <strong>higher risk</strong> on two counts, so screening with shared decision-making should start earlier, at about <strong>40&ndash;45</strong>, rather than at 55.",
    },
    {
      q: "Name three benign causes of a raised PSA.",
      a: "<strong>BPH</strong>, <strong>prostatitis/UTI</strong>, and recent <strong>instrumentation</strong> (biopsy, catheter, cystoscopy). Also urinary retention and recent ejaculation. Repeat the PSA before acting on one value.",
    },
    {
      q: "A PSA of 6 in a man with an 80 cc gland vs a 25 cc gland: which is more worrying, and what number captures that?",
      a: "The <strong>25 cc gland</strong>. <strong>PSA density</strong> (PSA &divide; volume): 6/25 = 0.24 (worrying) vs 6/80 = 0.075. Above <strong>0.15</strong> suggests clinically significant cancer.",
    },
  ],
  "pr-anatomy": [
    {
      q: "Where do most prostate cancers arise, and why does that matter for the rectal exam?",
      a: "The <strong>peripheral zone</strong> (~70%), the posterior part of the gland right against the rectum. That's the part a DRE can feel. BPH arises in the <strong>transition zone</strong>.",
    },
    {
      q: "Which structure separates the prostate from the rectum, and what do we inject there to protect the rectum?",
      a: "<strong>Denonvilliers' fascia</strong> (rectoprostatic fascia). A <strong>hydrogel spacer</strong> (e.g., SpaceOAR) injected between the prostate and rectum pushes the rectum away and lowers rectal dose.",
    },
    {
      q: "Where do the neurovascular bundles run, and why do they matter?",
      a: "<strong>Posterolaterally</strong>, at about 5 and 7 o'clock. They carry the cavernous nerves for <strong>erections</strong>. Nerve-sparing surgery tries to preserve them, and tumor near them raises the risk of extraprostatic extension.",
    },
    {
      q: "On TRUS during a brachytherapy implant, where is the urethra, and what marks it?",
      a: "Roughly in the <strong>center-anterior</strong> gland, marked by the <strong>Foley catheter</strong> (a bright ring with shadowing, or aerated gel). The rectum is at the <strong>bottom</strong> of the image, against the probe. Keep seeds and hot spots away from both.",
    },
  ],
  "pr-lymph": [
    {
      q: "What is the first-echelon nodal drainage for the prostate?",
      a: "The <strong>obturator</strong> and <strong>internal iliac (hypogastric)</strong> nodes, then external iliac and presacral, then common iliac and para-aortic.",
    },
    {
      q: "A PSMA PET shows a single positive common iliac node. N1 or M1a?",
      a: "<strong>M1a.</strong> Only pelvic nodes below the common iliac bifurcation (obturator, internal/external iliac, sacral) are regional. Common iliac, para-aortic, and inguinal nodes are distant.",
    },
    {
      q: "Where does the elective pelvic nodal RT volume start superiorly (RTOG/NRG)?",
      a: "At about <strong>L5/S1</strong> (distal common iliac), and down to the top of the pubic symphysis, covering obturator, internal/external iliac, and presacral (S1&ndash;S3) nodes.",
    },
    {
      q: "What does the Roach formula estimate, and what's the formula?",
      a: "The <strong>risk of lymph node involvement</strong>: <strong>(2/3 &times; PSA) + [(Gleason score &minus; 6) &times; 10]</strong>. Over ~15&ndash;20% is used to justify pelvic nodal RT.",
    },
  ],
  "pr-imaging": [
    {
      q: "On mpMRI, which sequence drives the PI-RADS score in the peripheral zone vs the transition zone?",
      a: "<strong>Peripheral zone: DWI/ADC.</strong> <strong>Transition zone: T2.</strong> DCE only helps upgrade a peripheral zone 3 to a 4.",
    },
    {
      q: "What does cancer look like on T2 and ADC?",
      a: "<strong>Dark (low signal) on T2</strong> and <strong>dark on the ADC map</strong> (bright on high b-value DWI) because packed tumor cells restrict water diffusion.",
    },
    {
      q: "A bone scan shows uniformly intense skeletal uptake and the kidneys are barely visible. Normal?",
      a: "<strong>No: a superscan.</strong> Diffuse bony metastases take up so much tracer that the kidneys fade. Classic for prostate cancer.",
    },
    {
      q: "Why has PSMA PET largely replaced CT + bone scan for staging high-risk disease?",
      a: "Much better accuracy: <strong>proPSMA</strong> showed 92% vs 65% for nodal/distant disease, with fewer equivocal scans. It also finds recurrence at low PSA levels after surgery.",
    },
    {
      q: "Why do we place fiducial markers before prostate RT?",
      a: "The prostate <strong>moves</strong> day to day with bladder and rectal filling. Gold fiducials are seen on daily imaging so the beam is aligned to the gland, not the bones, allowing tighter margins.",
    },
  ],
  "pr-staging": [
    {
      q: "A biopsy shows Gleason 4+3=7. What Grade Group, and how does that differ from 3+4?",
      a: "<strong>GG3.</strong> 3+4 is GG2. The first (primary) pattern is the most common one; more pattern 4 means worse biology. GG3 makes intermediate risk <strong>unfavorable</strong>.",
    },
    {
      q: "What's the difference between cT1c and cT2a?",
      a: "<strong>cT1c</strong>: found on needle biopsy for a raised PSA, <strong>not palpable</strong>. <strong>cT2a</strong>: palpable, involving &le;half of one lobe. Clinical T stage is by <strong>DRE</strong> (NCCN).",
    },
    {
      q: "What are the three factors that define NCCN risk groups?",
      a: "<strong>Clinical T stage</strong>, <strong>Grade Group</strong>, and <strong>PSA</strong> (plus core involvement and PSA density at the extremes).",
    },
    {
      q: "Name the three high-risk features.",
      a: "<strong>T3a</strong>, <strong>Grade Group 4&ndash;5</strong>, <strong>PSA &gt;20</strong>. One = high risk. Two or more, or T3b&ndash;T4, or primary pattern 5, or &gt;4 cores GG4&ndash;5 = <strong>very high</strong>.",
    },
    {
      q: "Any positive regional node: what AJCC stage?",
      a: "<strong>Stage IVA</strong> (N1 M0), regardless of T, PSA, or grade. <strong>M1</strong> is IVB.",
    },
  ],
  "pr-treatment-local": [
    {
      q: "A 64-year-old has cT1c, Gleason 3+3, PSA 5, 2 of 12 cores. What's recommended?",
      a: "<strong>Active surveillance</strong> (low risk). ProtecT: ~97% prostate cancer survival at 15 years regardless of approach, with surveillance avoiding treatment side effects.",
    },
    {
      q: "Favorable intermediate risk: which RT options, and is ADT needed?",
      a: "<strong>No ADT.</strong> EBRT (e.g., <strong>60 Gy/20</strong> or <strong>70 Gy/28</strong>), <strong>SBRT 36.25 Gy/5</strong>, or <strong>LDR brachytherapy monotherapy</strong>.",
    },
    {
      q: "How long is ADT for unfavorable intermediate vs high risk with RT?",
      a: "<strong>Unfavorable intermediate: 4&ndash;6 months.</strong> <strong>High/very high: 18&ndash;36 months</strong> (usually 2 years).",
    },
    {
      q: "Why does hypofractionation work so well for prostate cancer?",
      a: "Prostate cancer has a <strong>low &alpha;/&beta; (~1.5)</strong>, lower than the rectum (~3). Bigger fractions hurt the tumor more than the rectum. CHHiP, PROFIT, and PACE-B confirmed it.",
    },
  ],
  "pr-treatment": [
    {
      q: "cN1 (pelvic nodes on PSMA PET), M0. What's the standard radiation-based treatment?",
      a: "<strong>RT to the prostate + pelvic nodes</strong> (boost the involved nodes) with <strong>2&ndash;3 years of ADT</strong> + <strong>abiraterone</strong> (STAMPEDE).",
    },
    {
      q: "After prostatectomy, margins positive, PSA undetectable. Adjuvant RT now or wait?",
      a: "<strong>Observe with PSA monitoring and give early salvage RT</strong> if the PSA rises above 0.1&ndash;0.2. RAVES, RADICALS-RT, and GETUG-AFU 17 showed no benefit to routine adjuvant RT, and about half of men never need RT.",
    },
    {
      q: "What is the definition of biochemical failure after surgery vs after RT?",
      a: "<strong>Surgery: PSA &gt;0.2</strong> confirmed. <strong>RT: nadir + 2</strong> (Phoenix).",
    },
    {
      q: "Newly diagnosed metastatic prostate cancer with 3 bone mets in the pelvis and spine. Is there a role for prostate RT?",
      a: "<strong>Yes: low-volume</strong> metastatic disease. RT to the prostate (e.g., 36 Gy/6 weekly or 55 Gy/20) + systemic therapy improved overall survival (STAMPEDE arm H). Not for high-volume disease.",
    },
    {
      q: "Which rectal dose limit do you hear most for 78&ndash;79 Gy plans?",
      a: "Rectum <strong>V70 &lt;20%</strong> (and V75 &lt;15%, V50 &lt;50%). Bladder V80 &lt;15%. Femoral heads V50 &lt;5%.",
    },
  ],
  "gyn-epi": [
    {
      q: "Which two HPV types cause about 70% of cervical cancers?",
      a: "<strong>HPV 16 and 18.</strong> HPV is found in over 95% of cervical cancers. Other high-risk types: 31, 33, 45, 52, 58 (all covered by the 9-valent vaccine).",
    },
    {
      q: "What single mechanism links obesity, nulliparity, PCOS, tamoxifen, and early menarche to endometrial cancer?",
      a: "<strong>Unopposed estrogen</strong>: estrogen stimulation of the endometrium without enough progesterone. Fat converts androgens to estrogen, PCOS means anovulation, and tamoxifen is an estrogen agonist in the uterus.",
    },
    {
      q: "A 44-year-old with endometrial cancer has a mother with colon cancer at 48. What syndrome do you suspect?",
      a: "<strong>Lynch syndrome</strong> (mismatch repair deficiency): up to ~60% lifetime endometrial cancer risk. All endometrial cancers are now tested for MMR/MSI, which also predicts benefit from immunotherapy.",
    },
    {
      q: "What are the two pathways to vulvar cancer?",
      a: "<strong>HPV-associated</strong> (younger women, VIN/HSIL, smoking) and <strong>HPV-independent</strong> (older women, <strong>lichen sclerosus</strong>, differentiated VIN, p53-mutated, worse prognosis).",
    },
    {
      q: "A 62-year-old has postmenopausal bleeding. What's the first test, and what threshold matters?",
      a: "<strong>Transvaginal ultrasound</strong>: an endometrial stripe <strong>&gt;4 mm</strong> needs an <strong>endometrial biopsy</strong> (or go straight to biopsy). Postmenopausal bleeding is endometrial cancer until proven otherwise.",
    },
  ],
  "gyn-anatomy": [
    {
      q: "Where do most cervical cancers start?",
      a: "At the <strong>transformation zone</strong>, around the <strong>squamocolumnar junction</strong>, where columnar endocervical cells are replaced by squamous cells and HPV does its damage.",
    },
    {
      q: "What is the parametrium, and why does it matter?",
      a: "Connective tissue beside the cervix (in the <strong>cardinal ligaments</strong>) carrying the uterine vessels, ureter, and lymphatics. Cervical cancer grows <strong>sideways into it</strong>, toward the pelvic side wall, so it is the first place the exam and MRI look.",
    },
    {
      q: "Where does the ureter sit relative to the uterine artery, and why do we care?",
      a: "The ureter runs <strong>under</strong> the uterine artery about <strong>2 cm lateral to the cervix</strong> (\"water under the bridge\"). That's roughly where brachytherapy <strong>point A</strong> sits, and tumor there can block the ureter and cause <strong>hydronephrosis</strong>.",
    },
    {
      q: "Which part of the vagina drains like the cervix, and which like the vulva?",
      a: "<strong>Upper two-thirds</strong> &rarr; pelvic nodes (like the cervix). <strong>Lower third</strong> &rarr; <strong>inguinofemoral</strong> nodes (like the vulva). Posterior wall &rarr; also presacral/perirectal.",
    },
  ],
  "gyn-lymph": [
    {
      q: "Which nodes are first echelon for the cervix?",
      a: "<strong>Parametrial, obturator, internal and external iliac</strong> nodes, then <strong>common iliac</strong>, then <strong>para-aortic</strong>. Also presacral via the uterosacral ligaments.",
    },
    {
      q: "How can an endometrial cancer reach para-aortic nodes without pelvic nodes?",
      a: "Fundal lymphatics run with the <strong>ovarian (gonadal) vessels</strong> in the infundibulopelvic ligament straight to the <strong>para-aortic</strong> nodes.",
    },
    {
      q: "What is the nodal pathway for the vulva, and what is Cloquet's node?",
      a: "<strong>Superficial inguinal &rarr; deep femoral &rarr; external iliac (pelvic)</strong>. <strong>Cloquet's node</strong> is the highest deep femoral node, under the inguinal ligament, the gateway to the pelvis.",
    },
    {
      q: "A vulvar cancer has a positive pelvic (external iliac) node. What FIGO stage?",
      a: "<strong>IVB</strong>: for the vulva, <strong>pelvic nodes are distant</strong>. Only inguinofemoral nodes are regional.",
    },
    {
      q: "Positive para-aortic nodes in cervical cancer: what FIGO stage, and what changes in the RT field?",
      a: "<strong>IIIC2</strong> (r if found on imaging, p if on pathology). Use an <strong>extended field</strong> covering the para-aortic nodes up to about the <strong>renal vessels (T12&ndash;L1)</strong>.",
    },
  ],
  "gyn-imaging": [
    {
      q: "Which imaging test best shows parametrial invasion in cervical cancer?",
      a: "<strong>Pelvic MRI (T2).</strong> An intact <strong>dark (low-T2) cervical stromal ring</strong> essentially rules out parametrial invasion; a disrupted ring with tumor spiculating into the fat suggests IIB.",
    },
    {
      q: "Why get a PET/CT for locally advanced cervical cancer?",
      a: "To find <strong>pelvic and para-aortic nodes</strong> (IIIC1/IIIC2) and distant disease. It decides whether the field needs to cover the <strong>para-aortic</strong> region and which nodes get a <strong>boost</strong>.",
    },
    {
      q: "On MRI, how do you tell endometrial cancer invading less than vs more than half the myometrium?",
      a: "Look at the <strong>junctional zone</strong> and the <strong>depth into the myometrium</strong> on T2, DWI, and contrast. &lt;50% = IA, &ge;50% = IB. Cervical stromal invasion = II.",
    },
    {
      q: "What does hydronephrosis on CT mean in cervical cancer staging?",
      a: "<strong>FIGO IIIB</strong> (unless from another cause). Tumor has reached the pelvic side wall or blocked the ureter.",
    },
    {
      q: "Why do we get an MRI with the applicator in place for cervical brachytherapy?",
      a: "To contour the <strong>HR-CTV</strong> (residual tumor + whole cervix) and the <strong>bladder, rectum, sigmoid</strong> in 3D (image-guided brachytherapy, EMBRACE). Dose is then prescribed to the HR-CTV rather than just point A.",
    },
  ],
  "gyn-staging": [
    {
      q: "Cervical cancer, 3.5 cm, confined to the cervix, nodes negative. FIGO 2018 stage?",
      a: "<strong>IB2</strong> (&gt;2 to &le;4 cm). IB1 is &le;2 cm; IB3 is &gt;4 cm.",
    },
    {
      q: "Cervical cancer with a positive pelvic node on PET. What stage, whatever the tumor size?",
      a: "<strong>IIIC1</strong> (r). Para-aortic = <strong>IIIC2</strong>. FIGO 2018 allows imaging and pathology to assign nodal stage.",
    },
    {
      q: "Endometrial cancer, grade 2, invading 60% of the myometrium, no cervical involvement, nodes negative. FIGO 2009 stage?",
      a: "<strong>IB</strong> (&ge;50% myometrial invasion). IA = &lt;50%; II = cervical stroma.",
    },
    {
      q: "What does FIGO 2023 do with a p53-abnormal endometrial cancer that invades the myometrium?",
      a: "It's upstaged to <strong>IIC (m-p53abn)</strong>, reflecting its poor prognosis. A <strong>POLE-mutated</strong> stage I&ndash;II tumor is downstaged to <strong>IA (m-POLEmut)</strong>.",
    },
    {
      q: "Vulvar cancer, 1.5 cm, depth of invasion 0.8 mm. Stage, and do the nodes need to be checked?",
      a: "<strong>IA</strong> (&le;2 cm and &le;1 mm invasion). Node risk is &lt;1%, so <strong>no groin node evaluation</strong> is needed.",
    },
  ],
  "gyn-treatment-cervix": [
    {
      q: "Cervical cancer IB3 or IIB: what is the standard treatment?",
      a: "<strong>Definitive chemoradiation</strong>: pelvic EBRT 45 Gy/25 with <strong>weekly cisplatin 40 mg/m&sup2;</strong>, then <strong>brachytherapy</strong> (e.g., HDR 28 Gy/4), finished within <strong>8 weeks</strong>. Consider pembrolizumab (KEYNOTE-A18) for node-positive or stage III&ndash;IVA.",
    },
    {
      q: "What is the brachytherapy dose goal for the HR-CTV in cervical cancer?",
      a: "<strong>D90 &ge;85 Gy EQD2</strong> (EBRT + brachy combined). OAR D2cc goals: bladder &lt;80&ndash;90, rectum &lt;65&ndash;75, sigmoid &lt;70&ndash;75 Gy EQD2.",
    },
    {
      q: "Where is point A?",
      a: "<strong>2 cm above the cervical os along the tandem and 2 cm lateral</strong>: roughly where the uterine artery crosses the ureter. <strong>Point B</strong> is 3 cm further lateral (pelvic side wall).",
    },
    {
      q: "Can IMRT or SBRT boost replace brachytherapy for cervical cancer?",
      a: "<strong>No.</strong> Omitting brachytherapy is associated with worse local control and survival. Brachy is essential for definitive treatment.",
    },
  ],
  "gyn-treatment": [
    {
      q: "After radical hysterectomy: 3 cm tumor, LVSI present, middle-third stromal invasion, nodes and margins negative. Adjuvant therapy?",
      a: "<strong>Pelvic RT</strong> (Sedlis criteria, GOG 92). Peters criteria are not met, so no chemo.",
    },
    {
      q: "After radical hysterectomy: positive pelvic node. Adjuvant therapy?",
      a: "<strong>Pelvic chemoradiation</strong> (Peters criteria, GOG 109): positive nodes, margins, or parametrium.",
    },
    {
      q: "Endometrial cancer, stage IB grade 2, age 64, no LVSI. What adjuvant therapy is typical?",
      a: "<strong>Vaginal brachytherapy</strong> (e.g., 7 Gy &times; 3 at 0.5 cm). PORTEC-2: as good as pelvic EBRT for vaginal control, with less GI toxicity.",
    },
    {
      q: "Stage IIIC1 endometrial cancer: what's the adjuvant plan?",
      a: "<strong>Chemotherapy &plusmn; pelvic EBRT</strong> (PORTEC-3 chemoRT; GOG 258 showed RT lowers pelvic/vaginal recurrence). Add immunotherapy for advanced disease, especially MMR-deficient (RUBY, NRG-GY018).",
    },
    {
      q: "Vulvar cancer after surgery with 2 positive groin nodes. Adjuvant?",
      a: "<strong>RT to the groins and pelvis &plusmn; weekly cisplatin</strong> (GOG 37). Also treat the vulva if margins are close/positive.",
    },
  ],
  "cns-epi": [
    {
      q: "What is the most common intracranial tumor in adults? The most common primary brain tumor? The most common malignant primary brain tumor?",
      a: "<strong>Brain metastases</strong> (most common overall). <strong>Meningioma</strong> (most common primary, ~40%). <strong>Glioblastoma</strong> (most common malignant primary).",
    },
    {
      q: "What is the only well-established environmental risk factor for brain tumors?",
      a: "<strong>Ionizing radiation</strong> (e.g., childhood cranial RT): raises the risk of <strong>meningioma</strong> (most), glioma, and sarcoma. Cell phones have no proven link.",
    },
    {
      q: "A 32-year-old has bilateral vestibular schwannomas. What syndrome, and what other tumors should you look for?",
      a: "<strong>NF2</strong> (merlin, chromosome 22). Also <strong>meningiomas</strong> and spinal <strong>ependymomas</strong>. (NF1 = optic pathway gliomas, neurofibromas.)",
    },
    {
      q: "Which cancers most commonly spread to the brain?",
      a: "<strong>Lung</strong> (most common), <strong>breast</strong>, <strong>melanoma</strong> (highest propensity), <strong>kidney</strong>, and <strong>colorectal</strong>. Melanoma, renal, and choriocarcinoma mets tend to bleed.",
    },
    {
      q: "An HIV-positive patient has a periventricular enhancing mass. Which primary CNS tumor is linked to immunosuppression, and why hold steroids before biopsy?",
      a: "<strong>Primary CNS lymphoma</strong> (EBV-related in the immunosuppressed). Steroids can make it <strong>melt away</strong> and ruin the biopsy.",
    },
  ],
  "cns-anatomy": [
    {
      q: "A patient can't speak fluently but understands. Where is the lesion?",
      a: "<strong>Broca's area</strong>: the inferior frontal gyrus of the <strong>dominant (usually left)</strong> hemisphere. Fluent but meaningless speech with poor comprehension = <strong>Wernicke's</strong> (superior temporal gyrus).",
    },
    {
      q: "Trace the flow of CSF.",
      a: "<strong>Lateral ventricles &rarr; foramina of Monro &rarr; 3rd ventricle &rarr; cerebral aqueduct &rarr; 4th ventricle &rarr; foramina of Luschka and Magendie &rarr; subarachnoid space</strong> &rarr; arachnoid granulations. A posterior fossa tumor compressing the 4th ventricle causes obstructive hydrocephalus.",
    },
    {
      q: "Which structure do we spare in hippocampal-avoidance WBRT, and why?",
      a: "The <strong>hippocampi</strong> (medial temporal lobes), where neural stem cells for <strong>memory</strong> live. NRG CC001: HA-WBRT + memantine preserved cognition better than WBRT + memantine.",
    },
    {
      q: "What runs through the cavernous sinus, and what happens when a tumor grows into it?",
      a: "The <strong>internal carotid artery</strong> and cranial nerves <strong>III, IV, V1, V2, and VI</strong>. A tumor there (pituitary adenoma, meningioma) causes <strong>double vision</strong>, ptosis, and facial numbness.",
    },
    {
      q: "Where does a vestibular schwannoma arise, and which nearby structure limits the SRS plan for hearing?",
      a: "The <strong>vestibular division of CN VIII</strong> in the <strong>internal auditory canal</strong>, growing into the cerebellopontine angle. Keep the <strong>cochlea</strong> mean dose <strong>&le;4 Gy</strong> to preserve hearing.",
    },
  ],
  "cns-imaging": [
    {
      q: "Which MRI sequence shows the enhancing tumor, and which shows the surrounding edema/infiltrative tumor?",
      a: "<strong>T1 post-contrast</strong> = enhancing tumor (blood-brain barrier breakdown). <strong>T2/FLAIR</strong> = edema and non-enhancing infiltrative tumor.",
    },
    {
      q: "Name the classic MRI signs of a meningioma.",
      a: "Extra-axial, homogeneous enhancement, <strong>dural tail</strong>, a <strong>CSF cleft</strong> between tumor and brain, and <strong>hyperostosis</strong> of adjacent bone.",
    },
    {
      q: "A month after chemoRT for GBM, the enhancing area is larger. What else could it be besides progression?",
      a: "<strong>Pseudoprogression</strong>: treatment effect in the first ~3 months, more common with <strong>MGMT-methylated</strong> tumors. Advanced imaging (perfusion rCBV, spectroscopy, amino-acid PET) and short-interval MRI help; true tumor has high rCBV.",
    },
    {
      q: "What does an 'ice cream cone' in the cerebellopontine angle suggest?",
      a: "<strong>Vestibular schwannoma</strong>: the 'cone' in the internal auditory canal and the 'scoop' in the CPA cistern. Meningiomas tend to be broad-based on the dura without widening the IAC.",
    },
    {
      q: "Which brain tumor classically calcifies on CT?",
      a: "<strong>Oligodendroglioma</strong> (also craniopharyngioma and meningioma). Calcification is common in oligodendroglioma (~70&ndash;90%).",
    },
  ],
  "cns-staging": [
    {
      q: "Why don't gliomas have a TNM stage?",
      a: "They almost <strong>never spread outside the CNS</strong>, so nodes and distant metastases don't apply. They're described by <strong>WHO grade (1&ndash;4)</strong> and <strong>molecular features</strong> instead.",
    },
    {
      q: "IDH wild-type diffuse glioma, histologically grade 2, with a TERT promoter mutation. What's the diagnosis?",
      a: "<strong>Glioblastoma, IDH-wildtype, WHO grade 4</strong>. TERT promoter mutation, EGFR amplification, or +7/&minus;10 makes it GBM even without necrosis or microvascular proliferation.",
    },
    {
      q: "What defines an oligodendroglioma?",
      a: "<strong>IDH mutation + 1p/19q codeletion.</strong> IDH-mutant without codeletion (usually ATRX loss, TP53 mutation) = astrocytoma.",
    },
    {
      q: "What does MGMT promoter methylation tell you in GBM?",
      a: "It predicts <strong>benefit from temozolomide</strong> (and better survival). Unmethylated tumors get less from TMZ; in the elderly, methylation favors TMZ.",
    },
    {
      q: "What's the difference between a WHO grade 1 and grade 2 (atypical) meningioma?",
      a: "Grade 2: <strong>brain invasion</strong> or <strong>4&ndash;19 mitoses per 10 HPF</strong> (or 3 of 5 atypical features). Grade 3: &ge;20 mitoses, anaplastic features, or TERT promoter mutation / CDKN2A/B deletion.",
    },
  ],
  "cns-treatment-mets": [
    {
      q: "A patient with NSCLC and 3 brain mets (all under 2 cm), KPS 90. SRS alone or SRS + WBRT?",
      a: "<strong>SRS alone.</strong> NCCTG N0574: adding WBRT improved intracranial control but caused <strong>more cognitive decline</strong> with no survival benefit.",
    },
    {
      q: "What are the RTOG 90-05 single-fraction SRS doses by size?",
      a: "<strong>&le;2 cm: 24 Gy</strong>; <strong>2.1&ndash;3 cm: 18 Gy</strong>; <strong>3.1&ndash;4 cm: 15 Gy</strong>. Larger lesions or cavities are often done in 3&ndash;5 fractions.",
    },
    {
      q: "After resection of a single brain met, what's the standard adjuvant RT?",
      a: "<strong>SRS to the cavity</strong> (often 27 Gy/3 or 30 Gy/5). Mahajan: better local control than observation. N107C: similar survival to WBRT with <strong>less cognitive decline</strong>.",
    },
    {
      q: "When WBRT is used, how do you protect memory?",
      a: "<strong>Hippocampal avoidance + memantine</strong> (NRG CC001), 30 Gy/10.",
    },
  ],
  "cns-treatment": [
    {
      q: "What is the Stupp regimen for GBM?",
      a: "<strong>60 Gy in 30 fractions</strong> with <strong>daily temozolomide (75 mg/m&sup2;)</strong>, then <strong>6 cycles of adjuvant TMZ</strong>. Median OS 14.6 vs 12.1 months; 5-year 10% vs 2%. Add TTFields (EF-14).",
    },
    {
      q: "A 77-year-old with GBM, KPS 60, MGMT methylated. What's reasonable?",
      a: "<strong>Hypofractionated RT: 40 Gy/15 + TMZ</strong> (Perry), or 25 Gy/5 (Roa), or TMZ alone if methylated and very frail. Short courses are as effective in older patients.",
    },
    {
      q: "Which trial established RT + PCV for high-risk low-grade glioma?",
      a: "<strong>RTOG 9802</strong>: RT (54 Gy) + PCV nearly doubled median OS (13.3 vs 7.8 years) vs RT alone, especially for IDH-mutant tumors.",
    },
    {
      q: "What is the typical SRS dose for a vestibular schwannoma?",
      a: "<strong>12&ndash;13 Gy</strong> to the margin. Tumor control ~95%; hearing preservation declines over time. Fractionated options: 25 Gy/5 or 50.4&ndash;54 Gy.",
    },
    {
      q: "Standard RT for metastatic epidural spinal cord compression in a patient not fit for surgery?",
      a: "<strong>Dexamethasone</strong> first, then RT: <strong>8 Gy &times; 1</strong>, <strong>20 Gy/5</strong>, or <strong>30 Gy/10</strong>. Surgery + RT for fit patients with single-level compression (Patchell).",
    },
  ],
  "gi-epi": [
    {
      q: "Esophageal squamous cell carcinoma vs adenocarcinoma: where in the esophagus, and what drives each?",
      a: "<strong>SCC</strong>: upper/middle esophagus; <strong>smoking, alcohol</strong>, hot beverages, achalasia, caustic injury (worldwide ~90%). <strong>Adenocarcinoma</strong>: <strong>distal esophagus/GEJ</strong>; <strong>GERD, Barrett's, obesity</strong> (dominant in the US).",
    },
    {
      q: "What virus causes most anal cancers, and which patients are at highest risk?",
      a: "<strong>HPV</strong> (85&ndash;90%, mostly HPV-16). Highest risk: <strong>people with HIV</strong> (especially MSM), immunosuppression, smoking, and a history of cervical/vulvar/vaginal cancer or dysplasia.",
    },
    {
      q: "At what age does average-risk colorectal cancer screening start, and why was it lowered?",
      a: "<strong>Age 45</strong>, because colorectal cancer incidence is rising in younger adults. Lynch syndrome screening starts at 20&ndash;25.",
    },
    {
      q: "A 67-year-old has new-onset diabetes and unexplained weight loss. What cancer should you worry about?",
      a: "<strong>Pancreatic adenocarcinoma.</strong> New diabetes after 50 with weight loss can be the first sign.",
    },
    {
      q: "What causes most hepatocellular carcinoma?",
      a: "<strong>Cirrhosis</strong> from any cause: <strong>hepatitis B and C</strong>, <strong>alcohol</strong>, and increasingly <strong>fatty liver disease (MASLD)</strong>. Hepatitis B can cause HCC even without cirrhosis. Cirrhotic patients get ultrasound &plusmn; AFP every 6 months.",
    },
  ],
  "gi-anatomy": [
    {
      q: "How are esophageal tumor locations described, and where is the GEJ?",
      a: "By <strong>distance from the incisors</strong> on endoscopy: cervical (15&ndash;20 cm), upper thoracic (20&ndash;25), middle (25&ndash;30), lower (30&ndash;40), and the <strong>GEJ at ~40 cm</strong>. The carina sits at ~25 cm.",
    },
    {
      q: "What is the mesorectal fascia, and why does it matter?",
      a: "The envelope around the <strong>mesorectum</strong> (fat, vessels, nodes around the rectum). It's the plane surgeons remove in a <strong>total mesorectal excision</strong>. Tumor <strong>&le;1 mm</strong> from it on MRI = <strong>threatened circumferential margin</strong>.",
    },
    {
      q: "What landmark divides the anal canal's lymphatic drainage?",
      a: "The <strong>dentate (pectinate) line</strong>. Above &rarr; mesorectal and internal iliac nodes. Below (and the anal margin) &rarr; <strong>inguinal</strong> nodes. That's why anal cancer fields always include the groins.",
    },
    {
      q: "Which vessels decide whether a pancreatic cancer can be resected?",
      a: "Arteries: <strong>SMA, celiac axis, common hepatic artery</strong>. Veins: <strong>SMV and portal vein</strong>. Encasement (&gt;180&deg;) of the SMA or celiac = locally advanced.",
    },
    {
      q: "Where is the upper rectum vs the lower rectum measured from, and why does it matter?",
      a: "Distance of the tumor's lower edge from the <strong>anal verge</strong>: low 0&ndash;5 cm, mid 5&ndash;10, upper 10&ndash;15. <strong>Low</strong> tumors risk needing an <strong>APR</strong> (permanent colostomy) and are the main targets of organ-preservation strategies.",
    },
  ],
  "gi-lymph": [
    {
      q: "Where do mid-to-low rectal cancers drain?",
      a: "<strong>Mesorectal</strong> nodes, then along the <strong>superior rectal/IMA</strong> and laterally to the <strong>internal iliac and obturator</strong> nodes, plus <strong>presacral</strong>. <strong>External iliac and inguinal</strong> nodes only matter if the tumor reaches the anal canal or adjacent organs.",
    },
    {
      q: "For anal cancer, which nodal regions are included in the elective field?",
      a: "<strong>Inguinal</strong>, <strong>mesorectal</strong>, <strong>presacral</strong>, <strong>internal and external iliac</strong> (and obturator) nodes.",
    },
    {
      q: "A distal esophageal adenocarcinoma has a positive celiac node. Regional or distant (AJCC 8)?",
      a: "<strong>Regional.</strong> Celiac nodes are regional for esophageal cancer; the number of positive nodes sets N (N1 1&ndash;2, N2 3&ndash;6, N3 &ge;7). Supraclavicular nodes are <strong>distant (M1)</strong>.",
    },
    {
      q: "Why do esophageal cancers skip around so much in their nodal spread?",
      a: "The esophagus has a <strong>longitudinal submucosal lymphatic network</strong>, so tumors can spread several cm up or down and skip nodal stations. That's why RT margins are longer superiorly/inferiorly (~3&ndash;4 cm) than radially.",
    },
  ],
  "gi-imaging": [
    {
      q: "Which imaging is the key staging study for rectal cancer, and what four things do you report?",
      a: "<strong>Pelvic MRI (high-resolution T2).</strong> Report <strong>T stage</strong>, <strong>distance to the mesorectal fascia (MRF)</strong>, <strong>EMVI</strong>, and <strong>nodes</strong> (mesorectal and lateral), plus height from the anal verge.",
    },
    {
      q: "What is the 'double duct sign'?",
      a: "Dilation of both the <strong>common bile duct and the pancreatic duct</strong>: classic for a <strong>pancreatic head</strong> (or ampullary) mass.",
    },
    {
      q: "What imaging defines esophageal T stage best?",
      a: "<strong>Endoscopic ultrasound (EUS)</strong>, which shows the wall layers (T1a mucosa, T1b submucosa, T2 muscularis propria, T3 adventitia) and nearby nodes. PET/CT stages nodes and distant disease.",
    },
    {
      q: "What are the classic multiphase CT/MRI features of HCC?",
      a: "<strong>Arterial phase hyperenhancement</strong> with <strong>washout</strong> on portal venous/delayed phases, and an <strong>enhancing capsule</strong>. In a cirrhotic liver, a LI-RADS 5 lesion can be diagnosed as HCC without biopsy.",
    },
    {
      q: "Why is PET/CT especially useful in anal cancer?",
      a: "It finds <strong>inguinal and pelvic nodes</strong> that CT misses, changing the stage and the RT dose to nodes, and it assesses response after chemoRT.",
    },
  ],
  "gi-staging": [
    {
      q: "Rectal MRI: tumor extends 6 mm into the mesorectal fat and is 0.5 mm from the mesorectal fascia. T stage and what's the concern?",
      a: "<strong>T3</strong> (T3c by depth), with a <strong>threatened MRF</strong> (&le;1 mm). High risk of a positive margin: needs neoadjuvant therapy (TNT).",
    },
    {
      q: "Anal cancer 4 cm with no nodes. T stage?",
      a: "<strong>T2</strong> (&gt;2 to &le;5 cm). T1 &le;2 cm; T3 &gt;5 cm; T4 invades adjacent organs (vagina, urethra, bladder), not just the sphincter or skin.",
    },
    {
      q: "How is esophageal N stage defined?",
      a: "By the <strong>number</strong> of positive regional nodes: <strong>N1 1&ndash;2</strong>, <strong>N2 3&ndash;6</strong>, <strong>N3 &ge;7</strong>.",
    },
    {
      q: "Pancreatic head cancer with 200&deg; encasement of the SMA. Resectable, borderline, or locally advanced?",
      a: "<strong>Locally advanced</strong> (SMA or celiac contact &gt;180&deg;). &le;180&deg; SMA contact would be borderline.",
    },
    {
      q: "Which tumor markers are followed for pancreatic, colorectal, and liver cancer?",
      a: "<strong>CA 19-9</strong> (pancreas; unreliable if the patient is jaundiced or Lewis-antigen negative), <strong>CEA</strong> (colorectal), <strong>AFP</strong> (HCC).",
    },
  ],
  "gi-treatment-rectal": [
    {
      q: "What is total neoadjuvant therapy (TNT) for rectal cancer?",
      a: "Giving <strong>all the chemo and radiation before surgery</strong>: either short-course RT (25 Gy/5) or long-course chemoRT (50.4 Gy/28 + capecitabine) combined with ~4 months of FOLFOX/CAPOX, then TME or <strong>watch-and-wait</strong> if complete response.",
    },
    {
      q: "Short-course vs long-course RT for rectal cancer?",
      a: "<strong>Short-course: 25 Gy in 5 fractions</strong>, no concurrent chemo (RAPIDO uses it with chemo after). <strong>Long-course: 45&ndash;50.4 Gy/25&ndash;28 with capecitabine or 5-FU</strong>, preferred when you want more shrinkage (threatened MRF, low tumor for organ preservation).",
    },
    {
      q: "What did the German CAO/ARO/AIO-94 trial show?",
      a: "<strong>Preoperative</strong> chemoRT had <strong>better local control</strong> (6% vs 13%) and <strong>less toxicity</strong> than postoperative chemoRT, with similar survival. Preop became the standard.",
    },
    {
      q: "What's the role of immunotherapy in rectal cancer?",
      a: "For <strong>MMR-deficient</strong> locally advanced rectal cancer, <strong>dostarlimab</strong> alone gave complete clinical responses in essentially all patients in the Cercek trial, often avoiding RT and surgery.",
    },
  ],
  "gi-treatment": [
    {
      q: "What is the standard treatment for anal SCC (T2N0)?",
      a: "<strong>Definitive chemoRT</strong>: <strong>5-FU (or capecitabine) + mitomycin</strong> with IMRT ~<strong>50.4 Gy/28</strong> to the primary and ~42 Gy to elective nodes (RTOG 0529). Surgery (APR) only for salvage.",
    },
    {
      q: "When do you judge the response after anal cancer chemoRT?",
      a: "Up to <strong>26 weeks</strong> after starting treatment (ACT II): many tumors keep regressing. Biopsy/APR only for persistent or progressing disease.",
    },
    {
      q: "What is the CROSS regimen?",
      a: "<strong>41.4 Gy in 23 fractions + weekly carboplatin/paclitaxel</strong>, then <strong>esophagectomy</strong>. Improved survival over surgery alone; pCR ~29% (~49% in SCC).",
    },
    {
      q: "Definitive chemoRT dose for esophageal cancer, and which trial set it?",
      a: "<strong>50.4 Gy</strong> with chemo. RTOG 9405 (INT 0123): 64.8 Gy was <strong>no better</strong> than 50.4 Gy. RTOG 8501 showed chemoRT beats RT alone.",
    },
    {
      q: "Which liver cancer trial supported SBRT?",
      a: "<strong>RTOG 1112</strong>: adding SBRT to sorafenib improved overall and progression-free survival in unresectable HCC. SBRT needs enough spared liver (e.g., &ge;700 cc under 15 Gy) and good liver function (Child-Pugh A&ndash;B7).",
    },
  ],
};

/* ============================================================
   LUNG STAGE BUILDER  (AJCC 9th edition NSCLC)
   (a doc embeds <div class="stage-builder"></div>; "Build" mode
    picks T/N/M and shows the stage group, "Quiz me" mode writes a
    random patient and asks for the stage group)
   ============================================================ */
const LUNG_T = ["T1mi","T1a","T1b","T1c","T2a","T2b","T3","T4"];
const LUNG_N = ["N0","N1","N2a","N2b","N3"];
const LUNG_M = ["M0","M1a","M1b","M1c1","M1c2"];
const LUNG_T_DEF = {
  T1mi: "Minimally invasive adenocarcinoma (&le;3 cm, &le;5 mm invasive)",
  T1a: "&le;1 cm", T1b: "&gt;1&ndash;2 cm", T1c: "&gt;2&ndash;3 cm",
  T2a: "&gt;3&ndash;4 cm, or visceral pleura / main bronchus / atelectasis to the hilum",
  T2b: "&gt;4&ndash;5 cm",
  T3: "&gt;5&ndash;7 cm, or chest wall / phrenic nerve / parietal pericardium, or a separate nodule in the same lobe",
  T4: "&gt;7 cm, or mediastinum / heart / great vessels / trachea / carina / esophagus / spine / diaphragm / recurrent laryngeal nerve, or a nodule in a different ipsilateral lobe",
};
const LUNG_N_DEF = {
  N0: "No regional nodes",
  N1: "Ipsilateral hilar / peribronchial / intrapulmonary (stations 10&ndash;14)",
  N2a: "A single ipsilateral mediastinal or subcarinal station",
  N2b: "Multiple ipsilateral mediastinal stations",
  N3: "Contralateral mediastinal or hilar, or any scalene / supraclavicular",
};
const LUNG_M_DEF = {
  M0: "No distant metastases",
  M1a: "Contralateral lung nodule, pleural / pericardial nodules, or malignant effusion",
  M1b: "A single extrathoracic metastasis",
  M1c1: "Multiple extrathoracic metastases in one organ system",
  M1c2: "Multiple extrathoracic metastases in more than one organ system",
};
function lungStageGroup(t, n, m){
  if(m === "M1a" || m === "M1b") return "IVA";
  if(m === "M1c1" || m === "M1c2") return "IVB";
  const tg = (t === "T1mi" || t.startsWith("T1")) ? "T1" : (t.startsWith("T2") ? "T2" : t);
  if(n === "N0"){
    return { T1mi:"IA1", T1a:"IA1", T1b:"IA2", T1c:"IA3", T2a:"IB", T2b:"IIA", T3:"IIB", T4:"IIIA" }[t];
  }
  const grid = {
    N1:  { T1:"IIA",  T2:"IIB",  T3:"IIIA", T4:"IIIA" },
    N2a: { T1:"IIB",  T2:"IIIA", T3:"IIIB", T4:"IIIB" },
    N2b: { T1:"IIIA", T2:"IIIB", T3:"IIIC", T4:"IIIC" },
    N3:  { T1:"IIIB", T2:"IIIB", T3:"IIIC", T4:"IIIC" },
  };
  return grid[n][tg];
}
function lungStageMeaning(stage, n){
  if(stage.startsWith("IV")) return "<strong>Metastatic.</strong> Systemic therapy (targeted therapy if a driver, otherwise chemo-immunotherapy). Radiation for oligometastatic sites (SBRT) or symptoms (palliative RT).";
  if(stage.startsWith("III")) return "<strong>Locally advanced.</strong> First question: resectable? Yes &rarr; neoadjuvant/perioperative chemo-immunotherapy &rarr; surgery. No &rarr; concurrent chemoRT (60 Gy/30) &rarr; durvalumab (or osimertinib if EGFR+).";
  if(n === "N0") return "<strong>Early stage, node-negative.</strong> Operable &rarr; lobectomy (or segmentectomy if &le;2 cm peripheral) with nodal sampling. Inoperable &rarr; SBRT, with the fractionation set by location. Larger tumors (T2b&ndash;T3) also get perioperative systemic therapy.";
  return "<strong>Node-positive early stage.</strong> Operable &rarr; surgery with perioperative systemic therapy (chemo-IO, or osimertinib/alectinib for EGFR/ALK). Inoperable &rarr; concurrent chemoRT, not SBRT.";
}
const LUNG_QUIZ_T = {
  T1a: ["a 0.8 cm solid peripheral nodule"],
  T1b: ["a 1.6 cm peripheral nodule"],
  T1c: ["a 2.7 cm peripheral nodule"],
  T2a: ["a 3.6 cm mass", "a 2.2 cm nodule invading the visceral pleura", "a 2.8 cm tumor in the main bronchus, sparing the carina"],
  T2b: ["a 4.6 cm mass"],
  T3: ["a 6.2 cm mass", "a 3 cm tumor invading the chest wall", "a 2.5 cm tumor with a separate nodule in the same lobe"],
  T4: ["an 8 cm mass", "a 4 cm tumor invading the carina", "a 3 cm tumor with a separate nodule in a different ipsilateral lobe", "a 3.5 cm tumor invading a vertebral body"],
};
const LUNG_QUIZ_N = {
  N0: ["no nodal uptake"],
  N1: ["an FDG-avid ipsilateral hilar node (station 10{S})", "an ipsilateral interlobar node (station 11{S})"],
  N2a: ["a single involved subcarinal node (station 7)", "a single involved ipsilateral paratracheal node (station 4{S})"],
  N2b: ["involved ipsilateral 4{S} and subcarinal (7) nodes", "involved ipsilateral 2{S} and 4{S} nodes"],
  N3: ["an involved contralateral paratracheal node (4{O})", "an involved supraclavicular node (station 1)", "an involved contralateral hilar node (10{O})"],
};
const LUNG_QUIZ_M = {
  M0: ["no distant disease"],
  M1a: ["a malignant pleural effusion", "a nodule in the contralateral lung"],
  M1b: ["a single adrenal metastasis", "a single brain metastasis"],
  M1c1: ["three liver metastases", "multiple bone metastases"],
  M1c2: ["bone and liver metastases", "brain and adrenal metastases"],
};
const pick = (arr) => arr[Math.floor(Math.random()*arr.length)];

function renderStageBuilder(container){
  container.classList.add("quiz-carousel", "stage-builder");
  const state = { mode: "build", t: "T2a", n: "N0", m: "M0", quiz: null };

  const LUNG_STAGE_ORDER = ["IA1","IA2","IA3","IB","IIA","IIB","IIIA","IIIB","IIIC","IVA","IVB"];
  function newQuiz(){
    const side = pick(["R","L"]);
    const other = side === "R" ? "L" : "R";
    const t = pick(Object.keys(LUNG_QUIZ_T));
    const n = pick(["N0","N0","N1","N2a","N2b","N3"]);
    const m = pick(["M0","M0","M0","M0","M1a","M1b","M1c1","M1c2"]);
    const lobe = side === "R" ? pick(["right upper lobe","right lower lobe"]) : pick(["left upper lobe","left lower lobe"]);
    const nText = pick(LUNG_QUIZ_N[n]).replace(/\{S\}/g, side).replace(/\{O\}/g, other);
    const answer = lungStageGroup(t, n, m);
    const pool = LUNG_STAGE_ORDER.filter(s => s !== answer);
    state.quiz = {
      t, n, m, answer, picked: null,
      text: `A ${lobe} primary: ${pick(LUNG_QUIZ_T[t])}. PET/CT and EBUS show ${nText}. Staging shows ${pick(LUNG_QUIZ_M[m])}.`,
      choices: [answer, ...shuffled(pool).slice(0,3)].sort((a,b) => LUNG_STAGE_ORDER.indexOf(a) - LUNG_STAGE_ORDER.indexOf(b)),
    };
  }

  function pills(kind, list, current){
    return `<div class="sb-row"><span class="sb-row-label">${kind}</span><div class="sb-pills">${
      list.map(v => `<button type="button" class="sb-pill ${v===current?'active':''}" data-kind="${kind}" data-val="${v}">${v}</button>`).join("")
    }</div></div>`;
  }

  function render(){
    let body = "";
    if(state.mode === "build"){
      const stage = lungStageGroup(state.t, state.n, state.m);
      body = `
        ${pills("T", LUNG_T, state.t)}
        ${pills("N", LUNG_N, state.n)}
        ${pills("M", LUNG_M, state.m)}
        <div class="sb-result">
          <div class="sb-stage"><span class="sb-code">${state.t} ${state.n} ${state.m}</span><span class="sb-arrow">&rarr;</span><span class="sb-group">Stage ${stage}</span></div>
          <ul class="sb-defs">
            <li><b>${state.t}</b> ${LUNG_T_DEF[state.t]}</li>
            <li><b>${state.n}</b> ${LUNG_N_DEF[state.n]}</li>
            <li><b>${state.m}</b> ${LUNG_M_DEF[state.m]}</li>
          </ul>
          <div class="sb-meaning">${lungStageMeaning(stage, state.n)}</div>
        </div>`;
    } else {
      if(!state.quiz) newQuiz();
      const q = state.quiz;
      const answered = q.picked !== null;
      body = `
        <div class="qc-question">${q.text} <strong>What is the stage group?</strong></div>
        <div class="quiz-choices">${q.choices.map(c => {
          let cls = "quiz-choice";
          if(answered){ if(c === q.answer) cls += " correct"; else if(c === q.picked) cls += " incorrect"; }
          return `<button type="button" class="${cls}" data-choice="${c}" ${answered?"disabled":""}>Stage ${c}</button>`;
        }).join("")}</div>
        ${answered ? `<div class="qc-answer"><strong>${q.t} ${q.n} ${q.m} = Stage ${q.answer}.</strong><br>${q.t}: ${LUNG_T_DEF[q.t]}.<br>${q.n}: ${LUNG_N_DEF[q.n]}.<br>${q.m}: ${LUNG_M_DEF[q.m]}.</div>
        <div class="qc-controls"><button type="button" class="cw-btn primary" data-act="next">Next patient &rarr;</button></div>` : ""}`;
    }
    container.innerHTML = `
      <div class="qc-header">
        <span class="qc-badge">Stage Builder &middot; AJCC 9th ed.</span>
        <div class="sb-modes">
          <button type="button" class="sb-mode ${state.mode==='build'?'active':''}" data-mode="build">Build</button>
          <button type="button" class="sb-mode ${state.mode==='quiz'?'active':''}" data-mode="quiz">Quiz me</button>
        </div>
      </div>
      ${body}`;
    container.querySelectorAll(".sb-mode").forEach(b => b.addEventListener("click", () => { state.mode = b.dataset.mode; render(); }));
    container.querySelectorAll(".sb-pill").forEach(b => b.addEventListener("click", () => { state[b.dataset.kind.toLowerCase()] = b.dataset.val; render(); }));
    container.querySelectorAll("[data-choice]").forEach(b => b.addEventListener("click", () => { state.quiz.picked = b.dataset.choice; render(); }));
    const next = container.querySelector('[data-act="next"]');
    if(next) next.addEventListener("click", () => { newQuiz(); render(); });
  }
  render();
}

/* ============================================================
   N-STAGE STATION DRILL
   (a doc embeds <div class="nstage-drill"></div>; each round names
    a tumor side and one involved IASLC station, the student
    answers N1 / N2 / N3)
   ============================================================ */
const NODAL_STATIONS = [
  { st: "1R", name: "right low cervical / supraclavicular", side: "R", kind: "scv" },
  { st: "1L", name: "left low cervical / supraclavicular", side: "L", kind: "scv" },
  { st: "2R", name: "right upper paratracheal", side: "R", kind: "med" },
  { st: "2L", name: "left upper paratracheal", side: "L", kind: "med" },
  { st: "4R", name: "right lower paratracheal", side: "R", kind: "med" },
  { st: "4L", name: "left lower paratracheal", side: "L", kind: "med" },
  { st: "5", name: "subaortic (AP window)", side: "L", kind: "med" },
  { st: "6", name: "para-aortic", side: "L", kind: "med" },
  { st: "7", name: "subcarinal", side: "mid", kind: "med" },
  { st: "10R", name: "right hilar", side: "R", kind: "hilar" },
  { st: "10L", name: "left hilar", side: "L", kind: "hilar" },
  { st: "11R", name: "right interlobar", side: "R", kind: "hilar" },
  { st: "11L", name: "left interlobar", side: "L", kind: "hilar" },
];
function nStageFor(tumorSide, s){
  if(s.kind === "scv") return { n: "N3", why: "Station 1 (low cervical / supraclavicular) is <strong>N3 on either side</strong>." };
  if(s.side === "mid") return { n: "N2", why: "Station 7 drains both lungs and is <strong>always counted as ipsilateral N2</strong>." };
  const same = s.side === tumorSide;
  if(s.kind === "med"){
    if(s.st === "5" || s.st === "6") return same
      ? { n: "N2", why: `Stations 5 and 6 are <strong>left-sided</strong> mediastinal stations, so for a left tumor they're ipsilateral N2.` }
      : { n: "N3", why: `Stations 5 and 6 are <strong>left-sided</strong> by definition, so for a right tumor they're <strong>contralateral = N3</strong>.` };
    return same
      ? { n: "N2", why: `Single-digit station on the <strong>same side</strong> = ipsilateral mediastinal = N2.` }
      : { n: "N3", why: `Mediastinal station on the <strong>opposite side</strong> = contralateral = N3.` };
  }
  return same
    ? { n: "N1", why: `Double-digit (10&ndash;14) station on the <strong>same side</strong> = hilar/intrapulmonary = N1.` }
    : { n: "N3", why: `A hilar node on the <strong>opposite side</strong> is contralateral = N3.` };
}
function renderNStageDrill(container){
  container.classList.add("quiz-carousel", "nstage-drill");
  let round = null, score = 0, total = 0;
  function newRound(){
    const side = pick(["R","L"]);
    const lobe = side === "R" ? pick(["right upper lobe","right middle lobe","right lower lobe"]) : pick(["left upper lobe","left lower lobe"]);
    const s = pick(NODAL_STATIONS);
    round = { side, lobe, s, res: nStageFor(side, s), picked: null };
  }
  function render(){
    if(!round) newRound();
    const answered = round.picked !== null;
    container.innerHTML = `
      <div class="qc-header">
        <span class="qc-badge">Station &rarr; N Stage Drill</span>
        <span class="qc-counter">${total ? `Score ${score} / ${total}` : "Endless practice"}</span>
      </div>
      <div class="qc-question"><strong>${round.lobe.charAt(0).toUpperCase()+round.lobe.slice(1)}</strong> primary. The only involved node is <strong>station ${round.s.st}</strong> (${round.s.name}). What's the N stage?</div>
      <div class="quiz-choices nsd-choices">${["N1","N2","N3"].map(n => {
        let cls = "quiz-choice";
        if(answered){ if(n === round.res.n) cls += " correct"; else if(n === round.picked) cls += " incorrect"; }
        return `<button type="button" class="${cls}" data-n="${n}" ${answered?"disabled":""}>${n}</button>`;
      }).join("")}</div>
      ${answered ? `<div class="qc-answer"><strong>${round.res.n}.</strong> ${round.res.why}</div>
      <div class="qc-controls"><button type="button" class="cw-btn primary" data-act="next">Next station &rarr;</button></div>` : ""}`;
    container.querySelectorAll("[data-n]").forEach(b => b.addEventListener("click", () => {
      round.picked = b.dataset.n; total++; if(round.picked === round.res.n) score++; render();
    }));
    const next = container.querySelector('[data-act="next"]');
    if(next) next.addEventListener("click", () => { newRound(); render(); });
  }
  render();
}

/* ============================================================
   CHOICE DRILLS
   (a doc embeds <div class="choice-drill" data-drill-set="key"></div>;
    items come up in random order with the same fixed answer
    buttons, e.g. "regional node or distant?", Gleason -> Grade Group.
    An item can carry its own "choices" to override the set's.)
   ============================================================ */
const DRILL_SETS = {
  "hn-tnm": {
    title: "Stage It: H&amp;N TNM",
    choices: [],
    items: [
      { p: "Oral tongue cancer, <strong>3.4 cm</strong>, depth of invasion <strong>6 mm</strong>. What is the T stage?", choices: ["T1", "T2", "T3", "T4a"], a: "T2", why: "2-4 cm with DOI of 10 mm or less is <strong>T2</strong>. DOI would need to be over 10 mm to make it T3." },
      { p: "Oral tongue cancer, <strong>1.5 cm</strong>, DOI <strong>3 mm</strong>. What is the T stage?", choices: ["T1", "T2", "T3", "T4a"], a: "T1", why: "2 cm or less with DOI of 5 mm or less is <strong>T1</strong>." },
      { p: "Oral tongue cancer, <strong>1.8 cm</strong>, DOI <strong>7 mm</strong>. What is the T stage?", choices: ["T1", "T2", "T3", "T4a"], a: "T2", why: "Small on the surface but deep: DOI over 5 mm bumps a 2 cm or smaller tumor to <strong>T2</strong>." },
      { p: "Floor of mouth cancer, <strong>3 cm</strong>, DOI <strong>12 mm</strong>. What is the T stage?", choices: ["T1", "T2", "T3", "T4a"], a: "T3", why: "2-4 cm with DOI over 10 mm is <strong>T3</strong>." },
      { p: "Gingival cancer that erodes <strong>through the cortical bone</strong> of the mandible. What is the T stage?", choices: ["T2", "T3", "T4a", "T4b"], a: "T4a", why: "Invasion through cortical bone is <strong>T4a</strong> (still resectable). Superficial erosion of a tooth socket alone would not count." },
      { p: "Retromolar trigone cancer invading the <strong>masticator space</strong> (patient has trismus). What is the T stage?", choices: ["T3", "T4a", "T4b"], a: "T4b", why: "Masticator space, pterygoid plates, skull base, or carotid encasement is <strong>T4b</strong>, generally unresectable." },
      { p: "p16-negative cancer with a <strong>single ipsilateral node, 2.5 cm</strong>, no ENE. What is the N stage?", choices: ["N1", "N2a", "N2b", "N2c"], a: "N1", why: "Single ipsilateral node 3 cm or less, ENE-negative = <strong>N1</strong>." },
      { p: "p16-negative cancer with a <strong>single ipsilateral node, 4.5 cm</strong>, no ENE. What is the N stage?", choices: ["N1", "N2a", "N2b", "N3a"], a: "N2a", why: "Single ipsilateral node over 3 cm but 6 cm or less = <strong>N2a</strong>." },
      { p: "p16-negative cancer with <strong>three ipsilateral nodes</strong>, the largest 3 cm, no ENE. What is the N stage?", choices: ["N1", "N2a", "N2b", "N2c"], a: "N2b", why: "Multiple ipsilateral nodes, none over 6 cm = <strong>N2b</strong>." },
      { p: "p16-negative cancer with nodes on <strong>both sides</strong> of the neck, all under 6 cm. What is the N stage?", choices: ["N2a", "N2b", "N2c", "N3a"], a: "N2c", why: "Bilateral or contralateral nodes, none over 6 cm = <strong>N2c</strong>." },
      { p: "p16-negative cancer with a <strong>7 cm</strong> neck node, no ENE. What is the N stage?", choices: ["N2a", "N2b", "N3a", "N3b"], a: "N3a", why: "Any node over 6 cm = <strong>N3a</strong>." },
      { p: "p16-negative cancer with a node <strong>fixed to the overlying skin</strong>. What is the N stage?", choices: ["N2a", "N2b", "N3a", "N3b"], a: "N3b", why: "Clinically obvious ENE (skin involvement, fixation) = <strong>N3b</strong>, no matter the size." },
      { p: "<strong>p16-positive</strong> tonsil cancer with <strong>three ipsilateral nodes</strong>, the largest 4 cm. What is the clinical N stage?", choices: ["cN1", "cN2", "cN3"], a: "cN1", why: "In p16+ disease, any number of ipsilateral nodes 6 cm or less is <strong>cN1</strong>." },
      { p: "<strong>p16-positive</strong> base of tongue cancer with a <strong>contralateral</strong> 2 cm node. What is the clinical N stage?", choices: ["cN1", "cN2", "cN3"], a: "cN2", why: "Contralateral or bilateral nodes, none over 6 cm = <strong>cN2</strong> in p16+ disease." },
      { p: "<strong>p16-positive</strong> tonsil cancer, <strong>4.5 cm</strong>. What is the T stage?", choices: ["T1", "T2", "T3", "T4"], a: "T3", why: "Over 4 cm = <strong>T3</strong>. In p16+ disease there is a single T4 (no T4a/T4b)." },
      { p: "Nasopharyngeal cancer with <strong>bilateral</strong> neck nodes, all under 6 cm and above the cricoid. What is the N stage?", choices: ["N1", "N2", "N3"], a: "N2", why: "Bilateral cervical nodes, 6 cm or less, above the cricoid = <strong>N2</strong>." },
      { p: "Nasopharyngeal cancer with a single 3 cm node <strong>below the cricoid</strong>. What is the N stage?", choices: ["N1", "N2", "N3"], a: "N3", why: "Any node below the caudal border of the cricoid (or over 6 cm) = <strong>N3</strong>." },
      { p: "Nasopharyngeal cancer that erodes the <strong>clivus</strong>. What is the T stage?", choices: ["T1", "T2", "T3", "T4"], a: "T3", why: "Bone (skull base, cervical vertebra, pterygoid structures, sinuses) = <strong>T3</strong>." },
      { p: "Nasopharyngeal cancer with a new <strong>CN VI palsy</strong> (double vision). What is the T stage?", choices: ["T2", "T3", "T4"], a: "T4", why: "Any cranial nerve involvement or intracranial extension = <strong>T4</strong>." },
      { p: "Glottic cancer on <strong>one cord</strong>, normal cord mobility. What is the T stage?", choices: ["T1a", "T1b", "T2", "T3"], a: "T1a", why: "One cord, normal mobility = <strong>T1a</strong> (both cords = T1b)." },
      { p: "Glottic cancer with a <strong>fixed vocal cord</strong>. What is the T stage?", choices: ["T1b", "T2", "T3", "T4a"], a: "T3", why: "Cord fixation = <strong>T3</strong>. Impaired (but not fixed) mobility would be T2." },
      { p: "Laryngeal cancer through the <strong>outer cortex of the thyroid cartilage</strong>. What is the T stage?", choices: ["T2", "T3", "T4a", "T4b"], a: "T4a", why: "Inner cortex = T3; through the outer cortex = <strong>T4a</strong>." },
      { p: "Oral cavity cancer, <strong>T2 N1 M0</strong>. What is the stage group?", choices: ["II", "III", "IVA", "IVB"], a: "III", why: "Any T1-T3 with N1 = <strong>stage III</strong>." },
      { p: "Larynx cancer, <strong>T1 N2a M0</strong>. What is the stage group?", choices: ["II", "III", "IVA", "IVB"], a: "IVA", why: "Any N2 (with T1-T4a) = <strong>stage IVA</strong>." },
      { p: "Any H&amp;N cancer with a <strong>lung metastasis</strong>. What is the M stage?", choices: ["M0", "M1"], a: "M1", why: "Distant metastasis = <strong>M1</strong>. The lungs are the most common distant site." },
    ],
  },
  "pr-nodes": {
    title: "Regional (N1) or Distant (M1)?",
    choices: ["N1", "M1a", "M1b", "M1c"],
    items: [
      { p: "An FDG/PSMA-avid <strong>obturator</strong> node", a: "N1", why: "Obturator nodes are true pelvic (regional) nodes: <strong>N1</strong>, stage IVA. Often the first echelon." },
      { p: "A PSMA-avid <strong>internal iliac (hypogastric)</strong> node", a: "N1", why: "Internal iliac = regional pelvic node, <strong>N1</strong>." },
      { p: "A PSMA-avid <strong>external iliac</strong> node", a: "N1", why: "External iliac = regional, <strong>N1</strong>." },
      { p: "A <strong>presacral</strong> node", a: "N1", why: "Sacral nodes (presacral, lateral sacral, promontory) are regional: <strong>N1</strong>." },
      { p: "A <strong>common iliac</strong> node", a: "M1a", why: "The trap: common iliac nodes sit <strong>above the bifurcation</strong> and count as <strong>distant (M1a)</strong> in AJCC, even though elective pelvic RT fields reach up to them." },
      { p: "A <strong>para-aortic</strong> node", a: "M1a", why: "Retroperitoneal/para-aortic nodes are nonregional: <strong>M1a</strong>." },
      { p: "An enlarged <strong>inguinal</strong> node", a: "M1a", why: "Inguinal nodes are nonregional for prostate: <strong>M1a</strong>." },
      { p: "A <strong>left supraclavicular</strong> node", a: "M1a", why: "Distant nodal disease = <strong>M1a</strong>." },
      { p: "Two <strong>vertebral body</strong> lesions on bone scan", a: "M1b", why: "Bone metastases = <strong>M1b</strong>, the most common metastatic site." },
      { p: "A <strong>lung</strong> or <strong>liver</strong> metastasis", a: "M1c", why: "Visceral metastases (with or without bone) = <strong>M1c</strong>, the worst prognosis." },
    ],
  },
  "pr-gleason": {
    title: "Gleason Score &rarr; Grade Group",
    choices: ["GG1", "GG2", "GG3", "GG4", "GG5"],
    items: [
      { p: "Gleason <strong>3+3=6</strong>", a: "GG1", why: "3+3=6 is the <strong>lowest score reported</strong> on biopsy today: GG1." },
      { p: "Gleason <strong>3+4=7</strong>", a: "GG2", why: "Mostly pattern 3 with some 4: <strong>GG2</strong> (favorable)." },
      { p: "Gleason <strong>4+3=7</strong>", a: "GG3", why: "Mostly pattern 4: <strong>GG3</strong>. Same sum as 3+4, worse biology, and it makes intermediate risk <strong>unfavorable</strong>." },
      { p: "Gleason <strong>4+4=8</strong>", a: "GG4", why: "Any Gleason 8 is <strong>GG4</strong>: 4+4, 3+5, or 5+3." },
      { p: "Gleason <strong>3+5=8</strong>", a: "GG4", why: "Sum of 8 = <strong>GG4</strong>, whatever the order." },
      { p: "Gleason <strong>5+3=8</strong>", a: "GG4", why: "Sum of 8 = <strong>GG4</strong>. But primary pattern 5 also makes the patient <strong>very high risk</strong> by NCCN." },
      { p: "Gleason <strong>4+5=9</strong>", a: "GG5", why: "Gleason 9&ndash;10 = <strong>GG5</strong>." },
      { p: "Gleason <strong>5+4=9</strong>", a: "GG5", why: "<strong>GG5</strong>, and primary pattern 5 = very high risk." },
      { p: "Gleason <strong>5+5=10</strong>", a: "GG5", why: "The most aggressive: <strong>GG5</strong>." },
    ],
  },
  "pr-risk": {
    title: "Name the NCCN Risk Group",
    choices: ["Very low", "Low", "Favorable intermediate", "Unfavorable intermediate", "High", "Very high"],
    items: [
      { p: "cT1c, Gleason 3+3, PSA 4.2, PSA density 0.09", a: "Very low", why: "T1c + GG1 + PSA &lt;10 + PSA density &lt;0.15 = <strong>very low</strong>. Active surveillance." },
      { p: "cT2a, Gleason 3+3, PSA 6.8", a: "Low", why: "T1&ndash;T2a, GG1, PSA &lt;10 = <strong>low</strong>." },
      { p: "cT1c, Gleason 3+4, PSA 7, 3 of 12 cores positive", a: "Favorable intermediate", why: "One intermediate factor (GG2), under 50% of cores: <strong>favorable intermediate</strong>." },
      { p: "cT1c, Gleason 3+3, PSA 14, 2 of 12 cores positive", a: "Favorable intermediate", why: "One intermediate factor (PSA 10&ndash;20), GG1, few cores: <strong>favorable intermediate</strong>." },
      { p: "cT1c, Gleason 4+3, PSA 6", a: "Unfavorable intermediate", why: "<strong>GG3 alone makes it unfavorable.</strong>" },
      { p: "cT2b, Gleason 3+4, PSA 12", a: "Unfavorable intermediate", why: "Three intermediate factors (T2b, GG2, PSA 10&ndash;20): <strong>unfavorable intermediate</strong>." },
      { p: "cT1c, Gleason 3+4, PSA 8, 8 of 12 cores positive", a: "Unfavorable intermediate", why: "One intermediate factor, but <strong>&ge;50% of cores</strong> positive: unfavorable." },
      { p: "cT2a, Gleason 4+4, PSA 7", a: "High", why: "One high-risk feature (GG4): <strong>high risk</strong>." },
      { p: "cT1c, Gleason 3+4, PSA 26", a: "High", why: "One high-risk feature (PSA &gt;20): <strong>high risk</strong>." },
      { p: "cT3a on MRI, Gleason 3+4, PSA 9", a: "High", why: "T3a (extraprostatic extension) is a high-risk feature: <strong>high risk</strong>." },
      { p: "cT3b (seminal vesicle invasion), Gleason 3+4, PSA 8", a: "Very high", why: "<strong>T3b&ndash;T4 = very high risk</strong>, on its own." },
      { p: "cT3a, Gleason 4+5, PSA 11", a: "Very high", why: "Two high-risk features (T3a and GG5): <strong>very high risk</strong>." },
      { p: "cT1c, Gleason 5+4, PSA 6", a: "Very high", why: "<strong>Primary Gleason pattern 5</strong> = very high risk." },
    ],
  },
  "gyn-nodes": {
    title: "Regional or Distant?",
    choices: ["Regional", "Distant"],
    items: [
      { p: "<strong>Cervix</strong>: external iliac node", a: "Regional", why: "Pelvic nodes are regional: <strong>FIGO IIIC1</strong>." },
      { p: "<strong>Cervix</strong>: para-aortic node", a: "Regional", why: "Still regional in FIGO: <strong>IIIC2</strong>. Treated with an extended field." },
      { p: "<strong>Cervix</strong>: left supraclavicular node", a: "Distant", why: "Beyond the abdomen: <strong>IVB</strong>. Reached via the thoracic duct." },
      { p: "<strong>Cervix</strong>: inguinal node", a: "Distant", why: "Inguinal nodes are <strong>distant (IVB)</strong> for the cervix, unless the tumor has spread to the lower vagina." },
      { p: "<strong>Endometrium</strong>: para-aortic node", a: "Regional", why: "<strong>IIIC2</strong>. Fundal tumors can drain directly there via the ovarian vessels." },
      { p: "<strong>Endometrium</strong>: inguinal node", a: "Distant", why: "<strong>IVB</strong> (distant, including inguinal and intra-abdominal nodes)." },
      { p: "<strong>Vulva</strong>: superficial inguinal node", a: "Regional", why: "Inguinofemoral nodes are regional for the vulva: <strong>stage III</strong>." },
      { p: "<strong>Vulva</strong>: deep femoral (Cloquet's) node", a: "Regional", why: "Still inguinofemoral: <strong>regional (III)</strong>." },
      { p: "<strong>Vulva</strong>: external iliac (pelvic) node", a: "Distant", why: "For the vulva, <strong>pelvic nodes are distant (IVB)</strong>." },
      { p: "<strong>Lower-third vagina</strong>: inguinal node", a: "Regional", why: "The lower vagina drains to the groins, so inguinal nodes are regional." },
    ],
  },
  "gyn-cervix-stage": {
    title: "Name the FIGO 2018 Cervix Stage",
    choices: ["IB1", "IB2", "IB3", "IIA", "IIB", "IIIA", "IIIB", "IIIC1", "IIIC2", "IVA", "IVB"],
    items: [
      { p: "1.8 cm tumor confined to the cervix, nodes negative", a: "IB1", why: "Confined, invasion &ge;5 mm, &le;2 cm = <strong>IB1</strong>." },
      { p: "3.2 cm tumor confined to the cervix, nodes negative", a: "IB2", why: "&gt;2 to &le;4 cm = <strong>IB2</strong>." },
      { p: "5 cm tumor confined to the cervix, nodes negative", a: "IB3", why: "&gt;4 cm = <strong>IB3</strong>: usually chemoRT." },
      { p: "3 cm tumor extending into the upper vagina; parametria clear", a: "IIA", why: "Upper two-thirds of the vagina without parametrial invasion = <strong>IIA</strong> (IIA1 if &le;4 cm)." },
      { p: "4 cm tumor with parametrial invasion not reaching the side wall", a: "IIB", why: "Parametrial invasion = <strong>IIB</strong>." },
      { p: "Tumor extends to the lower third of the vagina; parametria clear", a: "IIIA", why: "Lower third of the vagina = <strong>IIIA</strong>." },
      { p: "Tumor with right hydronephrosis", a: "IIIB", why: "Hydronephrosis or a nonfunctioning kidney = <strong>IIIB</strong>." },
      { p: "2.5 cm tumor with a PET-positive obturator node", a: "IIIC1", why: "Any pelvic node = <strong>IIIC1</strong> (r = imaging, p = pathology), regardless of tumor size." },
      { p: "5 cm tumor with a PET-positive para-aortic node", a: "IIIC2", why: "Para-aortic node = <strong>IIIC2</strong>." },
      { p: "Biopsy-proven invasion of the bladder mucosa", a: "IVA", why: "Bladder or rectal <strong>mucosa</strong> (biopsy-proven) = <strong>IVA</strong>." },
      { p: "Parametrial invasion plus bullous edema of the bladder, negative bladder biopsy", a: "IIB", why: "<strong>Bullous edema alone doesn't make it IVA.</strong> Parametrial invasion = IIB." },
      { p: "Lung metastases", a: "IVB", why: "Distant metastases = <strong>IVB</strong>." },
    ],
  },
  "cns-localize": {
    title: "Localize the Lesion",
    choices: ["Frontal", "Parietal", "Temporal", "Occipital", "Cerebellum", "Brainstem"],
    items: [
      { p: "Personality change, disinhibition, and apathy", a: "Frontal", why: "<strong>Frontal lobe</strong>: executive function and personality." },
      { p: "Contralateral arm and face weakness", a: "Frontal", why: "The <strong>precentral gyrus (motor strip)</strong> is in the posterior frontal lobe." },
      { p: "Non-fluent (expressive) aphasia", a: "Frontal", why: "<strong>Broca's area</strong>, inferior frontal gyrus, dominant hemisphere." },
      { p: "Contralateral numbness and neglect of one side", a: "Parietal", why: "<strong>Parietal lobe</strong>: sensory cortex (postcentral gyrus); non-dominant parietal lesions cause neglect." },
      { p: "Fluent aphasia with poor comprehension", a: "Temporal", why: "<strong>Wernicke's area</strong>, superior temporal gyrus, dominant hemisphere." },
      { p: "Memory loss and complex partial seizures with d&eacute;j&agrave; vu", a: "Temporal", why: "Medial <strong>temporal lobe</strong> (hippocampus)." },
      { p: "Contralateral homonymous hemianopia", a: "Occipital", why: "<strong>Occipital lobe</strong> (visual cortex), or the optic radiations." },
      { p: "Ipsilateral ataxia, dysmetria, and nystagmus", a: "Cerebellum", why: "<strong>Cerebellar hemisphere</strong> lesions cause ipsilateral incoordination; midline lesions cause truncal ataxia." },
      { p: "Cranial nerve palsies with crossed (contralateral) body weakness", a: "Brainstem", why: "'Crossed' findings localize to the <strong>brainstem</strong>." },
      { p: "Morning headache, vomiting, and hydrocephalus in a child", a: "Cerebellum", why: "A <strong>posterior fossa</strong> tumor (e.g., medulloblastoma) blocking the 4th ventricle." },
    ],
  },
  "cns-tumor": {
    title: "Name That Tumor",
    choices: ["Glioblastoma", "Meningioma", "Vestibular schwannoma", "Brain metastases", "Pituitary adenoma", "CNS lymphoma", "Oligodendroglioma", "Medulloblastoma"],
    items: [
      { p: "65-year-old, thick irregular <strong>ring-enhancing</strong> mass with central necrosis crossing the corpus callosum ('butterfly')", a: "Glioblastoma", why: "Ring enhancement + necrosis + callosal spread = <strong>GBM</strong>. Lymphoma can also cross but enhances solidly." },
      { p: "Extra-axial, homogeneously enhancing mass with a <strong>dural tail</strong> and hyperostosis", a: "Meningioma", why: "Classic <strong>meningioma</strong>. Most common primary brain tumor." },
      { p: "Asymmetric hearing loss; enhancing <strong>'ice cream cone'</strong> in the IAC and CPA", a: "Vestibular schwannoma", why: "<strong>Vestibular schwannoma</strong> (acoustic neuroma)." },
      { p: "Multiple round enhancing lesions at the <strong>gray-white junction</strong> with lots of edema", a: "Brain metastases", why: "<strong>Metastases</strong>: multiple, gray-white junction, edema out of proportion to size." },
      { p: "Bitemporal hemianopia; <strong>'snowman'</strong> sellar/suprasellar mass", a: "Pituitary adenoma", why: "<strong>Pituitary macroadenoma</strong> pushing up on the chiasm, waisted at the diaphragma sellae." },
      { p: "Immunosuppressed patient; <strong>periventricular, homogeneously enhancing</strong> mass with restricted diffusion that shrinks on steroids", a: "CNS lymphoma", why: "<strong>PCNSL</strong>: dense cells restrict diffusion; hold steroids before biopsy." },
      { p: "40-year-old with seizures; frontal cortical mass with <strong>calcification</strong> on CT", a: "Oligodendroglioma", why: "<strong>Oligodendroglioma</strong>: frontal, cortical, calcified. Confirm IDH mutation + 1p/19q codeletion." },
      { p: "7-year-old with vomiting and ataxia; midline <strong>4th ventricle</strong> mass with restricted diffusion", a: "Medulloblastoma", why: "<strong>Medulloblastoma</strong>: most common malignant pediatric brain tumor. Needs craniospinal irradiation." },
    ],
  },
  "gi-nodes": {
    title: "Regional or Distant?",
    choices: ["Regional", "Distant (M1)"],
    items: [
      { p: "<strong>Rectum</strong>: mesorectal node", a: "Regional", why: "Mesorectal nodes are the first echelon: regional (N)." },
      { p: "<strong>Rectum</strong>: internal iliac node", a: "Regional", why: "Internal iliac (and obturator/presacral) nodes are regional for the rectum." },
      { p: "<strong>Rectum</strong> (not involving the anal canal): inguinal node", a: "Distant (M1)", why: "Inguinal nodes are <strong>distant (M1a)</strong> for rectal cancer. They're regional for anal cancer." },
      { p: "<strong>Rectum</strong>: external iliac node", a: "Distant (M1)", why: "AJCC treats external iliac nodes as <strong>nonregional</strong> for rectal cancer (unless the tumor invades an organ that drains there)." },
      { p: "<strong>Anal canal</strong>: inguinal node", a: "Regional", why: "Regional (N1a) for anal cancer: the reason the groins are always in the field." },
      { p: "<strong>Anal canal</strong>: external iliac node", a: "Regional", why: "Regional for anal cancer (N1b)." },
      { p: "<strong>Esophagus</strong>: celiac node", a: "Regional", why: "Celiac nodes are regional for esophageal cancer (AJCC 8)." },
      { p: "<strong>Esophagus</strong>: supraclavicular node", a: "Distant (M1)", why: "Supraclavicular nodes are <strong>distant</strong> for esophageal cancer." },
      { p: "<strong>Pancreas</strong>: para-aortic node", a: "Distant (M1)", why: "Para-aortic nodes are distant for pancreatic cancer." },
      { p: "<strong>Pancreas</strong>: peripancreatic node", a: "Regional", why: "Regional (N)." },
    ],
  },
  "gi-anal-t": {
    title: "Anal Cancer: Name the T Stage",
    choices: ["T1", "T2", "T3", "T4"],
    items: [
      { p: "1.5 cm anal canal tumor", a: "T1", why: "&le;2 cm = <strong>T1</strong>." },
      { p: "3.5 cm tumor invading the internal and external sphincter", a: "T2", why: "Size decides (&gt;2&ndash;5 cm = <strong>T2</strong>). Sphincter invasion does <strong>not</strong> make it T4." },
      { p: "6 cm tumor", a: "T3", why: "&gt;5 cm = <strong>T3</strong>." },
      { p: "3 cm tumor invading the posterior vaginal wall", a: "T4", why: "Invasion of an adjacent organ (<strong>vagina, urethra, bladder</strong>) = <strong>T4</strong>, regardless of size." },
      { p: "2.5 cm tumor extending onto the perianal skin", a: "T2", why: "Skin, subcutaneous tissue, and sphincter involvement don't count as T4." },
    ],
  },
  "gyn-endo-adjuvant": {
    title: "Endometrial Cancer: Which Adjuvant Therapy?",
    choices: ["Observation", "Vaginal brachy", "Pelvic EBRT", "Chemo ± RT"],
    items: [
      { p: "Endometrioid, stage IA, grade 1, no LVSI, age 55", a: "Observation", why: "Low risk: recurrence risk is very low. <strong>Observe.</strong>" },
      { p: "Endometrioid, stage IA, grade 3, no LVSI", a: "Vaginal brachy", why: "Most recurrences are at the <strong>vaginal cuff</strong>: <strong>vaginal brachytherapy</strong> (or observation)." },
      { p: "Endometrioid, stage IB, grade 2, age 66, no LVSI", a: "Vaginal brachy", why: "High-intermediate risk: <strong>vaginal brachy</strong> (PORTEC-2) is as good as EBRT for vaginal control with less toxicity." },
      { p: "Endometrioid, stage IB, grade 3, substantial LVSI", a: "Pelvic EBRT", why: "High risk with substantial LVSI: <strong>pelvic EBRT</strong> (&plusmn; chemo)." },
      { p: "Endometrioid, stage II (cervical stromal invasion), grade 2", a: "Pelvic EBRT", why: "Stage II: <strong>pelvic EBRT</strong> &plusmn; vaginal brachy (VCB alone for select low-grade cases)." },
      { p: "Endometrioid, stage IIIC1 (positive pelvic node)", a: "Chemo ± RT", why: "Node-positive: <strong>chemotherapy &plusmn; pelvic EBRT</strong> (PORTEC-3, GOG 258), plus immunotherapy for advanced disease." },
      { p: "Serous carcinoma, stage IA with myometrial invasion", a: "Chemo ± RT", why: "Aggressive histology: <strong>chemo &plusmn; vaginal brachy or EBRT</strong>." },
      { p: "p53-abnormal, stage IB", a: "Chemo ± RT", why: "p53abn behaves aggressively (FIGO 2023 IIC): <strong>chemo &plusmn; RT</strong> (PORTEC-3 molecular analysis)." },
      { p: "POLE-mutated, stage IB, grade 3", a: "Observation", why: "POLE-mutated tumors have an excellent prognosis (FIGO 2023 IA); <strong>de-escalation/observation</strong> is reasonable." },
    ],
  },
};

/* ============================================================
   CERVIX POST-HYSTERECTOMY CHECKER  (Sedlis / Peters criteria)
   ============================================================ */
function cervixPostop(o){
  if(o.nodes || o.margin || o.param) return "peters";
  const d = o.depth, s = o.size, lvsi = o.lvsi;
  const sedlis = (lvsi && d === "deep") || (lvsi && d === "middle" && s >= 2) || (lvsi && d === "superficial" && s >= 5) || (!lvsi && (d === "deep" || d === "middle") && s >= 4);
  return sedlis ? "sedlis" : "none";
}
const POSTOP_TX = {
  peters: { title: "High risk (Peters)", body: "<strong>Adjuvant pelvic chemoradiation</strong>: 45&ndash;50.4 Gy + weekly cisplatin (GOG 109). Extend the field to the para-aortics if common iliac or para-aortic nodes are positive; add vaginal brachy for a positive vaginal margin." },
  sedlis: { title: "Intermediate risk (Sedlis)", body: "<strong>Adjuvant pelvic RT</strong>: 45&ndash;50.4 Gy (GOG 92 cut recurrences roughly in half). Chemo isn't routinely added." },
  none: { title: "Low risk", body: "<strong>Observation.</strong> No Sedlis or Peters criteria." },
};
/* ============================================================
   WHO 2021 ADULT DIFFUSE GLIOMA CLASSIFIER
   ============================================================ */
function classifyGlioma(o){
  if(!o.idh){
    if(o.necmvp || o.molgbm) return { dx: "Glioblastoma, IDH-wildtype", grade: 4,
      tx: "Maximal safe resection &rarr; <strong>60 Gy/30 + temozolomide &rarr; 6 cycles adjuvant TMZ</strong> (Stupp) &plusmn; TTFields. Older/frail: 40 Gy/15 + TMZ or 25 Gy/5. MGMT methylation predicts TMZ benefit." };
    return { dx: "IDH-wildtype diffuse glioma without GBM criteria", grade: null,
      tx: "Uncommon in adults: send more molecular testing (TERT, EGFR, +7/&minus;10, H3, BRAF). Many turn out to be GBM or a pediatric-type glioma." };
  }
  if(o.codel){
    const g = (o.necmvp || o.anaplasia) ? 3 : 2;
    return { dx: "Oligodendroglioma, IDH-mutant and 1p/19q-codeleted", grade: g,
      tx: g === 3 ? "Resection &rarr; <strong>RT 59.4 Gy + PCV</strong> (RTOG 9402, EORTC 26951)." : "Resection &rarr; observation (low risk), <strong>vorasidenib</strong> for residual non-enhancing tumor (INDIGO), or <strong>RT 50.4&ndash;54 Gy + PCV</strong> for high risk (RTOG 9802)." };
  }
  const g = (o.cdkn || o.necmvp) ? 4 : (o.anaplasia ? 3 : 2);
  return { dx: "Astrocytoma, IDH-mutant", grade: g,
    tx: g === 4 ? "Resection &rarr; <strong>60 Gy + temozolomide</strong> (treated like GBM, better prognosis)." : g === 3 ? "Resection &rarr; <strong>RT 59.4 Gy + adjuvant temozolomide</strong> (CATNON)." : "Resection &rarr; observation, <strong>vorasidenib</strong> (INDIGO), or <strong>RT 50.4&ndash;54 Gy + chemo</strong> for high risk (age &ge;40, residual tumor)." };
}
function renderGliomaBuilder(container){
  container.classList.add("quiz-carousel", "stage-builder", "glioma-builder");
  const o = { idh: false, codel: false, necmvp: true, anaplasia: false, cdkn: false, molgbm: false };
  const tog = (k, txt) => `<button type="button" class="sb-pill sb-toggle ${o[k]?'active':''}" data-toggle="${k}">${o[k] ? "&#10003; " : ""}${txt}</button>`;
  function render(){
    if(!o.idh){ o.codel = false; o.cdkn = false; }
    if(o.idh) o.molgbm = false;
    const r = classifyGlioma(o);
    container.innerHTML = `
      <div class="qc-header"><span class="qc-badge">WHO 2021 Glioma Classifier</span><span class="qc-counter">Adult diffuse gliomas</span></div>
      <div class="sb-row sb-row-wide"><span class="sb-row-label">IDH</span><div class="sb-pills">
        <button type="button" class="sb-pill ${!o.idh?'active':''}" data-idh="0">Wild-type</button>
        <button type="button" class="sb-pill ${o.idh?'active':''}" data-idh="1">Mutant</button>
      </div></div>
      <div class="sb-row sb-row-wide"><span class="sb-row-label">Features</span><div class="sb-pills">
        ${tog("necmvp", "Necrosis or microvascular proliferation")}
        ${tog("anaplasia", "Anaplasia / high mitoses")}
        ${o.idh ? tog("codel", "1p/19q codeleted") : ""}
        ${o.idh && !o.codel ? tog("cdkn", "CDKN2A/B homozygous deletion") : ""}
        ${!o.idh ? tog("molgbm", "TERT promoter, EGFR amp, or +7/&minus;10") : ""}
      </div></div>
      <div class="sb-result">
        <div class="sb-stage"><span class="sb-group">${r.dx}${r.grade ? `, WHO grade ${r.grade}` : ""}</span></div>
        <div class="sb-meaning">${r.tx}</div>
      </div>`;
    container.querySelectorAll("[data-idh]").forEach(b => b.addEventListener("click", () => { o.idh = b.dataset.idh === "1"; render(); }));
    container.querySelectorAll("[data-toggle]").forEach(b => b.addEventListener("click", () => { o[b.dataset.toggle] = !o[b.dataset.toggle]; render(); }));
  }
  render();
}

/* ============================================================
   BRAIN METASTASIS GPA (original 2008 Sperduto GPA)
   ============================================================ */
function renderGpaBuilder(container){
  container.classList.add("quiz-carousel", "stage-builder", "gpa-builder");
  const o = { age: 0.5, kps: 1, n: 0.5, ecm: 0 };
  const rows = [
    ["age", "Age", [[1,"&lt;50"],[0.5,"50&ndash;60"],[0,"&gt;60"]]],
    ["kps", "KPS", [[1,"90&ndash;100"],[0.5,"70&ndash;80"],[0,"&lt;70"]]],
    ["n", "# Mets", [[1,"1"],[0.5,"2&ndash;3"],[0,"&gt;3"]]],
    ["ecm", "Body mets", [[1,"None"],[0,"Present"]]],
  ];
  function survival(score){
    if(score <= 1) return "~2.6 months";
    if(score <= 2.5) return "~3.8 months";
    if(score <= 3) return "~6.9 months";
    return "~11 months";
  }
  function render(){
    const score = o.age + o.kps + o.n + o.ecm;
    container.innerHTML = `
      <div class="qc-header"><span class="qc-badge">Brain Metastasis GPA (2008)</span><span class="qc-counter">Score 0&ndash;4</span></div>
      ${rows.map(([k, label, opts]) => `<div class="sb-row sb-row-wide"><span class="sb-row-label">${label}</span><div class="sb-pills">${
        opts.map(([v, txt]) => `<button type="button" class="sb-pill ${o[k]===v?'active':''}" data-k="${k}" data-v="${v}">${txt} <small>(${v})</small></button>`).join("")
      }</div></div>`).join("")}
      <div class="sb-result">
        <div class="sb-stage"><span class="sb-code">GPA</span><span class="sb-arrow">&rarr;</span><span class="sb-group">${score.toFixed(1)}</span></div>
        <ul class="sb-defs"><li><b>Median survival</b> ${survival(score)} (2008 cohort, all histologies)</li></ul>
        <div class="sb-meaning">${score >= 2.5 ? "Good prognosis: aggressive local therapy (SRS &plusmn; surgery) makes sense." : score >= 1.5 ? "Intermediate: SRS for limited disease; HA-WBRT + memantine for many mets." : "Poor prognosis: consider <strong>best supportive care</strong> or short WBRT (QUARTZ)."} Modern <strong>diagnosis-specific GPA</strong> adds tumor type and markers (EGFR/ALK, HER2, BRAF) and predicts much longer survival.</div>
      </div>`;
    container.querySelectorAll("[data-k]").forEach(b => b.addEventListener("click", () => { o[b.dataset.k] = parseFloat(b.dataset.v); render(); }));
  }
  render();
}

/* ============================================================
   RECTAL CANCER DECIDER (MRI features -> treatment approach)
   ============================================================ */
function rectalPlan(o){
  const adv = o.t === "T3" || o.t === "T4" || o.n;
  if(o.dmmr && adv) return { title: "MMR-deficient, locally advanced",
    body: "<strong>Checkpoint inhibitor first</strong> (e.g., dostarlimab): nearly all achieved a complete clinical response in the Cercek trial &rarr; <strong>watch-and-wait</strong>, often avoiding RT and surgery." };
  if(!adv) return { title: "Early (T1&ndash;T2 N0)",
    body: "<strong>TME surgery</strong> (low anterior resection, or APR if the sphincter can't be saved). Small T1: <strong>local excision</strong>. Low tumor + wants to keep the rectum: chemoRT/TNT &rarr; <strong>watch-and-wait</strong> in selected patients." };
  const high = o.t === "T4" || o.mrf || o.emvi || o.lat || o.low;
  if(!high) return { title: "Locally advanced, lower risk",
    body: "Neoadjuvant therapy then <strong>TME</strong>: short-course RT (25 Gy/5), long-course chemoRT (50.4 Gy/28 + capecitabine), or <strong>TNT</strong>. For mid/upper tumors with a clear MRF, <strong>FOLFOX with selective RT</strong> (PROSPECT) is an option." };
  return { title: "High risk: total neoadjuvant therapy (TNT)",
    body: "<strong>TNT</strong>: short-course RT + chemo (RAPIDO) or long-course chemoRT + chemo (OPRA, PRODIGE 23), then restage &rarr; <strong>TME</strong>, or <strong>watch-and-wait</strong> if complete clinical response." +
      (o.t === "T4" || o.mrf || o.lat ? " Favor <strong>long-course chemoRT</strong> for shrinkage (threatened MRF, T4) and boost enlarged <strong>lateral nodes</strong>." : "") +
      (o.low ? " Low tumor: TNT with consolidation chemo maximizes the chance of <strong>organ preservation</strong>." : "") };
}
function renderRectalBuilder(container){
  container.classList.add("quiz-carousel", "stage-builder", "rectal-builder");
  const o = { t: "T3", n: true, mrf: false, emvi: false, low: false, lat: false, dmmr: false };
  const tog = (k, txt) => `<button type="button" class="sb-pill sb-toggle ${o[k]?'active':''}" data-toggle="${k}">${o[k] ? "&#10003; " : ""}${txt}</button>`;
  function render(){
    const r = rectalPlan(o);
    container.innerHTML = `
      <div class="qc-header"><span class="qc-badge">Rectal Cancer: MRI &rarr; Plan</span><span class="qc-counter">Non-metastatic</span></div>
      <div class="sb-row sb-row-wide"><span class="sb-row-label">cT</span><div class="sb-pills">${["T1","T2","T3","T4"].map(v => `<button type="button" class="sb-pill ${o.t===v?'active':''}" data-t="${v}">${v}</button>`).join("")}</div></div>
      <div class="sb-row sb-row-wide"><span class="sb-row-label">cN</span><div class="sb-pills">
        <button type="button" class="sb-pill ${!o.n?'active':''}" data-n="0">N0</button>
        <button type="button" class="sb-pill ${o.n?'active':''}" data-n="1">N+</button></div></div>
      <div class="sb-row sb-row-wide"><span class="sb-row-label">MRI</span><div class="sb-pills">
        ${tog("mrf", "MRF &le;1 mm")}${tog("emvi", "EMVI+")}${tog("lat", "Enlarged lateral node")}${tog("low", "Low (&le;5 cm from verge)")}</div></div>
      <div class="sb-row sb-row-wide"><span class="sb-row-label">Biology</span><div class="sb-pills">${tog("dmmr", "MMR-deficient")}</div></div>
      <div class="sb-result">
        <div class="sb-stage"><span class="sb-group">${r.title}</span></div>
        <div class="sb-meaning">${r.body}</div>
      </div>`;
    container.querySelectorAll("[data-t]").forEach(b => b.addEventListener("click", () => { o.t = b.dataset.t; render(); }));
    container.querySelectorAll("[data-n]").forEach(b => b.addEventListener("click", () => { o.n = b.dataset.n === "1"; render(); }));
    container.querySelectorAll("[data-toggle]").forEach(b => b.addEventListener("click", () => { o[b.dataset.toggle] = !o[b.dataset.toggle]; render(); }));
  }
  render();
}

/* ============================================================
   PANCREAS RESECTABILITY (NCCN-style vessel contact)
   ============================================================ */
function pancreasResect(o){
  if(o.mets) return { title: "Metastatic", body: "<strong>Systemic therapy</strong> (FOLFIRINOX or gemcitabine/nab-paclitaxel; targeted therapy if a driver). RT for pain (celiac plexus) or bleeding." };
  if(o.art === 2 || o.vein === 3) return { title: "Locally advanced (unresectable)", body: "<strong>Chemotherapy first</strong> (FOLFIRINOX or gem/nab-paclitaxel), then consider <strong>chemoRT or SBRT</strong> for local control or pain; re-evaluate for surgery in rare responders (LAP07: chemoRT improved local control, not survival)." };
  if(o.art === 1 || o.vein === 2) return { title: "Borderline resectable", body: "<strong>Neoadjuvant chemotherapy</strong> (e.g., mFOLFIRINOX) &plusmn; chemoRT or SBRT, then restage &rarr; <strong>resection</strong>. The role of neoadjuvant RT is still debated." };
  return { title: "Resectable", body: "<strong>Surgery</strong> (Whipple for the head; distal pancreatectomy for body/tail) &rarr; <strong>adjuvant mFOLFIRINOX</strong> (PRODIGE 24). Neoadjuvant chemo is increasingly used. Adjuvant chemoRT for a positive margin in selected patients." };
}
function renderPancreasBuilder(container){
  container.classList.add("quiz-carousel", "stage-builder", "pancreas-builder");
  const o = { art: 0, vein: 1, mets: false };
  function pills(k, label, opts){
    return `<div class="sb-row sb-row-wide"><span class="sb-row-label">${label}</span><div class="sb-pills">${
      opts.map((txt, i) => `<button type="button" class="sb-pill ${o[k]===i?'active':''}" data-k="${k}" data-v="${i}">${txt}</button>`).join("")
    }</div></div>`;
  }
  function render(){
    const r = pancreasResect(o);
    container.innerHTML = `
      <div class="qc-header"><span class="qc-badge">Pancreas Resectability</span><span class="qc-counter">Pancreatic-protocol CT</span></div>
      ${pills("art", "SMA / celiac / CHA", ["No contact", "&le;180&deg;", "&gt;180&deg;"])}
      ${pills("vein", "SMV / portal vein", ["No contact", "&le;180&deg;, smooth", "&gt;180&deg; or irregular, reconstructable", "Unreconstructable"])}
      <div class="sb-row sb-row-wide"><span class="sb-row-label">Distant</span><div class="sb-pills">
        <button type="button" class="sb-pill sb-toggle ${o.mets?'active':''}" data-mets="1">${o.mets ? "&#10003; " : ""}Liver or peritoneal mets</button></div></div>
      <div class="sb-result">
        <div class="sb-stage"><span class="sb-group">${r.title}</span></div>
        <div class="sb-meaning">${r.body}</div>
      </div>`;
    container.querySelectorAll("[data-k]").forEach(b => b.addEventListener("click", () => { o[b.dataset.k] = parseInt(b.dataset.v, 10); render(); }));
    container.querySelectorAll("[data-mets]").forEach(b => b.addEventListener("click", () => { o.mets = !o.mets; render(); }));
  }
  render();
}

function renderSedlisBuilder(container){
  container.classList.add("quiz-carousel", "stage-builder", "sedlis-builder");
  const o = { nodes: false, margin: false, param: false, lvsi: true, depth: "middle", size: 2 };
  function pills(key, label, list){
    return `<div class="sb-row sb-row-wide"><span class="sb-row-label">${label}</span><div class="sb-pills">${
      list.map(([v, txt]) => `<button type="button" class="sb-pill ${String(v)===String(o[key])?'active':''}" data-k="${key}" data-v="${v}">${txt}</button>`).join("")
    }</div></div>`;
  }
  const tog = (k, txt) => `<button type="button" class="sb-pill sb-toggle ${o[k]?'active':''}" data-toggle="${k}">${o[k] ? "&#10003; " : ""}${txt}</button>`;
  function render(){
    const res = cervixPostop(o);
    container.innerHTML = `
      <div class="qc-header"><span class="qc-badge">After Radical Hysterectomy: Sedlis / Peters</span><span class="qc-counter">Cervical cancer</span></div>
      <div class="sb-row sb-row-wide"><span class="sb-row-label">Peters</span><div class="sb-pills">${tog("nodes","Positive nodes")}${tog("margin","Positive margin")}${tog("param","Parametrial invasion")}</div></div>
      ${pills("lvsi", "LVSI", [[true,"Present"],[false,"Absent"]])}
      ${pills("depth", "Stroma", [["superficial","Superficial 1/3"],["middle","Middle 1/3"],["deep","Deep 1/3"]])}
      ${pills("size", "Size", [[1,"&lt;2 cm"],[2,"2&ndash;3.9 cm"],[4,"4&ndash;4.9 cm"],[5,"&ge;5 cm"]])}
      <div class="sb-result">
        <div class="sb-stage"><span class="sb-group">${POSTOP_TX[res].title}</span></div>
        <div class="sb-meaning">${POSTOP_TX[res].body}</div>
      </div>`;
    container.querySelectorAll("[data-k]").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.k, v = b.dataset.v;
      o[k] = k === "lvsi" ? v === "true" : (k === "size" ? parseInt(v, 10) : v); render();
    }));
    container.querySelectorAll("[data-toggle]").forEach(b => b.addEventListener("click", () => { o[b.dataset.toggle] = !o[b.dataset.toggle]; render(); }));
  }
  render();
}
function renderChoiceDrill(container){
  const set = DRILL_SETS[container.dataset.drillSet];
  if(!set) return;
  container.classList.add("quiz-carousel", "choice-drill");
  let order = shuffled(set.items), i = 0, picked = null, score = 0, total = 0;
  function render(){
    const item = order[i];
    const answered = picked !== null;
    container.innerHTML = `
      <div class="qc-header">
        <span class="qc-badge">${set.title}</span>
        <span class="qc-counter">${total ? `Score ${score} / ${total}` : `${set.items.length} items, random order`}</span>
      </div>
      <div class="qc-question">${item.p}</div>
      <div class="quiz-choices cd-choices">${(item.choices || set.choices).map(c => {
        let cls = "quiz-choice";
        if(answered){ if(c === item.a) cls += " correct"; else if(c === picked) cls += " incorrect"; }
        return `<button type="button" class="${cls}" data-c="${escapeHtml(c)}" ${answered?"disabled":""}>${escapeHtml(c)}</button>`;
      }).join("")}</div>
      ${answered ? `<div class="qc-answer">${item.why}</div>
      <div class="qc-controls"><button type="button" class="cw-btn primary" data-act="next">Next &rarr;</button></div>` : ""}`;
    container.querySelectorAll("[data-c]").forEach(b => b.addEventListener("click", () => {
      picked = b.dataset.c; total++; if(picked === item.a) score++; render();
    }));
    const next = container.querySelector('[data-act="next"]');
    if(next) next.addEventListener("click", () => {
      i++; picked = null;
      if(i >= order.length){ order = shuffled(set.items); i = 0; }
      render();
    });
  }
  render();
}

/* ============================================================
   GLEASON BUILDER  (pick primary + secondary pattern)
   ============================================================ */
const GLEASON_PATTERN = {
  3: "Discrete, well-formed glands infiltrating between benign glands.",
  4: "Fused, poorly formed, or <strong>cribriform</strong> glands.",
  5: "No gland formation: <strong>sheets, cords, single cells</strong>, or comedonecrosis.",
};
function gleasonGG(p, s){
  const sum = p + s;
  if(sum <= 6) return 1;
  if(sum === 7) return p === 3 ? 2 : 3;
  if(sum === 8) return 4;
  return 5;
}
const GG_MEANING = {
  1: "Behaves indolently; almost never metastasizes. With T1&ndash;T2a and PSA &lt;10 = low or very low risk &rarr; <strong>active surveillance</strong>.",
  2: "Mostly pattern 3. An <strong>intermediate</strong> risk factor that can still be <strong>favorable</strong> intermediate.",
  3: "Mostly pattern 4. Automatically <strong>unfavorable intermediate</strong> risk (or worse).",
  4: "A <strong>high-risk</strong> feature by itself.",
  5: "A <strong>high-risk</strong> feature; if the primary pattern is 5, the patient is <strong>very high risk</strong>.",
};
function renderGleasonBuilder(container){
  container.classList.add("quiz-carousel", "stage-builder", "gleason-builder");
  const st = { p: 3, s: 4 };
  function row(kind, label, cur){
    return `<div class="sb-row sb-row-wide"><span class="sb-row-label">${label}</span><div class="sb-pills">${
      [3,4,5].map(v => `<button type="button" class="sb-pill ${v===cur?'active':''}" data-k="${kind}" data-v="${v}">${v}</button>`).join("")
    }</div></div>`;
  }
  function render(){
    const gg = gleasonGG(st.p, st.s);
    container.innerHTML = `
      <div class="qc-header"><span class="qc-badge">Gleason Builder</span><span class="qc-counter">Primary = most common pattern</span></div>
      ${row("p", "Primary", st.p)}
      ${row("s", "Secondary", st.s)}
      <div class="sb-result">
        <div class="sb-stage"><span class="sb-code">Gleason ${st.p}+${st.s}=${st.p+st.s}</span><span class="sb-arrow">&rarr;</span><span class="sb-group">Grade Group ${gg}</span></div>
        <ul class="sb-defs">
          <li><b>Pattern ${st.p}</b> ${GLEASON_PATTERN[st.p]}</li>
          ${st.s !== st.p ? `<li><b>Pattern ${st.s}</b> ${GLEASON_PATTERN[st.s]}</li>` : ""}
        </ul>
        <div class="sb-meaning">${GG_MEANING[gg]}${st.p === 5 ? " <strong>Primary pattern 5 = very high risk.</strong>" : ""}</div>
      </div>`;
    container.querySelectorAll(".sb-pill").forEach(b => b.addEventListener("click", () => { st[b.dataset.k] = parseInt(b.dataset.v, 10); render(); }));
  }
  render();
}

/* ============================================================
   PROSTATE RISK BUILDER  (NCCN risk group + AJCC stage, N0 M0)
   ============================================================ */
function prostateRisk(o){
  const high = [o.t === "T3a", o.gg >= 4, o.psa === ">20"].filter(Boolean).length;
  if(o.t === "T3b" || o.t === "T4" || o.primary5 || o.cores4 || high >= 2) return "Very high";
  if(high === 1) return "High";
  const irf = [o.t === "T2b" || o.t === "T2c", o.gg === 2 || o.gg === 3, o.psa === "10-20"].filter(Boolean).length;
  if(irf >= 1) return (irf === 1 && o.gg <= 2 && !o.cores50) ? "Favorable intermediate" : "Unfavorable intermediate";
  return (o.t === "T1c" && o.psad) ? "Very low" : "Low";
}
function prostateAJCC(o){
  if(o.gg === 5) return "IIIC";
  if(o.t.startsWith("T3") || o.t === "T4") return "IIIB";
  if(o.psa === ">20") return "IIIA";
  if(o.gg >= 3) return "IIC";
  if(o.gg === 2) return "IIB";
  return (o.psa === "10-20" || o.t === "T2b" || o.t === "T2c") ? "IIA" : "I";
}
const RISK_TX = {
  "Very low": "<strong>Active surveillance</strong> (PSA, exam, repeat MRI/biopsy).",
  "Low": "<strong>Active surveillance</strong> preferred; RT or prostatectomy if the patient chooses or progresses.",
  "Favorable intermediate": "<strong>RT alone</strong> (no ADT): EBRT, SBRT (e.g., 36.25 Gy/5), or LDR brachy monotherapy; or prostatectomy. Select patients: surveillance.",
  "Unfavorable intermediate": "<strong>RT + 4&ndash;6 months ADT</strong> (or EBRT + brachy boost); or prostatectomy + pelvic node dissection.",
  "High": "<strong>RT + 18&ndash;36 months ADT</strong> &plusmn; pelvic nodal RT &plusmn; brachy boost; or prostatectomy + pelvic node dissection.",
  "Very high": "<strong>RT + 2&ndash;3 years ADT</strong> + pelvic nodes; add <strong>abiraterone</strong> if &ge;2 of T3&ndash;4, Gleason 8&ndash;10, PSA &ge;40 (STAMPEDE). Prostatectomy for select patients.",
};
function renderRiskBuilder(container){
  container.classList.add("quiz-carousel", "stage-builder", "risk-builder");
  const o = { t: "T1c", gg: 2, psa: "<10", cores50: false, psad: false, primary5: false, cores4: false };
  function pills(key, label, list, cur){
    return `<div class="sb-row sb-row-wide"><span class="sb-row-label">${label}</span><div class="sb-pills">${
      list.map(([v, txt]) => `<button type="button" class="sb-pill ${String(v)===String(cur)?'active':''}" data-k="${key}" data-v="${v}">${txt}</button>`).join("")
    }</div></div>`;
  }
  function toggle(key, txt){
    return `<button type="button" class="sb-pill sb-toggle ${o[key]?'active':''}" data-toggle="${key}">${o[key] ? "&#10003; " : ""}${txt}</button>`;
  }
  function render(){
    if(o.gg !== 5) o.primary5 = false;
    const risk = prostateRisk(o);
    container.innerHTML = `
      <div class="qc-header"><span class="qc-badge">Risk Group Builder &middot; NCCN</span><span class="qc-counter">Assumes N0 M0</span></div>
      ${pills("t", "cT", ["T1c","T2a","T2b","T2c","T3a","T3b","T4"].map(v=>[v,v]), o.t)}
      ${pills("gg", "GG", [1,2,3,4,5].map(v=>[v,`GG${v}`]), o.gg)}
      ${pills("psa", "PSA", [["<10","&lt;10"],["10-20","10&ndash;20"],[">20","&gt;20"]], o.psa)}
      <div class="sb-row sb-row-wide"><span class="sb-row-label">+</span><div class="sb-pills">
        ${toggle("cores50", "&ge;50% of cores positive")}
        ${o.t === "T1c" && o.gg === 1 && o.psa === "<10" ? toggle("psad", "PSA density &lt;0.15") : ""}
        ${o.gg >= 4 ? toggle("cores4", "&gt;4 cores with GG4&ndash;5") : ""}
        ${o.gg === 5 ? toggle("primary5", "Primary pattern 5") : ""}
      </div></div>
      <div class="sb-result">
        <div class="sb-stage"><span class="sb-code">c${o.t} &middot; GG${o.gg} &middot; PSA ${o.psa.replace("<","&lt;").replace(">","&gt;")}</span><span class="sb-arrow">&rarr;</span><span class="sb-group">${risk} risk</span></div>
        <ul class="sb-defs"><li><b>AJCC</b> Stage ${prostateAJCC(o)} (if N0 M0)</li></ul>
        <div class="sb-meaning">${RISK_TX[risk]}</div>
      </div>`;
    container.querySelectorAll("[data-k]").forEach(b => b.addEventListener("click", () => {
      o[b.dataset.k] = b.dataset.k === "gg" ? parseInt(b.dataset.v, 10) : b.dataset.v; render();
    }));
    container.querySelectorAll("[data-toggle]").forEach(b => b.addEventListener("click", () => { o[b.dataset.toggle] = !o[b.dataset.toggle]; render(); }));
  }
  render();
}

function renderQuizCarousel(container, items, badge){
  let idx = 0;
  let revealed = false;

  function render(){
    const item = items[idx];
    container.innerHTML = `
      <div class="qc-header">
        <span class="qc-badge">${escapeHtml(badge || "Quick Check")}</span>
        <span class="qc-counter">${idx + 1} of ${items.length}</span>
      </div>
      <div class="qc-question">${item.q}</div>
      ${revealed ? `<div class="qc-answer">${item.a}</div>` : ""}
      <div class="qc-controls">
        ${revealed
          ? `<button type="button" class="cw-btn primary" data-act="next">Next question &rarr;</button>`
          : `<button type="button" class="cw-btn primary" data-act="show">${badge ? "Check answer" : "Show answer"}</button>`}
      </div>
    `;
    const showBtn = container.querySelector('[data-act="show"]');
    if(showBtn) showBtn.addEventListener("click", () => { revealed = true; render(); });
    const nextBtn = container.querySelector('[data-act="next"]');
    if(nextBtn) nextBtn.addEventListener("click", () => { idx = (idx + 1) % items.length; revealed = false; render(); });
  }

  container.classList.add("quiz-carousel");
  render();
}

/* ============================================================
   TAB CAROUSELS
   (a doc embeds <div class="tab-carousel" data-label="...">
    <section class="tc-slide" data-title="Oral Cavity">...</section>...
    </div>; this turns it into one-slide-at-a-time with pill tabs
    plus previous/next buttons, e.g. staging tables by subsite)
   ============================================================ */
function mountTabCarousels(root){
  (root || document).querySelectorAll(".tab-carousel:not(.tc-mounted)").forEach((el) => {
    const slides = Array.from(el.querySelectorAll(":scope > .tc-slide"));
    if(!slides.length) return;
    el.classList.add("tc-mounted");
    const label = el.dataset.label || "";
    const head = document.createElement("div");
    head.className = "tc-head";
    head.innerHTML = `
      ${label ? `<div class="tc-label">${escapeHtml(label)}</div>` : ""}
      <div class="tc-tabs" role="tablist">
        ${slides.map((sl, i) => `<button type="button" class="tc-tab" role="tab" data-i="${i}">${escapeHtml(sl.dataset.title || `Table ${i+1}`)}</button>`).join("")}
      </div>`;
    const foot = document.createElement("div");
    foot.className = "tc-foot";
    foot.innerHTML = `
      <button type="button" class="tc-nav" data-dir="-1"></button>
      <span class="tc-count tabular"></span>
      <button type="button" class="tc-nav" data-dir="1"></button>`;
    el.insertBefore(head, el.firstChild);
    el.appendChild(foot);

    let idx = 0;
    function show(i){
      idx = (i + slides.length) % slides.length;
      slides.forEach((sl, j) => { sl.hidden = j !== idx; });
      head.querySelectorAll(".tc-tab").forEach((b, j) => {
        b.classList.toggle("active", j === idx);
        b.setAttribute("aria-selected", j === idx ? "true" : "false");
      });
      const prev = slides[(idx - 1 + slides.length) % slides.length].dataset.title;
      const next = slides[(idx + 1) % slides.length].dataset.title;
      foot.querySelector('[data-dir="-1"]').innerHTML = `&larr; ${escapeHtml(prev)}`;
      foot.querySelector('[data-dir="1"]').innerHTML = `${escapeHtml(next)} &rarr;`;
      foot.querySelector(".tc-count").textContent = `${idx+1} / ${slides.length}`;
    }
    head.querySelectorAll(".tc-tab").forEach((b) => b.addEventListener("click", () => show(parseInt(b.dataset.i, 10))));
    foot.querySelectorAll(".tc-nav").forEach((b) => b.addEventListener("click", () => show(idx + parseInt(b.dataset.dir, 10))));
    show(0);
  });
}

function mountQuizCarousels(){
  mountTabCarousels(document.getElementById("doc-body"));
  // Question carousels written inline in a doc: <div class="quiz-carousel" data-inline-quiz="Badge">
  // <div class="qc-item"><div class="qc-q">...</div><div class="qc-a">...</div></div>...</div>
  document.querySelectorAll(".quiz-carousel[data-inline-quiz]").forEach((el) => {
    if(!el._inlineItems){
      el._inlineItems = Array.from(el.querySelectorAll(":scope > .qc-item")).map(it => ({
        q: it.querySelector(".qc-q").innerHTML, a: it.querySelector(".qc-a").innerHTML,
      }));
    }
    if(el._inlineItems.length) renderQuizCarousel(el, el._inlineItems, el.dataset.inlineQuiz);
  });
  document.querySelectorAll(".quiz-carousel[data-quiz-set]").forEach((el) => {
    const items = QUIZ_SETS[el.dataset.quizSet];
    if(items) renderQuizCarousel(el, items);
  });
  document.querySelectorAll("#doc-body .stage-builder:not(.gleason-builder):not(.risk-builder):not(.sedlis-builder):not(.glioma-builder):not(.gpa-builder):not(.rectal-builder):not(.pancreas-builder)").forEach(renderStageBuilder);
  document.querySelectorAll("#doc-body .nstage-drill").forEach(renderNStageDrill);
  document.querySelectorAll("#doc-body .choice-drill[data-drill-set]").forEach(renderChoiceDrill);
  document.querySelectorAll("#doc-body .gleason-builder").forEach(renderGleasonBuilder);
  document.querySelectorAll("#doc-body .risk-builder").forEach(renderRiskBuilder);
  document.querySelectorAll("#doc-body .sedlis-builder").forEach(renderSedlisBuilder);
  document.querySelectorAll("#doc-body .glioma-builder").forEach(renderGliomaBuilder);
  document.querySelectorAll("#doc-body .gpa-builder").forEach(renderGpaBuilder);
  document.querySelectorAll("#doc-body .rectal-builder").forEach(renderRectalBuilder);
  document.querySelectorAll("#doc-body .pancreas-builder").forEach(renderPancreasBuilder);
}

/* ============================================================
   RENDER: SERVICE DETAIL
   ============================================================ */
let currentServiceId = null;

function openService(svcId){
  currentServiceId = svcId;
  const svc = SERVICES.find(s=>s.id===svcId);
  const info = siteInfo(svcId);
  const view = document.getElementById("view-service");
  view.style.setProperty("--svc", svc.color);
  const icon = document.getElementById("svc-detail-icon");
  icon.textContent = svc.icon;
  icon.style.color = svc.color;
  document.getElementById("svc-detail-name").textContent = info.title || svc.name;
  document.getElementById("mod-summary").textContent = info.summary || svc.blurb;
  document.getElementById("mod-topics").innerHTML = (info.topics || []).map(t => `<span>${escapeHtml(t)}</span>`).join(" ");

  const art = CARD_ART[svcId];
  document.getElementById("mod-hero-media").innerHTML = art
    ? `<img src="${art.image}" alt="${escapeHtml(art.credit.split(". ")[0])}"><figcaption>${escapeHtml(art.credit)}</figcaption>` : "";
  document.getElementById("mod-hero-media").hidden = !art;

  const cards = svcCards(svcId);
  const st = cardStats(cards);
  const dueN = svcDueCards(svcId).length;
  const caseList = casesFor(svcId);
  const casesDone = caseList.filter(c => isCaseDone(svcId, c.id)).length;
  const readings = docCategoriesFor(svcId).filter(c => DOCS[svcId] && DOCS[svcId][c]);
  const stats = [
    [readings.length, "readings"],
    [plateCount(svcId), "interactive plates"],
    [cards.length, "flashcards", `${st.mastered} mastered &middot; ${dueN} due`],
    [caseList.length, "clinical cases", caseList.length ? `${casesDone} completed` : "Not yet available"],
  ];
  document.getElementById("svc-detail-stats").innerHTML = stats.map(([n, l, sub]) =>
    `<div><dt>${l}</dt><dd><span class="ms-n tabular">${n}</span>${sub ? `<span class="ms-sub">${sub}</span>` : ""}</dd></div>`).join("");
  document.getElementById("svc-due-count").textContent = dueN;
  document.getElementById("mod-meta").innerHTML = contentMetaHTML(svcId);

  document.getElementById("btn-start-module").onclick = () => readings.length ? openDoc(svcId, readings[0]) : startStudySession(svcId, null);
  const casesBtn = document.getElementById("btn-module-cases");
  casesBtn.hidden = !caseList.length;
  casesBtn.onclick = () => openCaseList(svcId, "service");

  document.getElementById("mod-objectives").innerHTML = (info.objectives || [])
    .map(o => `<li><span class="check" aria-hidden="true">${ICONS.check}</span>${escapeHtml(o)}</li>`).join("");
  document.querySelector(".mod-learn").hidden = !(info.objectives || []).length;

  // Sub-I essential: the first point of the module's own staging high-yield summary.
  const essential = subIEssential(svcId);
  const essEl = document.getElementById("mod-essential");
  essEl.hidden = !essential;
  if(essential){
    essEl.innerHTML = `<span class="edu-badge badge-essential">Sub-I essential</span>
      <p class="ess-text">${escapeHtml(essential.text)}</p>
      <button class="link-btn ess-src" data-ess-cat="${encodeURIComponent(essential.cat)}">From the ${escapeHtml(essential.cat)} high-yield summary &rarr;</button>`;
    essEl.querySelector("[data-ess-cat]").onclick = () => openDoc(svcId, essential.cat);
  }

  const catList = document.getElementById("cat-list");
  catList.innerHTML = "";
  const catNames = docCategoriesFor(svcId);
  const deckCatMap = categoriesFor(svcId);
  if(catNames.length === 0){
    catList.innerHTML = `<div class="empty-state">No sections in this module yet.</div>`;
  }
  let catIdx = 0;
  for(const catName of catNames){
    const catCards = deckCatMap.get(catName) || [];
    const catDue = catCards.filter(c=>isDue(c.id)).length;
    const catMastered = catCards.filter(c=>getCardState(c.id).box >= MASTERY_BOX).length;
    const pct = catCards.length ? Math.round(100*catMastered/catCards.length) : 0;
    const hasDoc = !!(DOCS[svcId] && DOCS[svcId][catName]);
    const hasCards = catCards.length > 0;
    const row = document.createElement("div");
    row.className = "cat-row";
    row.style.setProperty("--svc", svc.color);
    row.innerHTML = `
      <span class="cat-num tabular" aria-hidden="true">${String(catIdx + 1).padStart(2, "0")}</span>
      <div class="cat-info">
        ${hasDoc ? `<button class="cat-name cat-open">${escapeHtml(catName)}</button>` : `<div class="cat-name">${escapeHtml(catName)}</div>`}
        <div class="cat-sub">${hasDoc ? "Reading" : ""}${hasDoc && hasCards ? " &middot; " : ""}${hasCards ? `${catCards.length} flashcards${catMastered ? ` &middot; ${catMastered} mastered` : ""}` : ""}</div>
        ${hasCards ? `<div class="cat-progress-bar" aria-hidden="true"><div class="cat-progress-fill" style="width:${pct}%"></div></div>` : ""}
      </div>
      ${hasCards ? `<div class="due-badge ${catDue===0?'zero':''}">${catDue} due</div><button class="cat-study" data-cat="${encodeURIComponent(catName)}" aria-label="Study ${escapeHtml(catName)} flashcards">Study</button>` : ""}
    `;
    if(hasCards){
      row.querySelector(".cat-study").addEventListener("click", (e) => { e.stopPropagation(); startStudySession(svcId, catName); });
    }
    if(hasDoc){
      row.querySelector(".cat-open").addEventListener("click", () => openDoc(svcId, catName));
    }
    armReveal(row, catIdx * 45);
    catIdx++;
    catList.appendChild(row);
  }

  if(caseList.length){
    const row = document.createElement("div");
    row.className = "cat-row cases-row";
    row.style.setProperty("--svc", svc.color);
    row.innerHTML = `
      <span class="cat-num" aria-hidden="true"><span class="edu-badge badge-case">Case</span></span>
      <div class="cat-info">
        <button class="cat-name cat-open">Case-Based Practice</button>
        <div class="cat-sub">${caseList.length} clinical cases &middot; ${casesDone} completed</div>
        <div class="cat-progress-bar" aria-hidden="true"><div class="cat-progress-fill" style="width:${Math.round(100*casesDone/caseList.length)}%"></div></div>
      </div>
      <div class="due-badge ${casesDone===caseList.length?'zero':''}">${casesDone}/${caseList.length} done</div>
      <button class="cat-study" data-open-cases>Practice</button>
    `;
    row.querySelector("[data-open-cases]").addEventListener("click", (e) => { e.stopPropagation(); openCaseList(svcId, "service"); });
    row.querySelector(".cat-open").addEventListener("click", () => openCaseList(svcId, "service"));
    catList.appendChild(row);
  }

  document.getElementById("mod-sources").innerHTML = `
    <h2 class="mod-h2" id="mod-sources-title">Sources &amp; References</h2>
    ${siteSourcesHTML(svcId)}
    <p class="mod-sources-foot">Guidelines change. Check the current version before applying anything clinically. <button class="link-btn" data-go="resources">All sources &amp; references &rarr;</button></p>`;

  const foundations = ["treatment-planning", "the-consult", "presenting-patients"].map(bgSection).filter(Boolean);
  document.getElementById("mod-related").innerHTML =
    SERVICES.filter(s => s.id !== svcId).map(s => `<button class="related-chip" data-go="site:${s.id}" style="--svc:${s.color}"><span class="dot" aria-hidden="true"></span>${escapeHtml(s.name)}</button>`).join("") +
    foundations.map(f => `<button class="related-chip is-foundation" data-go="bg:${f.id}">${escapeHtml(f.title)}</button>`).join("");

  document.getElementById("btn-study-service").onclick = () => startStudySession(svcId, null);

  showView("view-service");
}

// "Content review" metadata: the staging system the module teaches, the
// guideline its tables are simplified from, and a review date only when one
// is recorded in curriculum.json.
function contentMetaHTML(svcId){
  const info = siteInfo(svcId);
  const items = [];
  if((info.staging || []).length) items.push(["Staging", info.staging.map(escapeHtml).join(", ")]);
  if(info.guideline) items.push(["Guidelines", `${escapeHtml(info.guideline)}`]);
  if(info.reviewed) items.push(["Content review", escapeHtml(formatReviewed(info.reviewed))]);
  if(!items.length) return "";
  return items.map(([k, v]) => `<div class="cm-item"><span class="cm-k">${k}</span><span class="cm-v">${v}</span></div>`).join("") +
    `<button class="cm-link link-btn" data-go="resources">See Sources &amp; References</button>`;
}
function formatReviewed(v){
  const m = /^(\d{4})-(\d{2})/.exec(v);
  if(!m) return v;
  return new Date(+m[1], +m[2] - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}
function subIEssential(svcId){
  const cat = docCategoriesFor(svcId).find(c => /^Workup/.test(c) && DOCS[svcId] && DOCS[svcId][c]);
  if(!cat) return null;
  const tmp = document.createElement("div");
  tmp.innerHTML = DOCS[svcId][cat].html;
  const pearls = [...tmp.querySelectorAll(".pearl")];
  const hy = pearls.reverse().find(p => /high-yield/i.test(p.textContent)) || null;
  const li = hy && hy.querySelector("li");
  return li ? { cat, text: li.textContent.replace(/\s+/g, " ").trim() } : null;
}
// Restrained labels on callouts that already exist in the readings.
function labelCallouts(root){
  root.querySelectorAll(".pearl").forEach(p => {
    if(p.querySelector(".edu-badge")) return;
    const strong = p.querySelector(":scope > strong");
    const head = strong ? strong.textContent.trim() : "";
    const hy = /high-yield/i.test(head);
    const b = document.createElement("span");
    b.className = `edu-badge ${hy ? "badge-hy" : "badge-pearl"}`;
    b.textContent = hy ? "High-yield summary" : "Clinical pearl";
    if(hy) p.classList.add("pearl-hy");
    // when the callout's own heading just repeats the label, the badge replaces it
    if(strong && /^(high-yield summary|clinical pearl)$/i.test(head)){ strong.classList.add("visually-hidden"); b.setAttribute("aria-hidden", "true"); }
    p.insertBefore(b, p.firstChild);
  });
}

/* ============================================================
   DOC VIEW: one curriculum module page
   Shared by disease-site readings (openDoc) and Before You Start
   pages (openBackground). The reading HTML itself is never edited;
   renderModulePage() lays it out as numbered sections with a sticky
   "On this page" rail, then adds the learn -> reinforce -> apply loop.
   ============================================================ */
let currentDoc = { kind: "disease", svcId: null, catName: null, bgId: null };

function moduleInfo(svcId, catName){
  const mods = siteInfo(svcId).modules || {};
  return mods[catName] || {};
}
function siteReadings(svcId){ return docCategoriesFor(svcId).filter(c => DOCS[svcId] && DOCS[svcId][c]); }

function openDoc(svcId, catName){
  const doc = DOCS[svcId] && DOCS[svcId][catName];
  if(!doc) return;
  currentDoc = { kind: "disease", svcId, catName, bgId: null };
  const svc = SERVICES.find(s => s.id === svcId);
  const info = siteInfo(svcId);
  const mod = moduleInfo(svcId, catName);
  const siteTitle = info.title || svc.name;
  const catNames = siteReadings(svcId);
  const idx = catNames.indexOf(catName);
  const two = (n) => String(n).padStart(2, "0");
  const caseList = casesFor(svcId);
  const lastNext = caseList.length ? { name: "Case-Based Practice", label: "Next:" } : { name: `${siteTitle} overview`, label: "Back to" };

  renderModulePage({
    color: svc.color,
    crumbs: [["Disease Sites", "sites"], [siteTitle, `site:${svcId}`], [catName]],
    eyebrow: siteTitle,
    position: `Module ${two(idx + 1)} of ${two(catNames.length)}`,
    title: catName,
    lede: mod.lede || "",
    html: doc.html,
    introLabel: "Clinical framework",
    bigIdeaBadge: "High-yield",
    essentials: mod.essentials || [],
    objectives: mod.objectives || [],
    mount: (bodyEl) => {
      mountInteractiveModule(svcId, catName, svc.color);
      mountPlateGroupsIn(bodyEl, (ANATOMY[svcId] && !ANATOMY[svcId].plates) ? ANATOMY[svcId] : {}, "Interactive Anatomy", svc.color);
      mountPlateGroupsIn(bodyEl, (IMAGING[svcId] && !IMAGING[svcId].plates) ? IMAGING[svcId] : {}, "Interactive Imaging", svc.color);
    },
    cards: svcCards(svcId).filter(c => c.category === catName),
    facts: [["Disease site", svc.name], ["Module", catName]],
    caseSvc: caseList.length ? svcId : null,
    refs: moduleRefsHTML(svcId, doc.html),
    reviewed: info.reviewed,
    path: {
      title: siteTitle,
      items: catNames.map((c, i) => ({ label: c, go: () => openDoc(svcId, c), current: i === idx }))
        .concat(caseList.length ? [{ label: "Case-Based Practice", go: () => openCaseList(svcId, "service"), isCases: true }] : []),
    },
    prev: idx > 0 ? { name: catNames[idx - 1] } : null,
    next: idx < catNames.length - 1 ? { name: catNames[idx + 1] } : lastNext,
    navLabel: `Module ${idx + 1} of ${catNames.length}`,
  });
  showView("view-doc");
}

// Breadcrumbs: [label, data-go target] pairs; the last one is the current page.
function crumbsHTML(items){
  return `<ol>${items.map(([label, go], i) => i === items.length - 1
    ? `<li><span aria-current="page">${escapeHtml(label)}</span></li>`
    : `<li><button class="crumb" data-go="${go}">${escapeHtml(label)}</button><span class="crumb-sep" aria-hidden="true">/</span></li>`).join("")}</ol>`;
}

// Restructures a rendered reading into: an intro ("Clinical framework"),
// then one <section> per h3 with a section number. Returns TOC entries.
function sectionizeDoc(bodyEl, introLabel){
  bodyEl.querySelectorAll(":scope > .doc-toc").forEach(n => n.remove()); // replaced by the rail
  const kids = [...bodyEl.childNodes];
  const used = new Set();
  const slugFor = (h) => {
    if(h.id){ used.add(h.id); return h.id; }
    const base = (h.textContent || "section").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "section";
    let id = base, n = 2;
    while(used.has(id) || document.getElementById(id)) id = `${base}-${n++}`;
    used.add(id);
    return id;
  };
  const intro = document.createElement("section");
  intro.className = "doc-intro";
  intro.innerHTML = `<span class="sec-kicker">${escapeHtml(introLabel)}</span>`;
  const sections = [];
  let cur = intro;
  for(const node of kids){
    if(node.nodeType === 1 && node.tagName === "H3"){
      const sec = document.createElement("section");
      sec.className = "doc-sec";
      const num = String(sections.length + 1).padStart(2, "0");
      node.id = slugFor(node);
      const head = document.createElement("div");
      head.className = "sec-head";
      head.innerHTML = `<span class="sec-num" aria-hidden="true">${num}</span>`;
      head.appendChild(node);
      sec.appendChild(head);
      sections.push({ id: node.id, label: node.textContent.trim(), num, el: sec });
      cur = sec;
      continue;
    }
    cur.appendChild(node);
  }
  bodyEl.innerHTML = "";
  const hasIntro = [...intro.childNodes].some(n => n.nodeType === 1 ? !n.classList.contains("sec-kicker") : n.textContent.trim());
  if(hasIntro) bodyEl.appendChild(intro);
  sections.forEach(s => bodyEl.appendChild(s.el));
  return { intro: hasIntro ? intro : null, sections };
}

// Gives the existing callouts and stat cards a consistent visual language.
// Only relabels/reclasses what the reading already contains.
function styleLearningComponents(bodyEl, bigIdeaBadge){
  bodyEl.querySelectorAll(".big-idea").forEach(el => {
    el.classList.add("callout-hy");
    if(bigIdeaBadge && !el.querySelector(".edu-badge")) el.insertAdjacentHTML("afterbegin", `<span class="edu-badge badge-hy">${escapeHtml(bigIdeaBadge)}</span>`);
  });
  bodyEl.querySelectorAll(".card-grid").forEach(g => {
    const cards = [...g.querySelectorAll(":scope > .card")];
    if(!cards.length || g.querySelector(".card-num")) return;
    const numeric = cards.filter(c => /\d/.test((c.querySelector(".card-title") || {}).textContent || "")).length;
    if(numeric >= 2 && numeric * 2 > cards.length) g.classList.add("fact-grid");
  });
}

function essentialHTML(items){
  return `<aside class="callout-essential">
    <span class="edu-badge badge-essential">Sub-I essential</span>
    <p class="ess-lead">Before moving on, know:</p>
    <ul>${items.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
  </aside>`;
}

function tocListHTML(sections){
  return `<ol>${sections.map(s => `<li><a href="#${s.id}" data-toc="${s.id}"><span class="toc-num">${s.num}</span><span class="toc-label">${escapeHtml(s.label)}</span></a></li>`).join("")}</ol>`;
}

// References actually tied to this reading: the site's guideline and staging
// system, plus only those named trials that this reading mentions.
function moduleRefsHTML(svcId, html){
  const info = siteInfo(svcId);
  const text = String(html).replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  const trials = (info.trials || []).filter(t => new RegExp(`(^|[^A-Za-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9]|$)`).test(text));
  const rows = [];
  if(info.guideline) rows.push(["Guideline", escapeHtml(info.guideline)]);
  if((info.staging || []).length) rows.push(["Staging", info.staging.map(escapeHtml).join(" &middot; ")]);
  if(trials.length) rows.push(["Trials cited here", `<span class="trial-list">${trials.map(t => `<span>${escapeHtml(t)}</span>`).join("")}</span>`]);
  if(!rows.length) return "";
  const svc = SERVICES.find(s => s.id === svcId);
  return `<dl class="ref-dl">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
    <p class="refs-foot">Guidelines change; check the current version before applying anything clinically. <button class="link-btn" data-go="site:${svcId}#mod-sources">All ${escapeHtml(svc.name)} sources &amp; references &rarr;</button></p>`;
}

// opts: { color, crumbs, eyebrow, position, title, lede, html, introLabel,
//   essentials, objectives, mount(bodyEl), cards, facts, caseSvc, refs,
//   reviewed, path:{title, items}, prev, next, navLabel }
function renderModulePage(o){
  const view = document.getElementById("view-doc");
  view.style.setProperty("--svc", o.color);
  document.getElementById("doc-crumbs").innerHTML = crumbsHTML(o.crumbs);
  document.querySelector("#view-doc .doc-eyebrow .dot").style.background = o.color;
  document.getElementById("doc-svc-name").textContent = o.eyebrow;
  document.getElementById("doc-mod-pos").textContent = o.position || "";
  document.getElementById("doc-title").textContent = o.title;
  const lede = document.getElementById("doc-lede");
  lede.textContent = o.lede || "";
  lede.hidden = !o.lede;

  // body
  const bodyEl = document.getElementById("doc-body");
  bodyEl.innerHTML = o.html;
  const { intro, sections } = sectionizeDoc(bodyEl, o.introLabel);
  if((o.essentials || []).length){
    const anchor = intro || bodyEl.firstChild;
    const tmp = document.createElement("div");
    tmp.innerHTML = essentialHTML(o.essentials);
    intro ? intro.appendChild(tmp.firstElementChild) : bodyEl.insertBefore(tmp.firstElementChild, anchor);
  }
  o.mount && o.mount(bodyEl);
  mountQuizCarousels();
  labelCallouts(bodyEl);
  styleLearningComponents(bodyEl, o.bigIdeaBadge);

  // on-this-page (desktop rail + mobile disclosure)
  const rail = document.getElementById("rail-toc");
  const mob = document.getElementById("toc-mobile");
  if(sections.length >= 2){
    rail.innerHTML = `<div class="rail-label">On this page</div>${tocListHTML(sections)}`;
    mob.innerHTML = `<summary><span class="rail-label">On this page</span><span class="toc-count">${sections.length} sections</span><span class="toc-chev" aria-hidden="true">&#9662;</span></summary>${tocListHTML(sections)}`;
    mob.open = false;
  } else { rail.innerHTML = ""; mob.innerHTML = ""; }
  view.classList.toggle("no-toc", sections.length < 2);
  mob.hidden = sections.length < 2;
  docSpy.sections = sections.map(s => s.id);
  docSpy.active = null;

  // flashcards: real counts only
  const cards = o.cards || [];
  const due = cards.filter(c => isDue(c.id)).length;
  const mastered = cards.filter(c => getCardState(c.id).box >= MASTERY_BOX).length;
  const seen = cards.filter(c => getCardState(c.id).seen).length;
  document.getElementById("disease-doc-toolbar").hidden = !cards.length;
  document.getElementById("doc-study-count").textContent = cards.length;
  document.getElementById("disease-doc-footer").hidden = !cards.length;
  document.getElementById("loop-r-sub").innerHTML = cards.length
    ? `<strong class="tabular">${cards.length}</strong> flashcards for this module` +
      (due ? ` &middot; <span class="due-chip tabular">${due} due today</span>` : "") +
      (mastered ? ` &middot; <span class="tabular">${mastered}</span> mastered` : "")
    : "";

  // header facts row
  const facts = [...(o.facts || [])];
  if(cards.length) facts.push(["Flashcards", `${cards.length}`]);
  if(cards.length && (mastered || seen)) facts.push(["Progress", `${mastered} of ${cards.length} mastered`]);
  if(due) facts.push(["Due today", `${due}`]);
  document.getElementById("doc-facts").innerHTML = facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(String(v))}</dd></div>`).join("");

  // apply: the site's real cases
  const apply = document.getElementById("doc-apply");
  apply.hidden = !o.caseSvc;
  if(o.caseSvc){
    const svcId = o.caseSvc;
    const list = casesFor(svcId);
    const done = list.filter(c => isCaseDone(svcId, c.id)).length;
    const nextIdx = list.findIndex(c => !isCaseDone(svcId, c.id));
    const svc = SERVICES.find(s => s.id === svcId);
    document.getElementById("loop-a-sub").innerHTML = nextIdx >= 0
      ? `Apply what you learned in a clinical case. Up next: <strong>${escapeHtml(list[nextIdx].title)}</strong> <span class="loop-meta tabular">(${done} of ${list.length} completed)</span>`
      : `You've completed all ${list.length} ${escapeHtml(svc.name)} cases. Revisit any of them.`;
    const btn = document.getElementById("btn-doc-case");
    btn.innerHTML = nextIdx >= 0 ? `Start ${escapeHtml(svc.name)} case <span aria-hidden="true">&rarr;</span>` : `Review ${escapeHtml(svc.name)} cases <span aria-hidden="true">&rarr;</span>`;
    btn.onclick = () => { if(nextIdx >= 0){ casesOrigin = "service"; openCaseStepper(svcId, nextIdx); } else openCaseList(svcId, "service"); };
  }
  document.getElementById("loop-row").hidden = !cards.length && !o.caseSvc;

  // what you should know
  const know = document.getElementById("doc-know");
  know.hidden = !(o.objectives || []).length;
  document.getElementById("doc-know-list").innerHTML = (o.objectives || [])
    .map(t => `<li><span class="check" aria-hidden="true">${ICONS.check}</span>${escapeHtml(t)}</li>`).join("");

  // sources + content review (review date only when one is recorded)
  const refs = document.getElementById("doc-refs");
  refs.hidden = !o.refs;
  document.getElementById("doc-refs-body").innerHTML = o.refs || "";
  const meta = document.getElementById("doc-meta");
  meta.innerHTML = o.reviewed ? `<div class="cm-item"><span class="cm-k">Content review</span><span class="cm-v">Last reviewed ${escapeHtml(formatReviewed(o.reviewed))}</span></div>` : "";
  meta.hidden = !o.reviewed;
  document.getElementById("doc-sources-line").hidden = true;

  // curriculum path
  const path = document.getElementById("doc-path");
  path.innerHTML = `<div class="path-head"><span class="rail-label">${escapeHtml(o.path.title)}</span><span class="path-pos">${escapeHtml(o.navLabel)}</span></div>
    <ol class="path-list">${o.path.items.map((it, i) => `<li class="${it.current ? "is-current" : ""}${it.isCases ? " is-cases" : ""}">
      <button data-path="${i}" ${it.current ? 'aria-current="step"' : ""}><span class="path-num tabular">${it.isCases ? "&#9670;" : String(i + 1).padStart(2, "0")}</span><span class="path-label">${escapeHtml(it.label)}</span>${it.current ? `<span class="path-here">You are here</span>` : ""}</button></li>`).join("")}</ol>`;
  path.querySelectorAll("[data-path]").forEach(b => {
    const it = o.path.items[+b.dataset.path];
    if(it.current) b.disabled = true; else b.onclick = it.go;
  });

  // previous / next
  document.getElementById("bg-footer-nav").hidden = false;
  document.getElementById("bg-nav-label").textContent = o.navLabel;
  const prevBtn = document.getElementById("btn-bg-prev");
  prevBtn.style.visibility = o.prev ? "visible" : "hidden";
  document.getElementById("bg-nav-prev-label").textContent = "Previous";
  document.getElementById("bg-nav-prev-name").textContent = o.prev ? o.prev.name : "";
  document.getElementById("bg-nav-next-label").textContent = o.next && o.next.label === "Back to" ? "Back to" : "Next";
  document.getElementById("bg-nav-next-name").textContent = o.next ? o.next.name : "";
  const topNext = document.getElementById("btn-doc-next-top");
  topNext.hidden = !o.next;
  if(o.next) topNext.innerHTML = `<span class="tn-k">${o.next.label === "Back to" ? "Back to" : "Next"}:</span> ${escapeHtml(o.next.name)} <span aria-hidden="true">&rarr;</span>`;

  requestAnimationFrame(updateDocScroll);
}

// Reading progress bar + "On this page" scroll spy for the module page.
const docSpy = { sections: [], active: null, ticking: false };
function updateDocScroll(){
  docSpy.ticking = false;
  const view = document.getElementById("view-doc");
  document.body.classList.toggle("is-scrolled", window.scrollY > 24);
  if(!view || !view.classList.contains("active")) return;
  const body = document.getElementById("doc-body");
  const r = body.getBoundingClientRect();
  const total = r.height - window.innerHeight * 0.6;
  const pct = Math.max(0, Math.min(1, total > 0 ? -r.top / total : 0));
  document.querySelector("#read-progress span").style.transform = `scaleX(${pct})`;
  let active = null;
  for(const id of docSpy.sections){
    const el = document.getElementById(id);
    if(el && el.getBoundingClientRect().top < 140) active = id; else break;
  }
  if(active === docSpy.active) return;
  docSpy.active = active;
  document.querySelectorAll("#view-doc [data-toc]").forEach(a => {
    const on = a.dataset.toc === active;
    a.classList.toggle("is-active", on);
    if(on) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
  });
}
window.addEventListener("scroll", () => { if(!docSpy.ticking){ docSpy.ticking = true; requestAnimationFrame(updateDocScroll); } }, { passive: true });
window.addEventListener("resize", () => requestAnimationFrame(updateDocScroll));
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("#view-doc [data-toc]");
  if(!a) return;
  e.preventDefault();
  const el = document.getElementById(a.dataset.toc);
  if(el) el.scrollIntoView({ behavior: REDUCED_MOTION ? "auto" : "smooth", block: "start" });
  const mob = document.getElementById("toc-mobile");
  if(mob && mob.contains(a)) mob.open = false;
});

/* ============================================================
   INTERACTIVE ANATOMY / IMAGING PLATES
   (explore mode: click hotspots to learn them;
    quiz mode: an arrow points at one hotspot, pick it from MCQ choices)
   ============================================================ */
let plateUI = null; // { kind, data, plateIndex, mode, exploreActive, quiz }

function findInteractiveModule(svcId, catName){
  const a = typeof ANATOMY !== "undefined" ? ANATOMY[svcId] : null;
  if(a && a.category === catName) return { kind: "anatomy", data: a };
  const im = typeof IMAGING !== "undefined" ? IMAGING[svcId] : null;
  if(im && im.category === catName) return { kind: "imaging", data: im };
  return null;
}

function shuffled(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

// Answer choices for a plate quiz question. Built once per question and cached
// on the quiz state, so re-rendering after a click keeps every choice in place.
// When choices carry an ordinal (Level I/II/III, Station 4R, "(15 cm)"), they
// are listed in that order instead of shuffled.
const ROMAN_VAL = { I:1, V:5, X:10 };
function romanToInt(r){
  let n = 0;
  for(let i=0;i<r.length;i++){
    const v = ROMAN_VAL[r[i]], next = ROMAN_VAL[r[i+1]] || 0;
    n += v < next ? -v : v;
  }
  return n;
}
function choiceOrdinal(label){
  const m = label.match(/\b(?:Levels?|Stations?|Segments?|Layers?|Zones?|Stage|Type|Grade)\s+([IVX]+|\d+)([A-Za-z]?\d?)(?![A-Za-z])/)
    || label.match(/\(~?([IVX]+|\d+)([A-Za-z]?\d?)(?![A-Za-z])/);
  if(!m) return null;
  return { n: /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : romanToInt(m[1]), sfx: m[2] || "" };
}
function orderChoices(labels){
  const keyed = labels.map(l => ({ l, k: choiceOrdinal(l) }));
  const withKey = keyed.filter(x => x.k);
  if(withKey.length < 2) return labels;
  withKey.sort((a,b) => a.k.n - b.k.n || a.k.sfx.localeCompare(b.k.sfx) || a.l.localeCompare(b.l));
  return withKey.map(x => x.l).concat(keyed.filter(x => !x.k).map(x => x.l));
}
function plateQuizChoices(q, plate, plates, target){
  if(q.choices && q.choicesFor === q.index) return q.choices;
  let pool = plate.hotspots.filter(h => h.id !== target.id).map(h => h.label);
  if(pool.length < 3){
    const others = [];
    plates.forEach((p) => { if(p.id !== plate.id) p.hotspots.forEach(h => others.push(h.label)); });
    pool = pool.concat(shuffled(others.filter(l => l !== target.label && !pool.includes(l))));
  }
  q.choices = orderChoices(shuffled([target.label, ...shuffled(pool).slice(0, 3)]));
  q.choicesFor = q.index;
  return q.choices;
}

// Extra reference images shown under an interactive plate (clinical photo,
// CT/MRI slice, atlas drawing...). Each slot is { title, caption, style?, image? };
// until an image path is filled in, the slot renders as a labeled placeholder.
function plateGalleryHTML(items){
  if(!items || !items.length) return "";
  return `
    <div class="plate-gallery-label">More views</div>
    <div class="plate-gallery">
      ${items.map((g) => `
        <figure class="plate-gallery-item ${g.wide ? "wide" : ""}">
          <div class="plate-gallery-img style-${g.style || "schematic"} ${g.image ? "has-image" : ""}">
            ${g.image
              ? `<button class="plate-gallery-open" data-lightbox="${g.image}" data-lightbox-title="${escapeHtml(g.title)}" data-lightbox-caption="${escapeHtml(g.caption || "")}" aria-label="Enlarge: ${escapeHtml(g.title)}"><img src="${g.image}" alt="${escapeHtml(g.title)}"></button>`
              : `<span class="plate-placeholder-badge">Image placeholder</span>`}
          </div>
          <figcaption><strong>${escapeHtml(g.title)}</strong>${g.caption ? ` ${escapeHtml(g.caption)}` : ""}</figcaption>
        </figure>`).join("")}
    </div>`;
}

function mountInteractiveModule(svcId, catName, svcColor){
  const container = document.getElementById("doc-interactive");
  if(!container) return;
  const found = findInteractiveModule(svcId, catName);
  if(!found){
    container.hidden = true;
    container.innerHTML = "";
    plateUI = null;
    return;
  }
  container.hidden = false;
  container.style.setProperty("--svc", svcColor);
  plateUI = { kind: found.kind, data: found.data, plateIndex: 0, mode: "explore", exploreActive: null, quiz: null };
  renderInteractiveModule();
}

function renderInteractiveModule(){
  const container = document.getElementById("doc-interactive");
  if(!container || !plateUI) return;
  const { data } = plateUI;
  const kindLabel = plateUI.kind === "anatomy" ? "Interactive Anatomy" : "Interactive Imaging";

  const tabsHtml = data.plates.map((p,i) =>
    `<button class="plate-tab ${i===plateUI.plateIndex?'active':''}" data-plate-idx="${i}">${escapeHtml(p.title)}</button>`
  ).join("");

  container.innerHTML = `
    <div class="interactive-module">
      <span class="interactive-kind-badge">${kindLabel}</span>
      ${data.intro ? `<div class="interactive-intro">${data.intro}</div>` : ""}
      ${data.plates.length > 1 ? `<div class="plate-tabs">${tabsHtml}</div>` : ""}
      <div class="plate-mode-toggle">
        <button class="plate-mode-btn ${plateUI.mode==='explore'?'active':''}" data-mode="explore">Explore</button>
        <button class="plate-mode-btn ${plateUI.mode==='quiz'?'active':''}" data-mode="quiz">Quiz</button>
      </div>
      <div id="plate-body"></div>
    </div>
  `;

  container.querySelectorAll(".plate-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      plateUI.plateIndex = parseInt(btn.dataset.plateIdx, 10);
      plateUI.mode = "explore";
      plateUI.exploreActive = null;
      plateUI.quiz = null;
      renderInteractiveModule();
    });
  });
  container.querySelectorAll(".plate-mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      plateUI.mode = btn.dataset.mode;
      if(plateUI.mode === "quiz" && !plateUI.quiz) startPlateQuiz();
      container.querySelectorAll(".plate-mode-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === plateUI.mode));
      renderPlateBody();
    });
  });

  renderPlateBody();
}

function startPlateQuiz(){
  const plate = plateUI.data.plates[plateUI.plateIndex];
  plateUI.quiz = {
    order: shuffled(plate.hotspots.map(h => h.id)),
    index: 0,
    correct: 0,
    answered: false,
    selectedLabel: null,
  };
}

function renderPlateBody(){
  const body = document.getElementById("plate-body");
  if(!body || !plateUI) return;
  const plate = plateUI.data.plates[plateUI.plateIndex];

  let hotspotsHtml = "";
  if(plateUI.mode === "quiz"){
    const q = plateUI.quiz;
    if(q && q.index < q.order.length){
      const target = plate.hotspots.find(h => h.id === q.order[q.index]);
      if(target){
        hotspotsHtml = `<div class="hotspot-dot quiz-target" style="left:${target.x}%;top:${target.y}%"></div>`;
      }
    }
  } else {
    hotspotsHtml = plate.hotspots.map((h,i) =>
      `<button class="hotspot-dot ${plateUI.exploreActive===h.id?'active':''}" style="left:${h.x}%;top:${h.y}%" data-hotspot="${h.id}" aria-label="${escapeHtml(h.label)}">${i+1}</button>`
    ).join("");
  }

  const imageHtml = `
    <div class="plate-image-wrap style-${plate.style} ${plate.image ? 'has-image' : ''}">
      ${plate.image ? `<img class="plate-image" src="${plate.image}" alt="${escapeHtml(plate.title)}">` : `<span class="plate-placeholder-badge">Placeholder image</span>`}
      ${hotspotsHtml}
    </div>
    <div class="plate-caption">${escapeHtml(plate.caption)}</div>
  `;

  let belowHtml;
  if(plateUI.mode === "explore"){
    const active = plate.hotspots.find(h => h.id === plateUI.exploreActive);
    belowHtml = `
      <div class="plate-detail-box">
        ${active
          ? `<span class="d-label">${escapeHtml(active.label)}</span><div class="d-blurb">${escapeHtml(active.blurb)}</div>`
          : `<span class="plate-detail-empty">Click a numbered marker (or a label below) to learn that structure.</span>`}
      </div>
      <div class="plate-legend">
        ${plate.hotspots.map((h,i) =>
          `<button class="plate-legend-item ${plateUI.exploreActive===h.id?'active':''}" data-hotspot="${h.id}"><span class="num">${i+1}</span>${escapeHtml(h.label)}</button>`
        ).join("")}
      </div>
    `;
  } else {
    belowHtml = renderQuizPanel(plate);
  }

  body.innerHTML = imageHtml + belowHtml + plateGalleryHTML(plate.gallery || plateUI.data.gallery);

  body.querySelectorAll("[data-hotspot]").forEach((el) => {
    el.addEventListener("click", () => {
      plateUI.exploreActive = el.dataset.hotspot;
      renderPlateBody();
    });
  });

  if(plateUI.mode === "quiz") wireQuizPanel(plate);
}

function renderQuizPanel(plate){
  const q = plateUI.quiz;
  if(!q) return "";

  if(q.index >= q.order.length){
    return `
      <div class="quiz-summary">
        <div class="qs-score">${q.correct} / ${q.order.length}</div>
        <p>correct on this plate</p>
        <button class="btn-secondary" id="quiz-restart">Restart quiz</button>
      </div>
    `;
  }

  const target = plate.hotspots.find(h => h.id === q.order[q.index]);
  const choices = plateQuizChoices(q, plate, plateUI.data.plates, target);

  const choicesHtml = choices.map((label) => {
    let cls = "quiz-choice";
    if(q.answered){
      if(label === target.label) cls += " correct";
      else if(label === q.selectedLabel) cls += " incorrect";
    }
    return `<button class="${cls}" data-label="${escapeHtml(label)}" ${q.answered ? "disabled" : ""}>${escapeHtml(label)}</button>`;
  }).join("");

  return `
    <div class="quiz-progress">Question ${q.index+1} of ${q.order.length}</div>
    <div class="quiz-question">What structure is the highlighted marker on?</div>
    <div class="quiz-choices">${choicesHtml}</div>
    ${q.answered ? `<div class="quiz-feedback"><strong>${escapeHtml(target.label)}.</strong> ${escapeHtml(target.blurb)}</div>` : ""}
    <div class="quiz-footer">
      <span class="quiz-score">Score: ${q.correct} / ${q.index + (q.answered ? 1 : 0)}</span>
      ${q.answered ? `<button class="btn-primary" id="quiz-next">${q.index+1 < q.order.length ? "Next →" : "See results"}</button>` : ""}
    </div>
  `;
}

function wireQuizPanel(plate){
  const q = plateUI.quiz;
  if(!q) return;

  if(q.index >= q.order.length){
    const restartBtn = document.getElementById("quiz-restart");
    if(restartBtn) restartBtn.addEventListener("click", () => { startPlateQuiz(); renderPlateBody(); });
    return;
  }

  const target = plate.hotspots.find(h => h.id === q.order[q.index]);
  document.querySelectorAll(".quiz-choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      if(q.answered) return;
      q.answered = true;
      q.selectedLabel = btn.dataset.label;
      if(btn.dataset.label === target.label) q.correct++;
      renderPlateBody();
    });
  });
  const nextBtn = document.getElementById("quiz-next");
  if(nextBtn) nextBtn.addEventListener("click", () => {
    q.index++;
    q.answered = false;
    q.selectedLabel = null;
    renderPlateBody();
  });
}

/* ============================================================
   INLINE PLATE-GROUP WIDGETS
   (multiple independent explore/quiz anatomy or imaging plate
    groups embedded inline within a doc's own HTML, each mounted
    into a <div data-plate-group="key"></div> placeholder. Unlike
    the single global plateUI above, each instance keeps its own
    state via closure so several can coexist on one page.)
   ============================================================ */
function mountPlateGroup(container, data, kindLabel, svcColor){
  container.classList.add("interactive-module", "plate-group-inline");
  container.style.setProperty("--svc", svcColor);
  if(!data.plates || !data.plates.length){
    // Image-only group (no hotspots to explore or quiz): just the figures.
    container.classList.add("plate-group-static");
    container.innerHTML = (data.intro ? `<div class="interactive-intro">${data.intro}</div>` : "") + plateGalleryHTML(data.gallery);
    return;
  }
  const state = { plateIndex: 0, mode: "explore", exploreActive: null, quiz: null };

  function startQuiz(){
    const plate = data.plates[state.plateIndex];
    state.quiz = {
      order: shuffled(plate.hotspots.map(h => h.id)),
      index: 0, correct: 0, answered: false, selectedLabel: null,
    };
  }

  function renderQuiz(plate){
    const q = state.quiz;
    if(!q) return "";
    if(q.index >= q.order.length){
      return `
        <div class="quiz-summary">
          <div class="qs-score">${q.correct} / ${q.order.length}</div>
          <p>correct on this plate</p>
          <button class="btn-secondary" data-act="quiz-restart">Restart quiz</button>
        </div>
      `;
    }
    const target = plate.hotspots.find(h => h.id === q.order[q.index]);
    const choices = plateQuizChoices(q, plate, data.plates, target);
    const choicesHtml = choices.map((label) => {
      let cls = "quiz-choice";
      if(q.answered){
        if(label === target.label) cls += " correct";
        else if(label === q.selectedLabel) cls += " incorrect";
      }
      return `<button class="${cls}" data-label="${escapeHtml(label)}" ${q.answered ? "disabled" : ""}>${escapeHtml(label)}</button>`;
    }).join("");
    return `
      <div class="quiz-progress">Question ${q.index+1} of ${q.order.length}</div>
      <div class="quiz-question">What structure is the highlighted marker on?</div>
      <div class="quiz-choices">${choicesHtml}</div>
      ${q.answered ? `<div class="quiz-feedback"><strong>${escapeHtml(target.label)}.</strong> ${escapeHtml(target.blurb)}</div>` : ""}
      <div class="quiz-footer">
        <span class="quiz-score">Score: ${q.correct} / ${q.index + (q.answered ? 1 : 0)}</span>
        ${q.answered ? `<button class="btn-primary" data-act="quiz-next">${q.index+1 < q.order.length ? "Next →" : "See results"}</button>` : ""}
      </div>
    `;
  }

  function renderBody(){
    const bodyEl = container.querySelector(".plate-body");
    const plate = data.plates[state.plateIndex];

    let hotspotsHtml = "";
    if(state.mode === "quiz"){
      const q = state.quiz;
      if(q && q.index < q.order.length){
        const target = plate.hotspots.find(h => h.id === q.order[q.index]);
        if(target){
          hotspotsHtml = `<div class="hotspot-dot quiz-target" style="left:${target.x}%;top:${target.y}%"></div>`;
        }
      }
    } else {
      hotspotsHtml = plate.hotspots.map((h,i) =>
        `<button class="hotspot-dot ${state.exploreActive===h.id?'active':''}" style="left:${h.x}%;top:${h.y}%" data-hotspot="${h.id}" aria-label="${escapeHtml(h.label)}">${i+1}</button>`
      ).join("");
    }

    const imageHtml = `
      <div class="plate-image-wrap style-${plate.style} ${plate.image ? 'has-image' : ''}">
        ${plate.image ? `<img class="plate-image" src="${plate.image}" alt="${escapeHtml(plate.title)}">` : `<span class="plate-placeholder-badge">Placeholder image</span>`}
        ${hotspotsHtml}
      </div>
      <div class="plate-caption">${escapeHtml(plate.caption)}</div>
    `;

    let belowHtml;
    if(state.mode === "explore"){
      const active = plate.hotspots.find(h => h.id === state.exploreActive);
      belowHtml = `
        <div class="plate-detail-box">
          ${active
            ? `<span class="d-label">${escapeHtml(active.label)}</span><div class="d-blurb">${escapeHtml(active.blurb)}</div>`
            : `<span class="plate-detail-empty">Click a numbered marker (or a label below) to learn that structure.</span>`}
        </div>
        <div class="plate-legend">
          ${plate.hotspots.map((h,i) =>
            `<button class="plate-legend-item ${state.exploreActive===h.id?'active':''}" data-hotspot="${h.id}"><span class="num">${i+1}</span>${escapeHtml(h.label)}</button>`
          ).join("")}
        </div>
      `;
    } else {
      belowHtml = renderQuiz(plate);
    }

    bodyEl.innerHTML = imageHtml + belowHtml + plateGalleryHTML(plate.gallery || data.gallery);

    bodyEl.querySelectorAll("[data-hotspot]").forEach((el) => {
      el.addEventListener("click", () => { state.exploreActive = el.dataset.hotspot; renderBody(); });
    });
    if(state.mode === "quiz"){
      const q = state.quiz;
      if(q && q.index >= q.order.length){
        const restartBtn = bodyEl.querySelector('[data-act="quiz-restart"]');
        if(restartBtn) restartBtn.addEventListener("click", () => { startQuiz(); renderBody(); });
      } else if(q){
        const target = plate.hotspots.find(h => h.id === q.order[q.index]);
        bodyEl.querySelectorAll(".quiz-choice").forEach((btn) => {
          btn.addEventListener("click", () => {
            if(q.answered) return;
            q.answered = true;
            q.selectedLabel = btn.dataset.label;
            if(btn.dataset.label === target.label) q.correct++;
            renderBody();
          });
        });
        const nextBtn = bodyEl.querySelector('[data-act="quiz-next"]');
        if(nextBtn) nextBtn.addEventListener("click", () => { q.index++; q.answered = false; q.selectedLabel = null; renderBody(); });
      }
    }
  }

  function renderAll(){
    const tabsHtml = data.plates.map((p,i) =>
      `<button class="plate-tab ${i===state.plateIndex?'active':''}" data-plate-idx="${i}">${escapeHtml(p.title)}</button>`
    ).join("");
    container.innerHTML = `
      <span class="interactive-kind-badge">${escapeHtml(kindLabel)}</span>
      ${data.intro ? `<div class="interactive-intro">${data.intro}</div>` : ""}
      ${data.plates.length > 1 ? `<div class="plate-tabs">${tabsHtml}</div>` : ""}
      <div class="plate-mode-toggle">
        <button class="plate-mode-btn ${state.mode==='explore'?'active':''}" data-mode="explore">Explore</button>
        <button class="plate-mode-btn ${state.mode==='quiz'?'active':''}" data-mode="quiz">Quiz</button>
      </div>
      <div class="plate-body"></div>
    `;
    container.querySelectorAll(".plate-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.plateIndex = parseInt(btn.dataset.plateIdx, 10);
        state.mode = "explore"; state.exploreActive = null; state.quiz = null;
        renderAll();
      });
    });
    container.querySelectorAll(".plate-mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.mode = btn.dataset.mode;
        if(state.mode === "quiz" && !state.quiz) startQuiz();
        container.querySelectorAll(".plate-mode-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === state.mode));
        renderBody();
      });
    });
    renderBody();
  }

  renderAll();
}

function mountPlateGroupsIn(root, registry, kindLabel, svcColor){
  root.querySelectorAll("[data-plate-group]").forEach((el) => {
    const cfg = registry[el.dataset.plateGroup];
    if(cfg) mountPlateGroup(el, cfg, kindLabel, svcColor);
  });
}

/* ============================================================
   CASE-BASED PRACTICE MODULE
   (a linear wizard per case: one-liner, then a list of steps,
    each optionally with a real image or a schematic scene and an
    MCQ or fill-in question)
   ============================================================ */
const CASE_STORAGE_KEY = "radonc-companion-cases-v1";
let CASE_PROGRESS = {};
function loadCaseProgress(){
  try{ const raw = progressStore().getItem(CASE_STORAGE_KEY); CASE_PROGRESS = raw ? JSON.parse(raw) : {}; }catch(e){ CASE_PROGRESS = {}; }
}
function saveCaseProgress(){ try{ progressStore().setItem(CASE_STORAGE_KEY, JSON.stringify(CASE_PROGRESS)); }catch(e){} }
function isCaseDone(svcId, caseId){ return !!CASE_PROGRESS[svcId+"::"+caseId]; }
function markCaseDone(svcId, caseId){ CASE_PROGRESS[svcId+"::"+caseId] = true; saveCaseProgress(); }

function casesFor(svcId){
  return (typeof CASES !== "undefined" && CASES[svcId] && CASES[svcId].cases) ? CASES[svcId].cases : [];
}

function drawCaseScene(ctx, W, H, kase){
  const c = kase.scene;
  if(c.kind === "pelvis") drawPelvisScene(ctx, W, H);
  else if(c.kind === "brain") drawBrainSchematic(ctx, W, H);
  else if(c.kind === "spine") drawSpineSchematic(ctx, W, H);
  else if(c.kind === "abdomen") drawAbdomenSchematic(ctx, W, H);
  else drawChestSchematic(ctx, W, H);
  if(c.edema) drawSmoothBlob(ctx, ellipsePoints(c.edema.cx, c.edema.cy, c.edema.rx, c.edema.ry), { fill: "#c7d2cc", fillAlpha: 0.18 });
  if(c.node) drawSmoothBlob(ctx, ellipsePoints(c.node.cx, c.node.cy, c.node.rx, c.node.ry), { fill:"#e8c15a", stroke:"#c9a23e", lineWidth:1.5, fillAlpha:0.85 });
  if(c.primary) drawSmoothBlob(ctx, ellipsePoints(c.primary.cx, c.primary.cy, c.primary.rx, c.primary.ry), { fill:"#f2ecd9", stroke:"#d8d0b0", lineWidth:1.5 });
}

// A case is a list of steps. Newer case files list them directly
// (case.steps: [{ label, context?, image?, caption?, scene?, tag?, prompt?,
// choices? + correctIndex | answer, explanation }]); the original five-step
// cases (vignette MCQ, imaging, stage, treatment, dose) are converted here.
const CASE_STEP_LABELS = { vignette:"Vignette", imaging:"Imaging", stage:"Stage", treatment:"Treatment", dose:"Dose/Fx" };

function caseSteps(kase, svcId){
  if(kase.steps) return kase.steps;
  if(kase._steps) return kase._steps;
  const label = (svcId && CASES[svcId] && CASES[svcId].stepLabels) || {};
  const answerStep = (k, data) => ({ label: label[k] || CASE_STEP_LABELS[k], ...data });
  kase._steps = [
    { label: label.vignette || CASE_STEP_LABELS.vignette, prompt: kase.mcq.question, choices: kase.mcq.choices,
      correctIndex: kase.mcq.correctIndex, explanation: kase.mcq.explanation },
    { label: label.imaging || CASE_STEP_LABELS.imaging, chip: kase.imaging.modality, context: kase.imaging.findings, scene: kase.scene },
    answerStep("stage", kase.stage),
    answerStep("treatment", kase.treatmentPlan),
    answerStep("dose", kase.radDose),
  ];
  return kase._steps;
}

// Plain text used by site search (never the embedded image data).
function caseSearchText(kase, svcId){
  return [kase.title, kase.oneLiner].concat(caseSteps(kase, svcId).map(s =>
    [s.label, s.prompt, s.context, (s.choices || []).join(" "), s.answer, s.explanation, s.caption].filter(Boolean).join(" ")
  )).join(" ").replace(/<[^>]+>/g, " ");
}

let currentCasesSvcId = null;
let casesOrigin = "service"; // where the case list's back link returns: "service" page or the "hub"
let caseUI = null; // { svcId, idx, step, furthest, answers: { [stepIndex]: { value, revealed } } }

function openCaseList(svcId, origin){
  if(origin) casesOrigin = origin;
  currentCasesSvcId = svcId;
  currentServiceId = svcId;
  caseUI = null;
  renderCaseListView(svcId);
  showView("view-cases");
}

function openCaseStepper(svcId, idx){
  currentCasesSvcId = svcId;
  currentServiceId = svcId;
  caseUI = {
    svcId, idx, step: 0, furthest: 0, answers: {},
  };
  renderCaseStepper();
  showView("view-cases");
}

function renderCaseListView(svcId){
  const svc = SERVICES.find(s=>s.id===svcId);
  const data = (typeof CASES !== "undefined") ? CASES[svcId] : null;
  const cases = data ? data.cases : [];
  const doneCount = cases.filter(c => isCaseDone(svcId, c.id)).length;
  const wrap = document.getElementById("cases-wrap");
  wrap.innerHTML = `
    <div class="doc-header">
      <div class="doc-eyebrow" style="--svc:${svc.color}"><span class="dot" style="background:${svc.color}"></span>${escapeHtml(svc.name)}</div>
      <h2 class="doc-title" style="--svc:${svc.color}">Case-Based Practice</h2>
    </div>
    ${data && data.intro ? `<div class="interactive-intro" style="max-width:66ch;">${data.intro}</div>` : ""}
    <div class="case-progress-line">${doneCount} of ${cases.length} cases completed</div>
    <div class="hub-progress case-list-progress" style="--svc:${svc.color}"><div class="hub-progress-fill" style="width:${cases.length ? Math.round(100*doneCount/cases.length) : 0}%"></div></div>
    <div class="case-grid">
      ${cases.map((c,i) => `
        <button class="case-card ${isCaseDone(svcId,c.id) ? 'done' : ''}" data-case-idx="${i}" style="--svc:${svc.color}">
          <div class="case-card-top">
            <span class="case-card-num">${i+1}</span>
            ${c.level ? `<span class="case-card-level">${escapeHtml(c.level)}</span>` : ""}
            ${isCaseDone(svcId,c.id) ? `<span class="case-card-check">&#10003;</span>` : ""}
          </div>
          <div class="case-card-title">${escapeHtml(c.title)}</div>
          <div class="case-card-oneliner">${escapeHtml(c.oneLiner)}</div>
        </button>
      `).join("")}
    </div>
  `;
  wrap.querySelectorAll("[data-case-idx]").forEach(btn=>{
    btn.addEventListener("click", () => openCaseStepper(svcId, parseInt(btn.dataset.caseIdx,10)));
  });
  const backBtn = document.getElementById("btn-back-from-cases");
  backBtn.textContent = casesOrigin === "hub" ? "← All case sites" : `← ${svc.name}`;
  backBtn.onclick = () => casesOrigin === "hub" ? openCasesHub() : openService(svcId);
}

function caseStepFooter(canContinue, isLast){
  return `<div class="case-step-footer">
    ${caseUI.step>0 ? `<button class="btn-secondary" id="case-btn-prev">&larr; Previous</button>` : `<span></span>`}
    <button class="btn-primary" id="case-btn-next" ${canContinue?"":"disabled"}>${isLast ? "Finish case" : "Continue →"}</button>
  </div>`;
}

function caseAnswer(i){
  return caseUI.answers[i] || (caseUI.answers[i] = { value: "", revealed: false });
}

function caseFigureHtml(s){
  if(s.image) return `
    <figure class="case-figure">
      <img src="${s.image}" alt="${escapeHtml(s.alt || s.caption || s.label)}" loading="lazy">
      ${s.caption ? `<figcaption>${escapeHtml(s.caption)}</figcaption>` : ""}
    </figure>`;
  if(s.scene) return `<div class="plate-image-wrap style-ct case-scene"><canvas width="460" height="360"></canvas></div>`;
  return "";
}

function caseStepHtml(kase, s, i, isLast){
  const a = caseAnswer(i);
  let question = "", canContinue = true;
  if(s.choices){
    const choicesHtml = s.choices.map((choice, j) => {
      let cls = "quiz-choice";
      if(a.revealed){
        if(j === s.correctIndex) cls += " correct";
        else if(j === a.value) cls += " incorrect";
      }
      return `<button class="${cls}" data-answer-idx="${j}" ${a.revealed?"disabled":""}>${escapeHtml(choice)}</button>`;
    }).join("");
    question = `
      <div class="case-answer-prompt">${escapeHtml(s.prompt)}</div>
      <div class="quiz-choices">${choicesHtml}</div>
      ${a.revealed ? `<div class="quiz-feedback"><strong>${escapeHtml(s.choices[s.correctIndex])}.</strong> ${escapeHtml(s.explanation || "")}</div>` : ""}`;
    canContinue = a.revealed;
  } else if(s.answer){
    question = `
      <div class="case-answer-prompt">${escapeHtml(s.prompt)}</div>
      <textarea class="case-answer-input" id="case-answer-textarea" rows="2" placeholder="Type your answer&hellip;" ${a.revealed?"disabled":""}>${escapeHtml(a.value || "")}</textarea>
      ${a.revealed ? `
        <div class="case-answer-reveal">
          <span class="case-answer-reveal-label">Answer</span>
          <div class="case-answer-correct">${escapeHtml(s.answer)}</div>
          ${s.explanation ? `<div class="case-answer-explanation">${escapeHtml(s.explanation)}</div>` : ""}
        </div>
      ` : `<button class="btn-primary case-check-btn" id="case-check-btn">Check answer</button>`}`;
    canContinue = a.revealed;
  }
  return `
    ${i === 0 ? `<div class="case-oneliner"><span class="case-oneliner-label">One-Liner</span>${escapeHtml(kase.oneLiner)}</div>` : ""}
    ${s.chip || s.tag ? `<div class="case-chips">${s.chip ? `<span class="chip">${escapeHtml(s.chip)}</span>` : ""}${s.tag ? `<span class="case-tag">${escapeHtml(s.tag)}</span>` : ""}</div>` : ""}
    ${s.context && !s.scene ? `<div class="case-findings">${s.context}</div>` : ""}
    ${caseFigureHtml(s)}
    ${s.context && s.scene ? `<div class="case-findings">${s.context}</div>` : ""}
    ${question}
    ${caseStepFooter(canContinue, isLast)}
  `;
}

function renderCaseStepper(){
  const { svcId, idx } = caseUI;
  const svc = SERVICES.find(s=>s.id===svcId);
  const cases = casesFor(svcId);
  const kase = cases[idx];
  const wrap = document.getElementById("cases-wrap");

  const stepsHtml = caseSteps(kase, svcId).map((s,i) => `
    <button class="case-step-dot ${i===caseUI.step?'active':''} ${i<caseUI.furthest?'done':''}" data-step="${i}" ${i>caseUI.furthest?'disabled':''}>
      <span class="csd-num">${i+1}</span>${escapeHtml(s.label)}
    </button>
  `).join("");

  wrap.innerHTML = `
    <div class="doc-header">
      <div class="doc-eyebrow" style="--svc:${svc.color}"><span class="dot" style="background:${svc.color}"></span>${escapeHtml(svc.name)} &middot; Case ${idx+1} of ${cases.length}${kase.level ? ` &middot; ${escapeHtml(kase.level)}` : ""}</div>
      <h2 class="doc-title" style="--svc:${svc.color}">${escapeHtml(kase.title)}</h2>
    </div>
    <div class="case-steps" style="--svc:${svc.color}">${stepsHtml}</div>
    <div id="case-step-body" class="case-step-body" style="--svc:${svc.color}"></div>
  `;

  wrap.querySelectorAll(".case-step-dot").forEach(btn=>{
    btn.addEventListener("click", () => {
      const i = parseInt(btn.dataset.step,10);
      if(i <= caseUI.furthest && i !== caseUI.step){ caseUI.step = i; renderCaseStepper(); }
    });
  });

  document.getElementById("btn-back-from-cases").textContent = "← Case list";
  document.getElementById("btn-back-from-cases").onclick = () => openCaseList(svcId);

  renderCaseStepBody();
}

function renderCaseStepBody(){
  const { svcId, idx, step } = caseUI;
  const kase = casesFor(svcId)[idx];
  const steps = caseSteps(kase, svcId);
  const s = steps[step];
  const isLast = step === steps.length-1;
  const body = document.getElementById("case-step-body");
  body.innerHTML = caseStepHtml(kase, s, step, isLast);

  const prevBtn = document.getElementById("case-btn-prev");
  if(prevBtn) prevBtn.addEventListener("click", () => { caseUI.step--; renderCaseStepper(); });
  const nextBtn = document.getElementById("case-btn-next");
  if(nextBtn) nextBtn.addEventListener("click", () => {
    if(isLast){
      markCaseDone(svcId, kase.id);
      renderCaseCompleteScreen();
      updateTopNav();
    } else {
      caseUI.step++;
      caseUI.furthest = Math.max(caseUI.furthest, caseUI.step);
      renderCaseStepper();
      const top = document.getElementById("cases-wrap");
      if(top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: "start" });
    }
  });

  const canvas = body.querySelector(".case-scene canvas");
  if(canvas) drawCaseScene(canvas.getContext("2d"), canvas.width, canvas.height, { scene: s.scene });

  const a = caseAnswer(step);
  const textarea = document.getElementById("case-answer-textarea");
  if(textarea) textarea.addEventListener("input", () => { a.value = textarea.value; });
  const checkBtn = document.getElementById("case-check-btn");
  if(checkBtn) checkBtn.addEventListener("click", () => {
    a.revealed = true;
    renderCaseStepBody();
  });
  body.querySelectorAll("[data-answer-idx]").forEach(btn => btn.addEventListener("click", () => {
    if(a.revealed) return;
    a.value = parseInt(btn.dataset.answerIdx, 10);
    a.revealed = true;
    renderCaseStepBody();
  }));
}

function renderCaseCompleteScreen(){
  const { svcId, idx } = caseUI;
  const cases = casesFor(svcId);
  const isLastCase = idx === cases.length-1;
  const wrap = document.getElementById("cases-wrap");
  wrap.innerHTML = `
    <div class="complete-wrap" style="padding-top:40px;">
      <div class="complete-icon">&#10003;</div>
      <h2>Case complete</h2>
      <p>You've worked through every step of &ldquo;${escapeHtml(cases[idx].title)}.&rdquo;</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:10px;">
        <button class="btn-secondary" id="case-btn-list">Back to case list</button>
        ${!isLastCase ? `<button class="btn-primary" id="case-btn-next-case">Next case &rarr;</button>` : ""}
      </div>
    </div>
  `;
  document.getElementById("case-btn-list").addEventListener("click", () => openCaseList(svcId));
  const nextCaseBtn = document.getElementById("case-btn-next-case");
  if(nextCaseBtn) nextCaseBtn.addEventListener("click", () => openCaseStepper(svcId, idx+1));
  document.getElementById("btn-back-from-cases").textContent = "← Case list";
  document.getElementById("btn-back-from-cases").onclick = () => openCaseList(svcId);
}

/* ============================================================
   STUDY SESSION
   ============================================================ */
let session = { queue: [], index: 0, reviewedCount: 0, againCount: 0, flipped: false, contextLabel:"", returnTo:null, scope:{ svcId:null, catName:null }, added:null };

// returnTo "decks": the Exit button lands on the Flashcards page (top-nav flow);
// otherwise it goes back to the service page or dashboard as before.
function startStudySession(svcId, catName, returnTo){
  session.returnTo = returnTo || null;
  session.scope = { svcId, catName };
  session.added = null;
  let pool;
  if(svcId === null){
    pool = allCards().filter(c => isDue(c.id));
    session.contextLabel = "All Due Cards";
  } else if(catName === null){
    pool = svcCards(svcId).filter(c => isDue(c.id)).map(c=>({...c, service:svcId}));
    session.contextLabel = svcMeta(svcId).name;
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

// Anki-style cloze card: the question stays put; "[...]" sits two lines below
// it and is swapped for the answer on reveal, with the "extra" note one line
// further down. Used by both the full study view and the quick panel.
function ankiCardHTML(card, svc, revealed){
  const extra = revealed && card.extra
    ? `<div class="anki-extra">${escapeHtml(card.extra)}</div>` : "";
  return `
    <div class="card-cat-tag" style="color:${svc.color};background:color-mix(in srgb, ${svc.color} 14%, transparent)">${escapeHtml(card.category)}</div>
    <div class="anki-card">
      <div class="anki-q">${escapeHtml(card.front)}</div>
      ${revealed
        ? `<div class="anki-a">${escapeHtml(card.back)}</div>${extra}`
        : `<div class="anki-a anki-blank">[...]</div>`}
    </div>`;
}

function renderStudyCard(){
  const card = session.queue[session.index];
  const svc = svcMeta(card.service);
  const flashcard = document.getElementById("flashcard");
  session.flipped = false;
  flashcard.classList.remove("revealed");
  flashcard.style.setProperty("--svc", svc.color);
  flashcard.innerHTML = ankiCardHTML(card, svc, false);

  document.getElementById("reveal-prompt").style.display = "";
  document.getElementById("rate-row").style.display = "none";

  const pct = Math.round(100*session.index/session.queue.length);
  document.getElementById("study-progress-fill").style.width = pct+"%";
  document.getElementById("study-count").textContent = `${session.index+1} / ${session.queue.length}`;
}

// Reveal only (no un-flip): like Anki, once the answer is shown it stays shown.
function flipCard(){
  if(session.flipped) return;
  const card = session.queue[session.index];
  const svc = svcMeta(card.service);
  const flashcard = document.getElementById("flashcard");
  session.flipped = true;
  flashcard.classList.add("revealed");
  flashcard.innerHTML = ankiCardHTML(card, svc, true);
  document.getElementById("reveal-prompt").style.display = "none";
  document.getElementById("rate-row").style.display = "grid";
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

function exitStudy(){
  renderDashboard();
  if(session.returnTo === "decks") openDecks();
  else if(currentServiceId) openService(currentServiceId);
  else showView("view-dashboard");
}

// Anki "suspend card": pull it from this session and from future due counts.
function suspendCurrentCard(){
  const card = session.queue[session.index];
  if(!card) return;
  setSuspended([card.id], true);
  session.queue.splice(session.index, 1);
  if(session.index >= session.queue.length) finishSession();
  else renderStudyCard();
  renderDashboard();
}

function finishSession(){
  document.getElementById("study-active").style.display = "none";
  document.getElementById("study-complete").style.display = "";
  document.getElementById("study-progress-fill").style.width = session.queue.length ? "100%" : "0%";
  document.getElementById("study-count").textContent = `${session.queue.length} / ${session.queue.length}`;
  document.getElementById("complete-reviewed").textContent = session.reviewedCount;
  document.getElementById("complete-again").textContent = session.againCount;
  renderCompleteOptions();
  renderDashboard();
}

// Every card in the session's scope (one section, one disease site, or all).
function sessionScopeCards(){
  const { svcId, catName } = session.scope;
  if(svcId === null) return allCards();
  const cards = svcCards(svcId);
  return catName === null ? cards : cards.filter(c => c.category === catName);
}

// The end-of-session screen. When nothing was due because the section is
// suspended, offer to unsuspend it right here, then to study just those
// cards or everything the student has active.
function renderCompleteOptions(){
  const empty = session.queue.length === 0;
  const label = session.contextLabel;
  const isAll = session.scope.svcId === null;
  const scope = sessionScopeCards();
  const suspendedIds = scope.filter(c => isSuspended(c.id)).map(c => c.id);
  const allDue = totalDue();
  const titleEl = document.getElementById("complete-title");
  const msgEl = document.getElementById("complete-msg");
  const doneBtn = document.getElementById("btn-complete-done");
  const studyAllBtn = (primary) => allDue
    ? `<button class="${primary ? "btn-primary" : "btn-secondary"}" data-complete="study-all">Study all my cards <span class="count-pill">${allDue}</span></button>` : "";
  let title = "Session complete", msg, actions = "";

  if(session.added){
    const addedDue = session.added.filter(id => isDue(id)).length;
    title = "Cards added";
    msg = `${session.added.length} card${session.added.length === 1 ? "" : "s"} from "${label}" ${session.added.length === 1 ? "is" : "are"} now in your reviews.`
      + (addedDue ? "" : " None are due today; they'll come back on their scheduled day.");
    actions = (addedDue ? `<button class="btn-primary" data-complete="study-these">Study just these <span class="count-pill">${addedDue}</span></button>` : "")
      + studyAllBtn(!addedDue);
  } else if(empty && suspendedIds.length && !isAll){
    title = "These cards are suspended";
    msg = suspendedIds.length === scope.length
      ? `All ${scope.length} cards in "${label}" are suspended, so none of them come up for review yet. Unsuspend them to add them to your reviews.`
      : `${suspendedIds.length} of the ${scope.length} cards in "${label}" are suspended and nothing else here is due. Unsuspend them to add them to your reviews.`;
    actions = `<button class="btn-primary" data-complete="unsuspend">Unsuspend these ${suspendedIds.length} cards</button>` + studyAllBtn(false);
  } else if(empty){
    title = "Nothing due";
    msg = isAll && suspendedIds.length === scope.length
      ? "All of your cards are suspended. Choose the decks you want in your reviews on the Flashcards page."
      : `No cards are due in "${label}" right now. Check back later or study another set.`;
    actions = isAll ? `<button class="btn-primary" data-complete="decks">Choose flashcard decks</button>` : studyAllBtn(true);
  } else {
    msg = `You've reviewed every due card in "${label}".`;
    if(!isAll) actions = studyAllBtn(true);
  }

  titleEl.textContent = title;
  msgEl.textContent = msg;
  // The checkmark is for finished sessions and freshly added cards only.
  document.getElementById("complete-icon").style.display = empty && !session.added ? "none" : "";
  document.getElementById("complete-stats").style.display = empty ? "none" : "";
  const actionsEl = document.getElementById("complete-actions");
  actionsEl.innerHTML = actions;
  actionsEl.style.display = actions ? "" : "none";
  doneBtn.textContent = session.returnTo === "decks" ? "Back to flashcards" : "Done";
  doneBtn.className = actions ? "btn-secondary" : "btn-primary";

  actionsEl.querySelectorAll("[data-complete]").forEach(btn => btn.addEventListener("click", () => {
    const what = btn.dataset.complete;
    if(what === "unsuspend"){
      setSuspended(suspendedIds, false);
      session.added = suspendedIds;
      renderCompleteOptions();
      renderDashboard();
    }
    else if(what === "study-these") startStudySession(session.scope.svcId, session.scope.catName, session.returnTo);
    else if(what === "study-all") startStudySession(null, null, session.returnTo);
    else if(what === "decks") openDecks();
  }));
}

/* ============================================================
   VIEW SWITCHING
   ============================================================ */
function showView(id){
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active","view-enter"));
  const next = document.getElementById(id);
  next.classList.add("active");
  if(!REDUCED_MOTION){
    next.classList.add("view-enter");
    next.addEventListener("animationend", () => next.classList.remove("view-enter"), { once:true });
  }
  window.scrollTo({top:0, behavior:"instant"});
  updateSidebarActive();
  updateTopNav();
  updateGuestBar();
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
   SIDEBAR OPEN / CLOSE
   ============================================================ */
const SIDEBAR_W = 264;
let sidebarOpen = false;

function isNarrowViewport(){ return window.matchMedia("(max-width: 900px)").matches; }

function updateScrim(){
  document.getElementById("scrim").classList.toggle("show", sidebarOpen || flashOpen);
}
function openSidebar(){
  sidebarOpen = true;
  document.documentElement.style.setProperty("--sidebar-w", SIDEBAR_W + "px");
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("sidebar-toggle").setAttribute("aria-expanded", "true");
  updateScrim();
}
function closeSidebar(){
  sidebarOpen = false;
  document.documentElement.style.setProperty("--sidebar-w", "0px");
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebar-toggle").setAttribute("aria-expanded", "false");
  updateScrim();
}
function toggleSidebar(){ sidebarOpen ? closeSidebar() : openSidebar(); }
function closeSidebarIfNarrow(){ if(isNarrowViewport()) closeSidebar(); }
document.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && sidebarOpen && isNarrowViewport()){ closeSidebar(); document.getElementById("sidebar-toggle").focus(); }
});

/* ============================================================
   QUICK FLASHCARDS PANEL (open/close, drag-to-resize, mini SRS UI)
   ============================================================ */
const FLASH_MIN_W = 300, FLASH_MAX_W = 640, FLASH_DEFAULT_W = 380;
let flashOpen = false;
let flashWidth = FLASH_DEFAULT_W;
let panelSession = { queue: [], index: 0, flipped: false };

try{
  const savedW = parseInt(localStorage.getItem("radonc-flash-w"), 10);
  if(!isNaN(savedW)) flashWidth = Math.max(FLASH_MIN_W, Math.min(FLASH_MAX_W, savedW));
}catch(e){}

function setFlashWidth(px){
  flashWidth = Math.max(FLASH_MIN_W, Math.min(FLASH_MAX_W, px));
  if(flashOpen) document.documentElement.style.setProperty("--flash-w", flashWidth + "px");
}

function openFlashPanel(){
  flashOpen = true;
  document.getElementById("flash-panel").classList.add("open");
  document.documentElement.style.setProperty("--flash-w", flashWidth + "px");
  document.getElementById("flash-ball").setAttribute("aria-expanded", "true");
  updateScrim();
  if(!panelSession.queue.length || panelSession.index >= panelSession.queue.length) buildPanelQueue();
  else renderPanelCard();
}
function closeFlashPanel(){
  flashOpen = false;
  document.getElementById("flash-panel").classList.remove("open");
  document.documentElement.style.setProperty("--flash-w", "0px");
  document.getElementById("flash-ball").setAttribute("aria-expanded", "false");
  updateScrim();
  try{ localStorage.setItem("radonc-flash-w", String(flashWidth)); }catch(e){}
}
function toggleFlashPanel(){ flashOpen ? closeFlashPanel() : openFlashPanel(); }

function buildPanelQueue(){
  let pool = allCards().filter(c => isDue(c.id));
  for(let i=pool.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [pool[i],pool[j]] = [pool[j],pool[i]];
  }
  panelSession = { queue: pool, index: 0, flipped: false };
  renderPanelCard();
}

function renderPanelCard(){
  const body = document.getElementById("flash-panel-body");
  if(!body) return;
  if(panelSession.index >= panelSession.queue.length){
    body.innerHTML = `<div class="empty-state"><div class="e-icon">✓</div>All caught up here.<br>No due cards right now.</div>`;
    return;
  }
  const card = panelSession.queue[panelSession.index];
  const svc = svcMeta(card.service);
  panelSession.flipped = false;
  body.innerHTML = `
    <div class="panel-progress-row">
      <div class="study-progress-track"><div class="study-progress-fill" style="width:${Math.round(100*panelSession.index/panelSession.queue.length)}%"></div></div>
      <div class="study-count tabular">${panelSession.index+1} / ${panelSession.queue.length}</div>
    </div>
    <div class="card-stage panel-card-stage">
      <div class="flashcard panel-flashcard" id="panel-flashcard" role="button" tabindex="0" style="--svc:${svc.color}">${ankiCardHTML(card, svc, false)}</div>
    </div>
    <div id="panel-reveal-prompt" class="reveal-hint">Click the card (or press Space) to reveal</div>
    <div id="panel-rate-row" class="rate-row" style="display:none;">
      <button class="rate-btn again" data-rating="again"><span class="rate-key">1</span><span class="rate-label">Again</span><span class="rate-sub">&lt;1 day</span></button>
      <button class="rate-btn hard" data-rating="hard"><span class="rate-key">2</span><span class="rate-label">Hard</span><span class="rate-sub">2 days</span></button>
      <button class="rate-btn good" data-rating="good"><span class="rate-key">3</span><span class="rate-label">Good</span><span class="rate-sub">4 days</span></button>
      <button class="rate-btn easy" data-rating="easy"><span class="rate-key">4</span><span class="rate-label">Easy</span><span class="rate-sub">9 days</span></button>
    </div>
  `;
  document.getElementById("panel-flashcard").addEventListener("click", revealPanelCard);
  body.querySelectorAll("#panel-rate-row .rate-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      ratePanelCard(btn.dataset.rating);
    });
  });
}

function revealPanelCard(){
  if(panelSession.flipped || panelSession.index >= panelSession.queue.length) return;
  const card = panelSession.queue[panelSession.index];
  const svc = svcMeta(card.service);
  const fc = document.getElementById("panel-flashcard");
  panelSession.flipped = true;
  fc.classList.add("revealed");
  fc.innerHTML = ankiCardHTML(card, svc, true);
  document.getElementById("panel-reveal-prompt").style.display = "none";
  document.getElementById("panel-rate-row").style.display = "grid";
}

function ratePanelCard(rating){
  const card = panelSession.queue[panelSession.index];
  rateCard(card.id, rating);
  panelSession.index++;
  panelSession.flipped = false;
  renderPanelCard();
  renderDashboard();
}

/* ============================================================
   LIGHTBOX (gallery images are embedded data URIs, which browsers
   won't open in a new tab, so enlarge them in-page instead)
   ============================================================ */
function openLightbox(src, title, caption){
  const box = document.getElementById("lightbox");
  box.querySelector("img").src = src;
  box.querySelector("img").alt = title;
  box.querySelector(".lightbox-title").textContent = title;
  const cap = box.querySelector(".lightbox-caption");
  cap.textContent = caption || "";
  cap.hidden = !caption;
  box.hidden = false;
  box.querySelector(".lightbox-close").focus();
}
function closeLightbox(){ document.getElementById("lightbox").hidden = true; }

/* ============================================================
   INIT / EVENT WIRING
   ============================================================ */
function init(){
  loadProfile();
  loadAllProgress();

  let savedTheme = "system";
  try{ savedTheme = localStorage.getItem("radonc-theme") || "system"; }catch(e){}
  setTheme(savedTheme);
  document.getElementById("theme-light").addEventListener("click", ()=>setTheme("light"));
  document.getElementById("theme-system").addEventListener("click", ()=>setTheme("system"));
  document.getElementById("theme-dark").addEventListener("click", ()=>setTheme("dark"));

  document.getElementById("btn-study-all").addEventListener("click", onNavCards);
  document.getElementById("btn-back-dashboard").addEventListener("click", ()=> goHome("disease-sites"));
  document.getElementById("btn-back-from-doc").addEventListener("click", ()=>{
    if(currentDoc.kind === "background"){ renderDashboard(); showView("view-dashboard"); }
    else if(currentDoc.svcId){ openService(currentDoc.svcId); } else { renderDashboard(); showView("view-dashboard"); }
  });
  document.getElementById("btn-bg-prev").addEventListener("click", ()=>{
    if(currentDoc.kind === "disease"){
      const cats = docCategoriesFor(currentDoc.svcId).filter(c => DOCS[currentDoc.svcId] && DOCS[currentDoc.svcId][c]);
      const idx = cats.indexOf(currentDoc.catName);
      if(idx > 0) openDoc(currentDoc.svcId, cats[idx-1]);
      return;
    }
    const idx = BACKGROUND.findIndex(s=>s.id===currentDoc.bgId);
    if(idx > 0) openBackground(BACKGROUND[idx-1].id);
  });
  document.getElementById("btn-bg-next").addEventListener("click", ()=>{
    if(currentDoc.kind === "disease"){
      const cats = docCategoriesFor(currentDoc.svcId).filter(c => DOCS[currentDoc.svcId] && DOCS[currentDoc.svcId][c]);
      const idx = cats.indexOf(currentDoc.catName);
      if(idx < cats.length-1) openDoc(currentDoc.svcId, cats[idx+1]);
      else if(casesFor(currentDoc.svcId).length) openCaseList(currentDoc.svcId, "service");
      else openService(currentDoc.svcId);
      return;
    }
    const idx = BACKGROUND.findIndex(s=>s.id===currentDoc.bgId);
    if(idx < BACKGROUND.length-1) openBackground(BACKGROUND[idx+1].id);
    else { renderDashboard(); showView("view-dashboard"); }
  });
  document.getElementById("btn-doc-next-top").addEventListener("click", ()=> document.getElementById("btn-bg-next").click());
  document.getElementById("btn-study-from-doc").addEventListener("click", ()=> startStudySession(currentDoc.svcId, currentDoc.catName));
  document.getElementById("btn-study-from-doc-2").addEventListener("click", ()=> startStudySession(currentDoc.svcId, currentDoc.catName));
  document.addEventListener("click", (e) => {
    const opener = e.target.closest && e.target.closest("[data-lightbox]");
    if(opener) openLightbox(opener.dataset.lightbox, opener.dataset.lightboxTitle || "", opener.dataset.lightboxCaption || "");
  });
  document.getElementById("lightbox").addEventListener("click", (e) => {
    if(e.target.id === "lightbox" || e.target.closest(".lightbox-close")) closeLightbox();
  });
  document.addEventListener("keydown", (e) => { if(e.key === "Escape") closeLightbox(); });
  document.getElementById("btn-exit-study").addEventListener("click", exitStudy);
  document.getElementById("btn-complete-done").addEventListener("click", exitStudy);
  document.getElementById("btn-suspend-card").addEventListener("click", suspendCurrentCard);

  // --- Top nav ---
  document.getElementById("brand-home").addEventListener("click", ()=> goHome());
  document.getElementById("btn-back-from-decks").addEventListener("click", ()=>{ renderDashboard(); showView("view-dashboard"); });
  document.getElementById("btn-back-from-cases-hub").addEventListener("click", ()=>{ renderDashboard(); showView("view-dashboard"); });
  document.getElementById("flashcard").addEventListener("click", flipCard);
  document.querySelectorAll(".rate-btn").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      e.stopPropagation();
      handleRate(btn.dataset.rating);
    });
  });

  // Anki keys: Space/Enter reveals, 1-4 = Again/Hard/Good/Easy once revealed.
  // The full study view takes priority; otherwise the quick panel listens while open.
  const RATING_KEYS = { "1":"again", "2":"hard", "3":"good", "4":"easy" };
  document.addEventListener("keydown", (e)=>{
    if(e.metaKey || e.ctrlKey || e.altKey) return;
    if(e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
    const isReveal = e.code === "Space" || e.key === "Enter";
    const rating = RATING_KEYS[e.key];
    const studyActive = document.getElementById("view-study").classList.contains("active")
      && document.getElementById("study-active").style.display !== "none";
    if(studyActive){
      if(isReveal){ e.preventDefault(); flipCard(); }
      else if(rating && session.flipped) handleRate(rating);
      return;
    }
    if(flashOpen && document.getElementById("panel-flashcard")){
      if(isReveal && !panelSession.flipped){ e.preventDefault(); revealPanelCard(); }
      else if(rating && panelSession.flipped) ratePanelCard(rating);
    }
  });

  wireHomeControls();
  wireSearchUI();
  wireMegaMenus();
  // every [data-go] link (header, footer, home sections, pages)
  document.addEventListener("click", (e) => {
    const link = e.target.closest && e.target.closest("[data-go]");
    if(!link) return;
    e.preventDefault();
    navTo(link.dataset.go);
  });
  wireAccount();

  // --- Sidebar ---
  document.getElementById("sidebar-toggle").addEventListener("click", toggleSidebar);
  document.getElementById("sidebar-close").addEventListener("click", closeSidebar);

  // --- Quick flashcards panel ---
  document.getElementById("flash-panel-close").addEventListener("click", closeFlashPanel);

  document.getElementById("scrim").addEventListener("click", () => { closeSidebar(); closeFlashPanel(); });

  // Drag strip along the panel's left edge: resize only (panel must already be open)
  const dragStrip = document.getElementById("flash-panel-drag");
  let stripDragging = false, stripStartX = 0, stripStartWidth = 0;
  dragStrip.addEventListener("pointerdown", (e) => {
    stripDragging = true;
    stripStartX = e.clientX;
    stripStartWidth = flashWidth;
    document.getElementById("flash-panel").classList.add("resizing");
    dragStrip.setPointerCapture(e.pointerId);
  });
  dragStrip.addEventListener("pointermove", (e) => {
    if(!stripDragging) return;
    setFlashWidth(stripStartWidth - (e.clientX - stripStartX));
  });
  const endStripDrag = () => {
    if(!stripDragging) return;
    stripDragging = false;
    document.getElementById("flash-panel").classList.remove("resizing");
    try{ localStorage.setItem("radonc-flash-w", String(flashWidth)); }catch(e){}
  };
  dragStrip.addEventListener("pointerup", endStripDrag);
  dragStrip.addEventListener("pointercancel", endStripDrag);

  // Floating ball: plain click toggles the panel; dragging it left/right resizes the panel
  const ball = document.getElementById("flash-ball");
  let ballDragging = false, ballMoved = false, ballStartX = 0, ballStartWidth = 0;
  ball.addEventListener("pointerdown", (e) => {
    ballDragging = true;
    ballMoved = false;
    ballStartX = e.clientX;
    ballStartWidth = flashWidth;
    ball.setPointerCapture(e.pointerId);
  });
  ball.addEventListener("pointermove", (e) => {
    if(!ballDragging) return;
    const dx = e.clientX - ballStartX;
    if(Math.abs(dx) > 4){
      if(!ballMoved){
        ballMoved = true;
        ball.classList.add("dragging");
        document.getElementById("flash-panel").classList.add("resizing");
        if(!flashOpen) openFlashPanel();
      }
      setFlashWidth(ballStartWidth - dx);
    }
  });
  const endBallDrag = (e) => {
    if(!ballDragging) return;
    ballDragging = false;
    ball.classList.remove("dragging");
    document.getElementById("flash-panel").classList.remove("resizing");
    if(!ballMoved){
      toggleFlashPanel();
    } else {
      try{ localStorage.setItem("radonc-flash-w", String(flashWidth)); }catch(err){}
    }
  };
  ball.addEventListener("pointerup", endBallDrag);
  ball.addEventListener("pointercancel", endBallDrag);

  renderDashboard();
}
init();
