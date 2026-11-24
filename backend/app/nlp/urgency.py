"""
nlp/urgency.py — VADER-based urgency scoring with safety-hazard boosting.

Urgency levels:
  < 0.35  → Low
  < 0.55  → Medium
  < 0.75  → High
  >= 0.75 → Critical

Safety hazard terms force urgency_level to at least "High".
"""
from __future__ import annotations
from functools import lru_cache

# Safety hazard terms that force at least High urgency
_HAZARD_TERMS = {
    "exposed wire", "exposed wires", "short circuit", "sparks", "spark",
    "fire", "flooding", "flooded", "leakage near electricity",
    "gas leak", "gas leakage", "collapse", "collapsed", "snake",
    "injury", "injured", "burning", "electric shock", "electrocution",
    "dangerous wire", "bare wire", "live wire", "slippery", "slippery floor",
}

_URGENCY_LEVELS = ["Low", "Medium", "High", "Critical"]
_THRESHOLDS = [0.35, 0.55, 0.75]  # boundaries between levels


@lru_cache(maxsize=1)
def _get_vader():
    """Load VADER SentimentIntensityAnalyzer once."""
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    return SentimentIntensityAnalyzer()


def _has_hazard(text: str) -> bool:
    """Return True if any safety-hazard phrase appears in the lowercased text."""
    text_lower = text.lower()
    return any(term in text_lower for term in _HAZARD_TERMS)


def _score_to_level(score: float) -> str:
    """Map urgency_score [0,1] to urgency level string."""
    for i, threshold in enumerate(_THRESHOLDS):
        if score < threshold:
            return _URGENCY_LEVELS[i]
    return "Critical"


def compute_urgency(text: str) -> dict[str, float | str]:
    """
    Compute urgency for the given text.

    Formula:
        urgency_score = (1 - vader_compound) / 2
        → Strongly negative text → high urgency
        → Positive/neutral text → low urgency

    Returns:
        {
          "sentiment_compound": float,  # VADER compound [-1, 1]
          "urgency_score": float,       # [0, 1]
          "urgency_level": str,         # Low / Medium / High / Critical
        }
    """
    vader = _get_vader()
    scores = vader.polarity_scores(text)
    compound: float = scores["compound"]

    # Map to [0, 1]: more negative → higher urgency
    urgency_score = round((1 - compound) / 2, 4)
    urgency_level = _score_to_level(urgency_score)

    # Hazard boost: force at least "High"
    if _has_hazard(text):
        level_idx = _URGENCY_LEVELS.index(urgency_level)
        urgency_level = _URGENCY_LEVELS[max(level_idx, 2)]  # index 2 = "High"
        # Also bump score above the High threshold if it was lower
        if urgency_score < _THRESHOLDS[1]:
            urgency_score = _THRESHOLDS[1]  # 0.55

    return {
        "sentiment_compound": round(compound, 4),
        "urgency_score": urgency_score,
        "urgency_level": urgency_level,
    }
