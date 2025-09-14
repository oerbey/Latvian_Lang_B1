#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Latvian verb conjugation filler using Tēzaurs inflection API.

Input:  verbs.json  (array of dicts like the user's sample)
Output: verbs_conjugated.json (same array, with conj filled when missing)

Requires: requests
    pip install requests

Notes:
- Uses api.tezaurs.lv/v1/inflections/{word}
- Parses MULTEXT-East tags (e.g., vmip1s / vmis1p / vmif2p).
- Falls back to reading a 'features' dict if present.
- Leaves unknown cells empty for manual review instead of guessing.
"""

import json
import time
import re
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

API_BASE = "https://api.tezaurs.lv/v1/inflections/"

# Map (tense, person, number) -> our JSON keys
KEYS = {
    ("present", "1", "s"): "1s",
    ("present", "2", "s"): "2s",
    ("present", "3", "s"): "3s",
    ("present", "1", "p"): "1p",
    ("present", "2", "p"): "2p",
    ("present", "3", "p"): "3p",

    ("past", "1", "s"): "1s",
    ("past", "2", "s"): "2s",
    ("past", "3", "s"): "3s",
    ("past", "1", "p"): "1p",
    ("past", "2", "p"): "2p",
    ("past", "3", "p"): "3p",

    ("future", "1", "s"): "1s",
    ("future", "2", "s"): "2s",
    ("future", "3", "s"): "3s",
    ("future", "1", "p"): "1p",
    ("future", "2", "p"): "2p",
    ("future", "3", "p"): "3p",
}

# Initialize session with retries
def make_session():
    s = requests.Session()
    retries = Retry(
        total=5,
        connect=5,
        read=5,
        backoff_factor=0.6,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET"]),
    )
    s.mount("https://", HTTPAdapter(max_retries=retries))
    return s

SESSION = make_session()

# --- MULTEXT-East tag parser ---
# Typical Latvian verb tag looks like: v m i p 1 s ...
# v = verb, m = main (lexical), i = indicative, p/s/f = present/past/future
# next slots include person (1/2/3) and number (s/p).
# We accept a few variants just in case.  Earlier this code mistakenly
# required an extra literal "i" after the second position which meant tags
# like ``vmip1s`` (present, 1st person singular) failed to match and all
# conjugation slots were left empty.  The regex now simply skips the first
# two characters after ``v`` and captures the tense/person/number triples.
MSD_RE = re.compile(r"^v..([psf])([123])([sp])", re.IGNORECASE)

TENSE_MAP = {"p": "present", "s": "past", "f": "future"}

def parse_msd(msd: str):
    """
    Return (tense, person, number) if recognisable, else None.
    """
    if not msd:
        return None
    m = MSD_RE.match(msd)
    if not m:
        return None
    t_char, person, number = m.groups()
    tense = TENSE_MAP.get(t_char.lower())
    if tense is None:
        return None
    return tense, person, number

def normalise_feature(value: str) -> str:
    return (value or "").strip().lower()

def extract_from_features(feats: dict):
    """
    Try to read tense/person/number from a 'features' dictionary.
    Tēzaurs may label in Latvian; handle the common keys.
    """
    # Common Latvian feature keys seen in literature:
    # Laiks (Tense): tagadne/pagātne/nākotne
    # Persona (Person): 1./2./3.
    # Skaitlis (Number): vienskaitlis/daudzskaitlis
    # Izteiksme (Mood): īstenības (indicative)
    tense_val = normalise_feature(
        feats.get("Tense") or feats.get("Laiks") or feats.get("tense") or ""
    )
    mood_val = normalise_feature(
        feats.get("Mood") or feats.get("Izteiksme") or feats.get("mood") or ""
    )
    person_val = normalise_feature(
        feats.get("Person") or feats.get("Persona") or feats.get("person") or ""
    )
    number_val = normalise_feature(
        feats.get("Number") or feats.get("Skaitlis") or feats.get("number") or ""
    )

    # Only indicative
    if mood_val and not any(k in mood_val for k in ["īsten", "indic"]):
        return None

    # Map tense words
    tense = None
    if "tagadne" in tense_val or "present" in tense_val:
        tense = "present"
    elif "pag" in tense_val or "past" in tense_val:
        tense = "past"
    elif "nākotn" in tense_val or "future" in tense_val:
        tense = "future"

    # Person as digit
    person = None
    for d in ("1", "2", "3"):
        if tense_val == d:  # weird data
            person = d
        if person_val.startswith(d) or person_val == d:
            person = d
    # Number
    number = None
    if any(k in number_val for k in ["vien", "sing"]):
        number = "s"
    elif any(k in number_val for k in ["daudz", "plur", "pl"]):
        number = "p"

    if tense and person and number:
        return (tense, person, number)
    return None

def fetch_inflections(lemma: str):
    url = API_BASE + requests.utils.quote(lemma, safe="")
    r = SESSION.get(url, timeout=20)
    r.raise_for_status()
    return r.json()

def best_verb_entries(payload):
    """
    Tēzaurs responses vary (dicts/lists, nested under different keys).
    Walk the payload recursively and collect dicts that look like wordform
    entries (have a surface form + grammatical info keys).
    """
    def looks_like_wordform(d: dict) -> bool:
        if not isinstance(d, dict):
            return False
        has_form = any(k in d for k in ("wf", "form", "wordform"))
        if not has_form:
            return False
        # Grammatical info might live directly on the node or inside a nested
        # dict such as "tags" or "gram". Check both levels.
        gram_keys = ("msd", "tag", "features", "feat")
        if any(k in d for k in (*gram_keys, "tags", "gram")):
            return True
        for v in d.values():
            if isinstance(v, dict) and any(k in v for k in gram_keys):
                return True
        return False
        #has_gram = any(k in d for k in ("msd", "tag", "features", "feat"))
        #return has_form and has_gram
        

    results = []

    def walk(node):
        if isinstance(node, dict):
            # Direct containers commonly seen
            for key in ("wordforms", "inflections", "forms", "paradigms", "analyses", "analysis"):
                val = node.get(key)
                if isinstance(val, (list, dict)):
                    walk(val)
            # Also traverse generic values to be safe
            for v in node.values():
                if isinstance(v, (list, dict)):
                    walk(v)
            # Finally, collect if this node itself matches
            if looks_like_wordform(node):
                results.append(node)
        elif isinstance(node, list):
            for x in node:
                walk(x)
        # Ignore scalars

    walk(payload)
    return results

def build_conjugation_table(lemma: str):
    try:
        data = fetch_inflections(lemma)
    except Exception as e:
        # On hard failure, return empty skeletal table
        return {
            "present": {k: "" for k in ["1s","2s","3s","1p","2p","3p"]},
            "past":    {k: "" for k in ["1s","2s","3s","1p","2p","3p"]},
            "future":  {k: "" for k in ["1s","2s","3s","1p","2p","3p"]},
            "_note": f"API error for '{lemma}': {e}"
        }

    table = {
        "present": {k: "" for k in ["1s","2s","3s","1p","2p","3p"]},
        "past":    {k: "" for k in ["1s","2s","3s","1p","2p","3p"]},
        "future":  {k: "" for k in ["1s","2s","3s","1p","2p","3p"]},
    }

    items = best_verb_entries(data)

    for it in items:
        # Surface form
        form = it.get("wf") or it.get("form") or it.get("wordform") or ""
        if not form:
            continue

        # Try MULTEXT-East tag
        msd = it.get("msd") or it.get("tag") or ""
        key = None
        parsed = parse_msd(msd) if msd else None

        if not parsed:
            # Try features dict
            feats = it.get("features") or it.get("feat") or {}
            if isinstance(feats, dict):
                parsed = extract_from_features(feats)

        if not parsed:
            continue

        tense, person, number = parsed
        slot = KEYS.get((tense, person, number))
        if not slot:
            continue

        # Only fill empty cells (avoid weird duplicates from participles, etc.)
        if table[tense][slot] == "":
            table[tense][slot] = form

    return table

def fill_conjugations(entries):
    out = []
    for i, entry in enumerate(entries, 1):
        lv = entry.get("lv", "").strip()
        if not lv:
            out.append(entry)
            continue

        has_conj = isinstance(entry.get("conj"), dict) and all(
            k in entry["conj"] for k in ("present", "past", "future")
        )
        if has_conj:
            out.append(entry)
            continue

        conj = build_conjugation_table(lv)
        new_entry = dict(entry)
        new_entry["conj"] = conj
        out.append(new_entry)
        # be kind to the API
        time.sleep(0.2)
    return out

def main():
    src = Path("verbs.json")
    dst = Path("verbs_conjugated.json")
    data = json.loads(src.read_text(encoding="utf-8"))
    # Accept either a dict with 'verbs' or a bare array
    if isinstance(data, dict) and "verbs" in data:
        verbs = data["verbs"]
        wrap = True
    else:
        verbs = data
        wrap = False

    completed = fill_conjugations(verbs)

    if wrap:
        result = {"verbs": completed}
    else:
        result = completed

    dst.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Done. Wrote: {dst}")

if __name__ == "__main__":
    main()
