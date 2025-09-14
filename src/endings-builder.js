(() => {
  const PRONS = [
    { name: "es", slot: "1s" },
    { name: "tu", slot: "2s" },
    { name: "viņš/viņa", slot: "3s" }
  ];
  const TENSES = ["present", "past", "future"];
  const REFLEX = { "1s": "os", "2s": "ies", "3s": "as" };

  const promptEl = id("prompt");
  const builderEl = id("builder");
  const poolEl = id("pool");

  let verbs = [];

  fetch("data/endings.json")
    .then(r => r.json())
    .then(d => { verbs = d; next(); })
    .catch(err => {
      if (promptEl) promptEl.textContent = "Failed to load data.";
      console.error(err);
    });

  function next() {
    if (!verbs.length) return;
    const verb = pick(verbs);
    const pron = pick(PRONS);
    const tense = pick(TENSES);

    const pieces = [];
    if (tense === "future") pieces.push("s");
    const ending = verb.endings[tense][pron.slot];
    pieces.push(ending);
    if (verb.reflexive) {
      const ref = REFLEX[pron.slot];
      if (ref) pieces.push(ref);
    }

    let tiles = [...pieces];
    pieces.forEach(p => {
      const w = wrongVowel(p);
      if (w && w !== p) tiles.push(w);
    });
    if (verb.reflexive) {
      tiles.push(pron.slot === "1s" ? "ies" : "os");
    }
    tiles = shuffle(Array.from(new Set(tiles)));

    renderRound(verb.stem, pron.name, tense, pieces, tiles);
  }

  function renderRound(stem, pron, tense, pieces, tiles) {
    if (promptEl) {
      promptEl.textContent = `${stem} — ${pron} (${tense})`;
    }
    if (builderEl) {
      builderEl.innerHTML = "";
      const stemTile = document.createElement("div");
      stemTile.className = "tile btn btn-secondary";
      stemTile.textContent = stem;
      builderEl.appendChild(stemTile);
      pieces.forEach(p => {
        const dz = document.createElement("div");
        dz.className = "dropzone";
        dz.dataset.expected = p;
        dz.ondragover = e => e.preventDefault();
        dz.ondrop = e => {
          e.preventDefault();
          const val = e.dataTransfer.getData("text");
          if (val === p) {
            dz.textContent = val;
            dz.classList.add("filled");
            checkComplete();
          }
        };
        builderEl.appendChild(dz);
      });
    }
    if (poolEl) {
      poolEl.innerHTML = "";
      tiles.forEach(t => {
        const tile = document.createElement("div");
        tile.className = "tile btn btn-outline-secondary";
        tile.textContent = t;
        tile.draggable = true;
        tile.ondragstart = e => e.dataTransfer.setData("text", t);
        poolEl.appendChild(tile);
      });
    }
  }

  function checkComplete() {
    const zones = builderEl ? [...builderEl.querySelectorAll('.dropzone')] : [];
    if (zones.length && zones.every(z => z.classList.contains('filled'))) {
      setTimeout(next, 600);
    }
  }

  function wrongVowel(str) {
    const map = { 'a': 'ā', 'ā': 'a', 'e': 'ē', 'ē': 'e', 'i': 'ī', 'ī': 'i', 'u': 'ū', 'ū': 'u' };
    return str.replace(/[aāeēiīuū]/, v => map[v] || v);
  }

  function id(x) { return document.getElementById(x); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
})();
