"""
nlp/keywords.py — Keyphrase extraction using KeyBERT (MMR diversity) with
TF-IDF as a re-ranking fallback. Models loaded once at startup via singleton.
"""
from __future__ import annotations
from functools import lru_cache
from typing import Optional

from sklearn.feature_extraction.text import TfidfVectorizer

# Corpus for TF-IDF context (domain vocabulary)
_DOMAIN_CORPUS = [
    "water leakage ceiling floor slippery wet washroom toilet drain",
    "exposed wire switchboard short circuit sparks electricity fan light socket power",
    "projector wifi internet computer lab network software display broken",
    "broken bench furniture damaged wall ceiling plaster dirty cleanliness",
    "ac air conditioner not working faulty temperature",
    "wifi down internet slow network connection",
    "flood gas collapse injury snake fire burning emergency",
]


@lru_cache(maxsize=1)
def _get_keybert():
    """Load KeyBERT model once (lazy, cached as singleton)."""
    try:
        from keybert import KeyBERT
        # Uses sentence-transformers all-MiniLM-L6-v2 by default
        return KeyBERT(model="all-MiniLM-L6-v2")
    except Exception as e:
        print(f"[KeyBERT] Warning: Could not initialize KeyBERT ({e}), using TF-IDF fallback")
        return None


@lru_cache(maxsize=1)
def _get_tfidf() -> TfidfVectorizer:
    """Fit TF-IDF on domain corpus once."""
    vectorizer = TfidfVectorizer(ngram_range=(1, 3), stop_words="english")
    vectorizer.fit(_DOMAIN_CORPUS)
    return vectorizer


def extract_keywords(cleaned_text: str, top_n: int = 5) -> list[str]:
    """
    Extract top keyphrases using KeyBERT with MMR diversity,
    re-ranked/merged with TF-IDF scores from domain vocabulary.

    Args:
        cleaned_text: Preprocessed (but not tokenized) text.
        top_n: Number of phrases to return.

    Returns:
        List of keyphrase strings, ordered by relevance.
    """
    if not cleaned_text.strip():
        return []

    kbert = _get_keybert()

    # KeyBERT extraction with MMR for diversity
    try:
        keybert_results: list[tuple[str, float]] = kbert.extract_keywords(
            cleaned_text,
            keyphrase_ngram_range=(1, 3),
            stop_words="english",
            use_mmr=True,
            diversity=0.5,
            top_n=top_n + 3,  # over-fetch, then re-rank
        )
    except Exception:
        keybert_results = []

    if not keybert_results:
        # Fallback: simple TF-IDF from domain vocabulary
        return _tfidf_fallback(cleaned_text, top_n)

    # Merge with TF-IDF boost
    tfidf = _get_tfidf()
    try:
        tfidf_matrix = tfidf.transform([cleaned_text])
        feature_names = tfidf.get_feature_names_out()
        tfidf_scores: dict[str, float] = {
            feature_names[i]: tfidf_matrix[0, i]
            for i in tfidf_matrix.nonzero()[1]
        }
    except Exception:
        tfidf_scores = {}

    # Re-rank: keybert_score * 0.7 + tfidf_boost * 0.3
    ranked: list[tuple[str, float]] = []
    for phrase, kb_score in keybert_results:
        # Look up TF-IDF score for exact phrase or any word in phrase
        tf_boost = max(
            (tfidf_scores.get(w, 0.0) for w in phrase.split()),
            default=0.0,
        )
        combined = 0.7 * kb_score + 0.3 * tf_boost
        ranked.append((phrase, combined))

    ranked.sort(key=lambda x: x[1], reverse=True)
    return [phrase for phrase, _ in ranked[:top_n]]


def _tfidf_fallback(text: str, top_n: int) -> list[str]:
    """Pure TF-IDF fallback when KeyBERT fails."""
    tfidf = _get_tfidf()
    try:
        matrix = tfidf.transform([text])
        feature_names = tfidf.get_feature_names_out()
        scores = [(feature_names[i], matrix[0, i]) for i in matrix.nonzero()[1]]
        scores.sort(key=lambda x: x[1], reverse=True)
        return [phrase for phrase, _ in scores[:top_n]]
    except Exception:
        return []
