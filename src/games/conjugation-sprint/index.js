(() => {
  const PRONS = ["es", "tu", "viņš/viņa", "mēs", "jūs", "viņi/viņas"];
  const IDX = { "es": "1s", "tu": "2s", "viņš/viņa": "3s", "mēs": "1p", "jūs": "2p", "viņi/viņas": "3p" };
  const TENSES = ["present", "past", "future"];
  let bank = [], score = 0, streak = 0, round = 0, maxRounds = 20, lock = false;
  let perRight = { "1s": 0, "2s": 0, "3s": 0, "1p": 0, "2p": 0, "3p": 0 }, perSeen = { "1s": 0, "2s": 0, "3s": 0, "1p": 0, "2p": 0, "3p": 0 };

  const qEl = id("qtext"), mEl = id("meta"), cEl = id("choices");
  const scoreEl = id("score"), streakEl = id("streak"), roundEl = id("round");
  const perStatsEl = id("perstats");
  const againBtn = id("again");
  const skipBtn = id("skip");
  const VALID_TENSE_MODES = ["random", ...TENSES];
  const tenseFilterEl = id("tenseFilter");
  let tenseMode = "random";

  if (againBtn) {
    againBtn.onclick = reset;
  }
  if (skipBtn) {
    skipBtn.onclick = () => check(null);
  }
  if (tenseFilterEl) {
    tenseFilterEl.value = tenseMode;
    tenseFilterEl.disabled = true;
    tenseFilterEl.addEventListener("change", (ev) => {
      const nextMode = (ev.target && ev.target.value) || "random";
      if (!VALID_TENSE_MODES.includes(nextMode)) {
        return;
      }
      tenseMode = nextMode;
      reset();
    });
  }

  (async () => {
    try {
      const res = await fetch("data/words.json");
      if (!res.ok) {
        throw new Error(`Unexpected status ${res.status}`);
      }
      const data = await res.json();
      bank = data.filter(v => v.conj && v.conj.present && v.conj.past && v.conj.future);
    } catch (err) {
      if (Array.isArray(window.__LATVIAN_WORDS__)) {
        console.warn("words.json fetch failed; using embedded fallback dataset.", err);
        bank = window.__LATVIAN_WORDS__.filter(v => v.conj && v.conj.present && v.conj.past && v.conj.future);
      } else {
        if(qEl) {
          qEl.textContent = "Failed to load words data.";
        }
        console.error(err);
        return;
      }
    }

    if (bank.length === 0) {
      if(qEl) {
        qEl.textContent = "No verbs with conjugations found.";
      }
      return;
    }
    if (tenseFilterEl) {
      tenseFilterEl.disabled = false;
    }
    reset();
  })();

  function reset() {
    score = 0; streak = 0; round = 0;
    for (const k in perRight) { perRight[k] = 0; perSeen[k] = 0; }
    next();
  }

  function id(x) { return document.getElementById(x); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

  let current = null;
  function next() {
    lock = false;
    round++;
    if(roundEl) {
      roundEl.textContent = `round ${round}/${maxRounds}`;
    }
    if (round > maxRounds) { finish(); return; }

    const v = pick(bank);
    const tense = tenseMode === "random" ? pick(TENSES) : tenseMode;
    const pron = pick(PRONS);
    const slot = IDX[pron];
    const correct = v.conj[tense][slot];

    // Build distractors using only variations of the same verb
    const forms = Array.from(new Set(
      Object.values(IDX).map(k => v.conj[tense][k])
    ));
    const distractors = forms.filter(f => f !== correct);
    shuffle(distractors);
    let options = [correct, ...distractors.slice(0, 3)];
    shuffle(options);

    current = { v, tense, pron, slot, correct };
    if(qEl) {
      qEl.textContent = `${v.lv} — ${pron} (${tense})`;
    }
    if(mEl) {
      mEl.textContent = v.eng || "";
    }

    if(cEl) {
      cEl.innerHTML = "";
      options.forEach(opt => {
        const b = document.createElement("button");
        b.className = "btn btn-outline-secondary";
        b.textContent = opt;
        b.onclick = () => check(opt, b);
        cEl.appendChild(b);
      });
    }
    updateHUD();
  }

  function check(ans, btn) {
    if (lock) return; lock = true;
    perSeen[current.slot]++;

    const buttons = cEl ? [...cEl.querySelectorAll("button")] : [];
    buttons.forEach(b => b.disabled = true);

    if (ans === current.correct) {
      score += 2; streak++;
      if (btn) { btn.classList.remove("btn-outline-secondary"); btn.classList.add("btn-success"); }
    } else {
      streak = 0;
      if (btn) { btn.classList.remove("btn-outline-secondary"); btn.classList.add("btn-danger"); }
    }
    // highlight correct answer
    const good = buttons.find(b => b.textContent === current.correct);
    if (good) {
      good.classList.remove("btn-outline-secondary");
      good.classList.add("btn-success");
    }

    if (ans === current.correct) perRight[current.slot]++;

    updateHUD();
    setTimeout(() => (round < maxRounds ? next() : finish()), 700);
  }

  function updateHUD() {
    if(scoreEl) {
      scoreEl.textContent = `score ${score}`;
    }
    if(streakEl) {
      streakEl.textContent = `streak ${streak}`;
    }
    const rows = PRONS.map(p => {
      const k = IDX[p];
      const seen = perSeen[k] || 0, right = perRight[k] || 0;
      const pct = seen ? Math.round(100 * right / seen) : 0;
      return pct;
    });
    if(perStatsEl) {
      perStatsEl.innerHTML = rows.map(v => `<div>${v}%</div>`).join("");
    }
  }

  function finish() {
    if(qEl) {
      qEl.textContent = "Sprint complete!";
    }
    if(mEl) {
      mEl.textContent = "Replay to reinforce weak pronouns. Aim for 90%+ across all six slots.";
    }
    if(cEl) {
      cEl.innerHTML = "";
    }
  }
})();
