(() => {
const LV_BOX = document.getElementById("list-lv");
const TR_BOX = document.getElementById("list-tr");
const SCORE = document.getElementById("score");
const BTN_NEW = document.getElementById("btn-new");
const BTN_SPEAK = document.getElementById("btn-speak");
const HELP = document.getElementById("help");

let data = [];
let current = [];
let speakOn = false;
let score = { right: 0, wrong: 0 };
let sel = { lv: null, tr: null };

// Utils
const rand = (n) => Math.floor(Math.random() * n);
const shuffled = (arr) => arr.map(v => [Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(([_,v])=>v);

function announceStatus() {
SCORE.textContent = `Pareizi: ${score.right} | Nepareizi: ${score.wrong}`;
}

function cardHTML(text, key, list) {
const id = `${list}-${key}`;
return `<div class="word-card" role="option" tabindex="0" id="${id}" data-key="${key}" data-list="${list}" aria-pressed="false" aria-disabled="false">${text}</div>` ;
}

function renderRound(items) {
LV_BOX.innerHTML = "";
TR_BOX.innerHTML = "";

const lv = items.map((it, idx) => ({ key: idx, text: it.lv }));
const tr = items.map((it, idx) => ({ key: idx, text: it.eng || it.ru }));

const lvHTML = lv.map(o => cardHTML(o.text, o.key, "lv")).join("");
const trHTML = shuffled(tr).map(o => cardHTML(o.text, o.key, "tr")).join("");

LV_BOX.innerHTML = lvHTML;
TR_BOX.innerHTML = trHTML;

// Focus the first LV card for keyboard users
const first = LV_BOX.querySelector(".word-card");
if (first) first.focus();
}

function speakLV(text) {
if (!speakOn || !("speechSynthesis" in window)) return;
const u = new SpeechSynthesisUtterance(text);
u.lang = "lv-LV";
window.speechSynthesis.speak(u);
}

function clearSelections() {
sel.lv = null; sel.tr = null;
LV_BOX.querySelectorAll(".word-card[aria-pressed='true']").forEach(el => {
el.setAttribute("aria-pressed", "false");
el.classList.remove("selected");
});
TR_BOX.querySelectorAll(".word-card[aria-pressed='true']").forEach(el => {
el.setAttribute("aria-pressed", "false");
el.classList.remove("selected");
});
}

function disablePair(key) {
document.querySelectorAll(`.word-card[data-key="${key}"]`).forEach(el => {
el.setAttribute("aria-disabled", "true");
el.setAttribute("tabindex", "-1");
el.classList.remove("selected");
el.setAttribute("aria-pressed", "false");
});
}

function handleSelect(el) {
if (el.getAttribute("aria-disabled") === "true") return;

const list = el.dataset.list; // "lv" or "tr"
const key = Number(el.dataset.key);

if (list === "lv") {
  if (sel.lv === key) {
    // deselect
    sel.lv = null;
    el.setAttribute("aria-pressed", "false");
    el.classList.remove("selected");
  } else {
    // new select
    LV_BOX.querySelectorAll(".word-card[aria-pressed='true']").forEach(e => { e.setAttribute("aria-pressed","false"); e.classList.remove("selected"); });
    sel.lv = key;
    el.setAttribute("aria-pressed", "true");
    el.classList.add("selected");
    speakLV(current[key].lv);
  }
} else {
  if (sel.tr === key) {
    sel.tr = null;
    el.setAttribute("aria-pressed", "false");
    el.classList.remove("selected");
  } else {
    TR_BOX.querySelectorAll(".word-card[aria-pressed='true']").forEach(e => { e.setAttribute("aria-pressed","false"); e.classList.remove("selected"); });
    sel.tr = key;
    el.setAttribute("aria-pressed", "true");
    el.classList.add("selected");
  }
}

// Check match
if (sel.lv !== null && sel.tr !== null) {
  if (sel.lv === sel.tr) {
    score.right++;
    announceStatus();
    HELP.textContent = "Labi! Pareizs pāris.";
    disablePair(sel.lv);
  } else {
    score.wrong++;
    announceStatus();
    const lvWord = current[sel.lv]?.lv || "";
    const trCandidate = current[sel.tr]?.eng || current[sel.tr]?.ru || "";
    HELP.textContent = `Nē. “${lvWord}” nav “${trCandidate}”. Pamēģini vēlreiz.`;
  }
  // reset selection (but keep disabled pairs)
  clearSelections();
}
}

function onKeyNav(e) {
const target = e.target.closest(".word-card");
if (!target) return;

const list = target.dataset.list;
const container = list === "lv" ? LV_BOX : TR_BOX;
const options = Array.from(container.querySelectorAll('.word-card[aria-disabled="false"]'));
const idx = options.indexOf(target);

if (e.key === "ArrowDown" || e.key === "ArrowRight") {
  e.preventDefault();
  const next = options[idx + 1] || options[0];
  next?.focus();
} else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
  e.preventDefault();
  const prev = options[idx - 1] || options[options.length - 1];
  prev?.focus();
} else if (e.key === "Enter" || e.key === " ") {
  e.preventDefault();
  handleSelect(target);
}
}

function onClick(e) {
const card = e.target.closest(".word-card");
if (card) handleSelect(card);
}

async function newGame() {
HELP.textContent = "";
score = JSON.parse(localStorage.getItem("score") || '{"right":0,"wrong":0}');
announceStatus();

const sample = [];
// Choose 8–12 random items for each round
const COUNT = 10;
const used = new Set();
while (sample.length < Math.min(COUNT, data.length)) {
  const i = rand(data.length);
  if (!used.has(i)) { used.add(i); sample.push(data[i]); }
}
current = sample;
renderRound(current);
}

async function loadData() {
const res = await fetch("data/words.json", { cache: "force-cache" });
if (!res.ok) throw new Error("Neizdevās ielādēt datus.");
data = await res.json();
}

// Events
LV_BOX.addEventListener("keydown", onKeyNav);
TR_BOX.addEventListener("keydown", onKeyNav);
LV_BOX.addEventListener("click", onClick);
TR_BOX.addEventListener("click", onClick);

BTN_NEW.addEventListener("click", () => {
newGame();
});

BTN_SPEAK?.addEventListener("click", () => {
speakOn = !speakOn;
BTN_SPEAK.setAttribute("aria-pressed", String(speakOn));
BTN_SPEAK.textContent = speakOn ? "Izruna: ieslēgta" : "Ieslēgt izrunu";
});

window.addEventListener("beforeunload", () => {
localStorage.setItem("score", JSON.stringify(score));
});

// Bootstrap the app
(async () => {
announceStatus();
try {
await loadData();
await newGame();
} catch (e) {
HELP.textContent = "Dati nav pieejami bezsaistē. Mēģini vēlreiz ar internetu.";
}
})();
})();

