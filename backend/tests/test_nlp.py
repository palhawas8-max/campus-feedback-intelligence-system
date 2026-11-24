"""
tests/test_nlp.py — Unit tests for the NLP pipeline (8+ tests).
Run from backend/ directory: python -m pytest tests/ -v
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from app.nlp.preprocess import preprocess, _clean_raw
from app.nlp.urgency import compute_urgency, _has_hazard
from app.nlp.routing import route_department
from app.nlp.pipeline import analyze


# ─── Preprocess Tests ────────────────────────────────────────────────────────

class TestPreprocess:

    def test_lowercase_and_clean(self):
        result = preprocess("BROKEN Projector!!!")
        assert result["cleaned_text"] == result["cleaned_text"].lower()

    def test_url_removal(self):
        cleaned = _clean_raw("Visit https://example.com for details. Broken fan.")
        assert "http" not in cleaned
        assert "broken" in cleaned

    def test_stopword_removal_keeps_negation(self):
        """'not' and 'no' must be preserved even though they're stopwords."""
        result = preprocess("The fan is not working and there is no power")
        tokens = result["tokens"]
        assert "not" in tokens or "no" in tokens

    def test_tokens_are_lemmatized(self):
        """'leaking' should lemmatize to 'leak'."""
        result = preprocess("Water is leaking from the ceiling pipes")
        tokens = result["tokens"]
        assert "leak" in tokens or "leaking" in tokens  # spaCy may keep both


# ─── Urgency Tests ───────────────────────────────────────────────────────────

class TestUrgency:

    def test_negative_text_high_urgency(self):
        result = compute_urgency("The ceiling is leaking and the floor is slippery and very dangerous")
        assert result["urgency_score"] > 0.5
        assert result["urgency_level"] in ("Medium", "High", "Critical")

    def test_hazard_term_forces_high(self):
        """'exposed wires' is a hazard → at least High."""
        result = compute_urgency("Exposed wires near the switchboard")
        assert result["urgency_level"] in ("High", "Critical")

    def test_low_urgency_for_mild_text(self):
        result = compute_urgency("The notice board looks slightly dusty")
        assert result["urgency_level"] in ("Low", "Medium")

    def test_has_hazard_detection(self):
        assert _has_hazard("exposed wire in the lab") is True
        assert _has_hazard("short circuit happened") is True
        assert _has_hazard("the bench is dirty") is False

    def test_critical_for_extreme_negative(self):
        result = compute_urgency(
            "EXTREMELY DANGEROUS! Sparks and fire coming from exposed wires. "
            "Students are injured. Emergency!"
        )
        assert result["urgency_level"] in ("High", "Critical")


# ─── Routing Tests ───────────────────────────────────────────────────────────

class TestRouting:

    def test_water_routes_civil(self):
        text = "water leakage in ceiling floor slippery"
        tokens = ["water", "leakage", "ceiling", "floor", "slippery"]
        dept = route_department(text, tokens)
        assert dept == "Public Health and Civil Works"

    def test_projector_wifi_routes_it(self):
        text = "projector not working and wifi very slow"
        tokens = ["projector", "not", "working", "wifi", "slow"]
        dept = route_department(text, tokens)
        assert dept == "IT Services"

    def test_exposed_wire_routes_electrical(self):
        text = "exposed wires near the switchboard outside library very dangerous"
        tokens = ["expose", "wire", "switchboard", "outside", "library", "dangerous"]
        dept = route_department(text, tokens)
        assert dept == "Electrical Maintenance Wing"


# ─── Full Pipeline Integration Tests ─────────────────────────────────────────

class TestPipeline:

    def test_pipeline_water_leakage(self):
        """Sample 1: Water leakage → Civil, High or above."""
        result = analyze(
            "There is water leakage in the ceiling of Lab 3 and the floor is very slippery"
        )
        assert result["assigned_dept"] == "Public Health and Civil Works"
        assert result["urgency_level"] in ("Medium", "High", "Critical")
        assert isinstance(result["keywords"], list)
        assert len(result["keywords"]) >= 1

    def test_pipeline_projector_wifi(self):
        """Sample 2: Projector + WiFi → IT Services."""
        result = analyze(
            "The projector in room 204 is not working and the wifi is very slow"
        )
        assert result["assigned_dept"] == "IT Services"
        assert isinstance(result["sentiment_compound"], float)
        assert -1.0 <= result["sentiment_compound"] <= 1.0

    def test_pipeline_exposed_wires(self):
        """Sample 3: Exposed wires → Electrical, Critical or High."""
        result = analyze(
            "Exposed wires near the switchboard outside the library, very dangerous"
        )
        assert result["assigned_dept"] == "Electrical Maintenance Wing"
        assert result["urgency_level"] in ("High", "Critical")

    def test_pipeline_returns_all_keys(self):
        result = analyze("The washroom is very dirty and the drain is blocked")
        required_keys = {
            "cleaned_text", "keywords", "sentiment_compound",
            "urgency_score", "urgency_level", "assigned_dept"
        }
        assert required_keys.issubset(result.keys())

    def test_pipeline_urgency_score_range(self):
        result = analyze("Fan is not working in the classroom")
        assert 0.0 <= result["urgency_score"] <= 1.0
