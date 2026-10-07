"""Shared helpers for the tools/cases/<site>_cases.py files.
Step format: label, optional context (HTML), image + caption, tag, and either an
MCQ (prompt, choices, correctIndex, explanation) or a fill-in (prompt, answer,
explanation). A step with neither is information only."""
import json, os

TRIAL = "Landmark trial"

def mcq(label, prompt, choices, correct, explanation, **extra):
    return {"label": label, **extra, "prompt": prompt, "choices": choices, "correctIndex": correct, "explanation": explanation}

def fill(label, prompt, answer, explanation="", **extra):
    return {"label": label, **extra, "prompt": prompt, "answer": answer, "explanation": explanation}

def write(site, intro, cases):
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "src", "data", "cases", site + ".json")
    with open(out, "w", encoding="utf8") as f:
        json.dump({"category": "Case-Based Practice", "intro": intro, "cases": cases}, f, ensure_ascii=False, indent=1)
    print("wrote", os.path.normpath(out), len(cases), "cases")
