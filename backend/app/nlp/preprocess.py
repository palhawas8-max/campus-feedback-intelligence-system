"""
nlp/preprocess.py — Text cleaning, tokenization, stopword removal, lemmatization.
Uses NLTK only (spaCy doesn't yet have Python 3.13 wheels).
Preserves negations and domain-specific words.
"""
from __future__ import annotations
import re
import unicodedata
from functools import lru_cache

import nltk

# Download required NLTK data once
def _ensure_nltk():
    packages = {
        "tokenizers/punkt_tab": "punkt_tab",
        "tokenizers/punkt": "punkt",
        "corpora/stopwords": "stopwords",
        "corpora/wordnet": "wordnet",
        "taggers/averaged_perceptron_tagger_eng": "averaged_perceptron_tagger_eng",
        "taggers/averaged_perceptron_tagger": "averaged_perceptron_tagger",
    }
    for path, pkg in packages.items():
        try:
            nltk.data.find(path)
        except LookupError:
            try:
                nltk.download(pkg, quiet=True)
            except Exception:
                pass

_ensure_nltk()

from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
from nltk.corpus import wordnet

# Negations and domain words we always keep
_KEEP_WORDS = {
    "not", "no", "never", "broken", "damaged", "leaking", "faulty",
    "exposed", "dangerous", "slippery", "dirty", "dead", "down",
    "collapsed", "flooded", "burning", "sparking", "smells",
}

_BASE_STOPWORDS = set(stopwords.words("english")) - _KEEP_WORDS

_EXTRA_STOP = {"please", "also", "one", "two", "would", "could", "should", "get", "got"}
_STOPWORDS = _BASE_STOPWORDS | _EXTRA_STOP


def _get_wordnet_pos(tag: str) -> str:
    """Map NLTK POS tag → WordNet POS tag for lemmatizer."""
    if tag.startswith("J"):
        return wordnet.ADJ
    elif tag.startswith("V"):
        return wordnet.VERB
    elif tag.startswith("N"):
        return wordnet.NOUN
    elif tag.startswith("R"):
        return wordnet.ADV
    return wordnet.NOUN


@lru_cache(maxsize=1)
def _get_lemmatizer() -> WordNetLemmatizer:
    return WordNetLemmatizer()


def _clean_raw(text: str) -> str:
    """Remove URLs, HTML tags, special characters, and extra whitespace."""
    # URLs
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)
    # HTML tags
    text = re.sub(r"<[^>]+>", " ", text)
    # Normalize unicode accents → ASCII
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    # Keep alphanumerics, spaces, apostrophes (for contractions like "don't")
    text = re.sub(r"[^a-zA-Z0-9\s']", " ", text)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text


def preprocess(raw_text: str) -> dict[str, str | list[str]]:
    """
    Full preprocessing pipeline.

    Returns:
        {
          "cleaned_text": str,   # clean but NOT yet stop-word-filtered (for KeyBERT)
          "tokens": list[str],   # lemmatized, stop-word-filtered tokens (for routing)
        }
    """
    cleaned = _clean_raw(raw_text)
    lemmatizer = _get_lemmatizer()

    # Tokenize
    tokens_raw = word_tokenize(cleaned)

    # POS tag for better lemmatization
    try:
        tagged = nltk.pos_tag(tokens_raw)
        tokens = [
            lemmatizer.lemmatize(word, _get_wordnet_pos(tag))
            for word, tag in tagged
            if word not in _STOPWORDS and len(word) > 1 and word.isalpha()
        ]
    except Exception:
        # Fallback: simple lemmatization without POS
        tokens = [
            lemmatizer.lemmatize(word)
            for word in tokens_raw
            if word not in _STOPWORDS and len(word) > 1 and word.isalpha()
        ]

    return {"cleaned_text": cleaned, "tokens": tokens}
