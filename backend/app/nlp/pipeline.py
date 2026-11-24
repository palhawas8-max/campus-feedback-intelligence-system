"""
nlp/pipeline.py — Unified analysis pipeline combining all NLP modules.

Call analyze(text) → dict with all results needed for AnalysisResult model.
"""
from __future__ import annotations

from app.nlp.preprocess import preprocess
from app.nlp.keywords import extract_keywords
from app.nlp.urgency import compute_urgency
from app.nlp.routing import route_department


def analyze(raw_text: str) -> dict:
    """
    Full NLP pipeline: preprocess → keywords → urgency → routing.

    Args:
        raw_text: Original student feedback text.

    Returns:
        dict with keys:
            cleaned_text, keywords, sentiment_compound,
            urgency_score, urgency_level, assigned_dept
    """
    # Step 1: Preprocess
    prep = preprocess(raw_text)
    cleaned_text: str = prep["cleaned_text"]
    tokens: list[str] = prep["tokens"]

    # Step 2: Extract keywords (from cleaned text, not tokenized — KeyBERT needs context)
    keywords: list[str] = extract_keywords(cleaned_text, top_n=5)

    # Step 3: Urgency (from original text to preserve sentiment cues)
    urgency = compute_urgency(raw_text)

    # Step 4: Department routing (use both cleaned text and tokens)
    assigned_dept: str = route_department(cleaned_text, tokens)

    return {
        "cleaned_text": cleaned_text,
        "keywords": keywords,
        "sentiment_compound": urgency["sentiment_compound"],
        "urgency_score": urgency["urgency_score"],
        "urgency_level": urgency["urgency_level"],
        "assigned_dept": assigned_dept,
    }
