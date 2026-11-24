"""
nlp/routing.py — Route issues to departments based on keyword taxonomy.
Scores by keyword match count; highest score wins.
"""
from __future__ import annotations

# Department taxonomy: maps department name → set of trigger keywords/phrases
_TAXONOMY: dict[str, list[str]] = {
    "Electrical Maintenance Wing": [
        "switchboard", "switch board", "wire", "wires", "wiring", "fan",
        "light", "lights", "lighting", "short circuit", "power", "socket",
        "ac", "air conditioner", "electricity", "electric", "bulb",
        "fuse", "plug", "current", "voltage", "spark", "sparks",
        "tripping", "circuit", "board",
    ],
    "Public Health and Civil Works": [
        "leakage", "leaking", "leak", "water", "washroom", "toilet",
        "bathroom", "wall", "ceiling", "bench", "benches", "furniture",
        "drain", "drainage", "cleanliness", "dirty", "clean", "floor",
        "slippery", "damp", "mould", "mold", "paint", "crack", "cracks",
        "broken door", "door", "window", "seepage", "flood", "flooding",
        "garbage", "waste", "smell", "smells", "odor",
    ],
    "IT Services": [
        "projector", "wifi", "wi-fi", "internet", "computer", "computers",
        "lab pc", "network", "software", "display", "monitor", "keyboard",
        "mouse", "printer", "server", "connection", "slow internet",
        "broadband", "lan", "ethernet", "router", "switch", "access point",
        "screen", "blue screen", "system", "laptop",
    ],
}

_FALLBACK = "General Administration"


def route_department(text: str, tokens: list[str]) -> str:
    """
    Determine the responsible department by scoring keyword matches.

    Both the full cleaned text and the token list are used to maximize
    coverage (multi-word phrases matched in text; single tokens in tokens).

    Returns:
        Department name string.
    """
    text_lower = text.lower()
    token_set = set(t.lower() for t in tokens)

    scores: dict[str, int] = {dept: 0 for dept in _TAXONOMY}

    for dept, keywords in _TAXONOMY.items():
        for kw in keywords:
            if " " in kw:
                # Multi-word phrase: search in full text
                if kw in text_lower:
                    scores[dept] += 2  # phrase match worth more
            else:
                # Single word: check tokens or text
                if kw in token_set or kw in text_lower:
                    scores[dept] += 1

    best_dept = max(scores, key=lambda d: scores[d])
    best_score = scores[best_dept]

    return best_dept if best_score > 0 else _FALLBACK
