import json
import os
import re
from typing import List, Dict, Any, Optional

CORPUS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "processed", "state_factsheets_corpus.json"))

_CORPUS_CACHE: List[Dict[str, Any]] = []

def load_corpus() -> List[Dict[str, Any]]:
    global _CORPUS_CACHE
    if not _CORPUS_CACHE and os.path.exists(CORPUS_PATH):
        try:
            with open(CORPUS_PATH, "r", encoding="utf-8") as f:
                _CORPUS_CACHE = json.load(f)
        except Exception as e:
            print(f"Error loading RAG corpus: {e}")
    return _CORPUS_CACHE

def search_corpus(query: str, top_k: int = 2) -> List[Dict[str, Any]]:
    corpus = load_corpus()
    if not corpus:
        return []
        
    query_tokens = set(re.findall(r'\w+', query.lower()))
    scored_results = []
    
    for doc in corpus:
        state = doc.get("state_name", "").lower()
        full_text = doc.get("full_text", "")
        summary = doc.get("summary", "")
        
        # State name bonus match
        state_match_score = 10 if any(q in state for q in query_tokens if len(q) > 2) else 0
        
        # Word frequency in text
        text_tokens = re.findall(r'\w+', full_text.lower())
        overlap = sum(1 for t in text_tokens if t in query_tokens)
        
        total_score = state_match_score + overlap
        if total_score > 0:
            scored_results.append({
                "score": total_score,
                "state_name": doc.get("state_name"),
                "summary": summary,
                "relevant_snippet": full_text[:800] + "..." if len(full_text) > 800 else full_text
            })
            
    scored_results.sort(key=lambda x: x["score"], reverse=True)
    return scored_results[:top_k]
