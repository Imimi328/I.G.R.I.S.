import os
import sys
import re
import sqlite3
from typing import List, Dict, Any, Optional

sys.path.insert(0, os.path.dirname(__file__))

import settings

settings.load_project_env()

from fastapi import FastAPI, Query, HTTPException, Response, Depends, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import db_service
import rag_service
import llm_service
import weather_service
import visualization_service
import auth_service

app = FastAPI(
    title="I.G.R.I.S. API Engine",
    description="Backend AI & Hydrological Data Service for INGRES Virtual Assistant",
    version="1.0.0"
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:8000,http://127.0.0.1:8000,https://igris.site,https://www.igris.site",
    ).split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

auth_service.initialize_accounts()

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = []
    language: Optional[str] = "en"
    current_location: Optional[Dict[str, Any]] = None

class RWHRequest(BaseModel):
    rooftop_area_sqft: float
    state_name: str
    runoff_coefficient: Optional[float] = 0.85

class CropRequest(BaseModel):
    state_name: str
    block_name: Optional[str] = ""
    current_crop: Optional[str] = "Paddy"

class AssessmentRequest(BaseModel):
    location: str
    audience: Optional[str] = "farmer"


class GoogleCredentialRequest(BaseModel):
    credential: str


def require_user(igris_session: Optional[str] = Cookie(default=None)) -> Dict[str, Any]:
    user = auth_service.verify_session(igris_session)
    if not user:
        raise HTTPException(status_code=401, detail="Sign in with Google to generate an I.G.R.I.S. answer.")
    return user


@app.get("/api/auth/config")
def get_auth_config():
    return auth_service.public_config()


@app.post("/api/auth/google")
def sign_in_with_google(req: GoogleCredentialRequest, response: Response):
    try:
        user = auth_service.verify_google_credential(req.credential)
    except (ValueError, RuntimeError) as error:
        raise HTTPException(status_code=401, detail=str(error)) from error
    response.set_cookie(value=auth_service.create_session(user), **auth_service.cookie_options())
    return {"user": user}


@app.get("/api/auth/me")
def get_current_user(user: Dict[str, Any] = Depends(require_user)):
    return {"user": user}


@app.post("/api/auth/logout")
def sign_out(response: Response):
    response.delete_cookie("igris_session", path="/")
    return {"signed_out": True}


@app.get("/api/conversations")
def get_conversations(user: Dict[str, Any] = Depends(require_user)):
    return {"conversations": auth_service.list_conversations(user["sub"])}


@app.get("/api/conversations/{conversation_id}")
def get_conversation(conversation_id: str, user: Dict[str, Any] = Depends(require_user)):
    conversation = auth_service.get_conversation(user["sub"], conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return {"conversation": conversation}


@app.delete("/api/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, user: Dict[str, Any] = Depends(require_user)):
    if not auth_service.delete_conversation(user["sub"], conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return {"deleted": True}

# ----------------- INTENT & ENTITY EXTRACTION -----------------

ALL_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar", "Chandigarh", "Dadra and Nagar Haveli", "Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
]

def extract_state_from_text(text: str) -> Optional[str]:
    text_lower = text.lower()
    for state in ALL_STATES:
        if state.lower() in text_lower:
            return state
    # Shortcuts
    if "up" in re.findall(r'\b\w+\b', text_lower): return "Uttar Pradesh"
    if "mp" in re.findall(r'\b\w+\b', text_lower): return "Madhya Pradesh"
    if "ap" in re.findall(r'\b\w+\b', text_lower): return "Andhra Pradesh"
    if "tn" in re.findall(r'\b\w+\b', text_lower): return "Tamil Nadu"
    return None


CURRENT_LOCATION_PHRASES = (
    "my area", "my location", "current location", "where i am", "where i live",
    "around me", "near me", "nearby", "here", "my village", "my district",
    "my city", "my farm", "under my feet"
)


def refers_to_current_location(text: str) -> bool:
    normalized = re.sub(r"\s+", " ", text.lower()).strip()
    return any(phrase in normalized for phrase in CURRENT_LOCATION_PHRASES)


def extract_explicit_location_query(text: str) -> Optional[str]:
    """Extract a location only when the user actually names one.

    Sending an entire question to a geocoder can turn ordinary words into an
    unrelated Indian place. This keeps implicit questions tied to GPS context.
    """
    normalized = re.sub(r"\s+", " ", text).strip()
    if refers_to_current_location(normalized):
        return None

    detected_state = extract_state_from_text(normalized)
    if detected_state:
        return detected_state

    named_unit = db_service.find_named_location_in_text(normalized)
    if named_unit:
        return ", ".join(filter(None, [named_unit.get("matched_name"), named_unit.get("state_name")]))

    preposition_match = re.search(
        r"\b(?:in|at|near|around|for|from)\s+([A-Za-z][A-Za-z .'-]{1,70})",
        normalized,
        flags=re.IGNORECASE,
    )
    if preposition_match:
        candidate = preposition_match.group(1)
        candidate = re.split(
            r"\b(?:and|this week|today|tomorrow|right now|should|can|would|with|because)\b",
            candidate,
            maxsplit=1,
            flags=re.IGNORECASE,
        )[0]
        candidate = candidate.strip(" ?.,!-")
        if 2 <= len(candidate) <= 70:
            return candidate

    words = re.findall(r"[A-Za-z][A-Za-z.'-]*", normalized)
    question_words = {"what", "why", "how", "can", "should", "is", "are", "do", "does", "tell", "show", "give"}
    if 1 <= len(words) <= 4 and not any(word.lower() in question_words for word in words):
        return normalized.strip(" ?.,!")
    return None


def get_factsheet_visual_reference(state_name: str) -> Optional[Dict[str, Any]]:
    reference = db_service.get_state_factsheet_reference(state_name)
    if not reference:
        return None
    encoded_state = reference["state_name"].replace(" ", "%20")
    return {
        "state_name": reference["state_name"],
        "source_file": reference["file_name"],
        "pages": [
            {"number": 1, "label": "Quality and state category map", "image_url": f"/api/factsheets/{encoded_state}/pages/1.png"},
            {"number": 2, "label": "Resources, history and recommendations", "image_url": f"/api/factsheets/{encoded_state}/pages/2.png"},
            {"number": 3, "label": "Depth and decadal fluctuation maps", "image_url": f"/api/factsheets/{encoded_state}/pages/3.png"},
        ],
    }

def build_groundwater_assessment(block: Dict[str, Any], state_data: Optional[Dict[str, Any]], audience: str) -> Dict[str, Any]:
    """Convert a classified assessment unit into an auditable, plain-language decision brief."""
    category = block.get("category", "Safe")
    audience = audience if audience in {"farmer", "resident", "business", "officer"} else "farmer"

    category_details = {
        "Safe": {
            "verdict": "Proceed with safeguards",
            "severity": "low",
            "summary": "This assessment unit is classified as Safe in GWRA-2025. Keep extraction efficient so the aquifer remains within sustainable limits.",
            "actions": [
                "Measure pumping hours and fix leaks before adding capacity.",
                "Capture rooftop runoff to replenish the local aquifer.",
                "Test drinking water before consumption; quantity status does not certify quality."
            ]
        },
        "Semi-Critical": {
            "verdict": "Proceed cautiously",
            "severity": "medium",
            "summary": "This assessment unit is Semi-Critical. Groundwater demand is approaching the sustainable limit and any expansion should reduce demand and add recharge first.",
            "actions": [
                "Prefer drip or sprinkler irrigation over flood irrigation.",
                "Add recharge pits or trenches before increasing pumping capacity.",
                "Check seasonal water levels and local permissions before investing in a new borewell."
            ]
        },
        "Critical": {
            "verdict": "Protect first, expand later",
            "severity": "high",
            "summary": "This assessment unit is Critical. Extraction is near the sustainable limit, so new groundwater dependence carries material risk.",
            "actions": [
                "Avoid increasing extraction until a recharge and demand-reduction plan is in place.",
                "Use alternative sources, treated reuse, or stored rainwater where feasible.",
                "Confirm all borewell and abstraction requirements with the competent authority."
            ]
        },
        "Over-Exploited": {
            "verdict": "Do not expand extraction",
            "severity": "critical",
            "summary": "This assessment unit is Over-Exploited: groundwater use exceeds the replenishable resource. Prioritise conservation, recharge, and alternative sources over a new borewell.",
            "actions": [
                "Do not plan new non-essential extraction without checking the applicable CGWA and local requirements.",
                "Shift irrigation to low-water crops and micro-irrigation; avoid flood irrigation.",
                "Build recharge structures and monitor recovery before considering any additional demand."
            ]
        }
    }

    audience_additions = {
        "farmer": "Match irrigation to soil moisture and rainfall; a larger pump does not create more sustainable water.",
        "resident": "Use a certified laboratory test for drinking water and keep roof runoff separate from potable storage unless treated.",
        "business": "Prepare a water balance showing reduction, reuse, recharge, and source alternatives before seeking approvals.",
        "officer": "Prioritise demand management and recharge works in the most stressed units; track outcomes before the next assessment cycle."
    }

    quality = (state_data or {}).get("water_quality", [])
    quality_alerts = [
        {
            "parameter": item.get("parameter"),
            "above_limit_pct": item.get("pct_above_limit"),
            "limit": item.get("permissible_limit")
        }
        for item in quality
        if (item.get("pct_above_limit") or 0) > 0
    ][:3]

    details = category_details[category]
    return {
        "location": {
            "block": block.get("block_name"),
            "district": block.get("district_name"),
            "state": block.get("state_name")
        },
        "classification": category,
        "verdict": details["verdict"],
        "severity": details["severity"],
        "summary": details["summary"],
        "actions": details["actions"] + [audience_additions[audience]],
        "audience": audience,
        "state_metrics": {
            "stage_of_extraction_pct": (state_data or {}).get("stage_of_extraction_pct"),
            "annual_recharge_bcm": (state_data or {}).get("total_annual_recharge"),
            "annual_extraction_bcm": (state_data or {}).get("total_annual_extraction")
        },
        "quality_alerts": quality_alerts,
        "depth_trends": (state_data or {}).get("depth_trends", [])[:2],
        "evidence": {
            "assessment": "CGWB Ground Water Resource Assessment 2025 (GEC-2015)",
            "quality_note": "Water-quality signals are state-level indicators and must not be treated as an exact well-level test.",
            "decision_note": "This is a screening brief, not a statutory clearance or a substitute for a local hydrogeological survey."
        }
    }

# ----------------- API ENDPOINTS -----------------

@app.get("/api/health")
def health_check():
    nat = db_service.get_national_summary()
    return {
        "status": "online",
        "service": "I.G.R.I.S. Core Backend",
        "database": "ingres_master.db (Connected)",
        "total_blocks_indexed": nat.get("total_blocks", 6635),
        "llm_provider": f"OpenAI-compatible gateway ({llm_service.DEFAULT_MODEL})"
    }

@app.get("/api/stats/national")
def get_national_stats():
    return db_service.get_national_summary()

@app.get("/api/states")
def list_states():
    return db_service.get_all_states()

@app.get("/api/states/{state_name}")
def get_state(state_name: str):
    res = db_service.get_state_detail(state_name)
    if not res:
        return {"error": f"State '{state_name}' not found."}
    return res

@app.get("/api/blocks")
def get_blocks(
    query: str = Query("", description="Search term for block or district"),
    state: str = Query("", description="Filter by state"),
    category: str = Query("", description="Filter by Safe, Semi-Critical, Critical, Over-Exploited"),
    limit: int = Query(100, description="Max results")
):
    return db_service.search_blocks(query=query, state=state, category=category, limit=limit)

@app.post("/api/assessment")
def get_groundwater_assessment(req: AssessmentRequest):
    location = req.location.strip()
    if len(location) < 2:
        return {"error": "Enter a block, district, or city name to create a decision brief."}

    state_hint = extract_state_from_text(location) or ""
    block = db_service.find_block_exact_or_fuzzy(location, state_hint=state_hint)
    if not block:
        matches = db_service.search_blocks(query=location, state=state_hint, limit=1)
        block = matches[0] if matches else None
    if not block:
        return {"error": "No assessment unit matched that location. Try the block name, district, and state together."}

    state_data = db_service.get_state_detail(block["state_name"])
    return build_groundwater_assessment(block, state_data, req.audience)

@app.get("/api/local-context")
def get_local_context(lat: float = Query(...), lng: float = Query(...)):
    """Combines browser GPS with live weather and the nearest official groundwater assessment unit."""
    location = db_service.resolve_location_from_coords(lat, lng)
    return {
        "coordinates": {"lat": lat, "lng": lng},
        "location": location,
        "weather": weather_service.get_live_weather(lat, lng),
        "sources": [
            "Browser geolocation (with user permission)",
            "CGWB Ground Water Resource Assessment 2025",
            "Open-Meteo forecast and FAO-56 reference evapotranspiration"
        ]
    }

@app.get("/api/local-context/search")
def search_local_context(query: str = Query(..., min_length=2)):
    """Resolves a typed Indian location, then returns the same local context as GPS."""
    search_result = weather_service.search_location_resilient(query)
    results = search_result["results"]
    if not results:
        return {"error": "Location not found. Try a city, district, block, and state."}

    best_match = results[0]
    location = db_service.resolve_location_from_search(best_match["lat"], best_match["lng"], best_match, query=query)
    location["selected_locality"] = query.strip()
    if search_result["fallback_used"]:
        location["match_method"] = f"Nearby OpenStreetMap match via {search_result['matched_query']} · {location['match_method']}"
    context = {
        "coordinates": {"lat": best_match["lat"], "lng": best_match["lng"]},
        "location": location,
        "weather": weather_service.get_live_weather(best_match["lat"], best_match["lng"]),
        "sources": [
            "OpenStreetMap Nominatim location search",
            "CGWB Ground Water Resource Assessment 2025",
            "Open-Meteo forecast and FAO-56 reference evapotranspiration"
        ]
    }
    context["searched_place"] = best_match
    context["requested_place"] = query.strip()
    context["search_resolution"] = search_result
    return context


@app.get("/api/location/suggest")
def suggest_locations(query: str = Query(..., min_length=3)):
    search_result = weather_service.search_location_resilient(query)
    suggestions = []
    for item in search_result["results"][:5]:
        concise_label = ", ".join(
            value for value in [item.get("city"), item.get("district"), item.get("state")] if value
        )
        suggestions.append({**item, "concise_label": concise_label or item.get("display_name")})
    return {
        "suggestions": suggestions,
        "requested_query": search_result["requested_query"],
        "matched_query": search_result["matched_query"],
        "fallback_used": search_result["fallback_used"],
    }

@app.post("/api/chat")
def process_chat(req: ChatRequest, user: Dict[str, Any] = Depends(require_user)):
    user_msg = req.message.strip()
    if not user_msg:
        raise HTTPException(status_code=400, detail="Enter a groundwater question.")
    try:
        conversation = auth_service.ensure_conversation(user["sub"], req.conversation_id, user_msg)
    except PermissionError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    saved_conversation = auth_service.get_conversation(user["sub"], conversation["id"])
    persisted_history = [
        {"role": message["role"], "content": message["content"]}
        for message in (saved_conversation or {}).get("messages", [])[-12:]
    ]
    detected_state = extract_state_from_text(user_msg)
    explicit_location_query = extract_explicit_location_query(user_msg)
    named_unit = db_service.find_named_location_in_text(user_msg, state_hint=detected_state or "") if explicit_location_query else None
    current_context = req.current_location if isinstance(req.current_location, dict) else None
    
    context_payload = {}
    visualization_payload = None
    state_data = None
    
    # 0. Resolve an explicitly named place. Otherwise use the browser location
    # supplied by the user as the conversation's default geographic context.
    geo_search = weather_service.search_location_resilient(explicit_location_query) if explicit_location_query else None
    geo_results = geo_search["results"] if geo_search else None
    best_geo = None
    if geo_results and len(geo_results) > 0:
        best_geo = geo_results[0]
        context_payload["geocoded_location"] = {
            "display_name": best_geo["display_name"],
            "coordinates": {"lat": best_geo["lat"], "lng": best_geo["lng"]}
        }

        # Fetch real-time weather, ET0, and agro-season for the coordinates
        weather_data = weather_service.get_live_weather(best_geo["lat"], best_geo["lng"])
        if weather_data:
            context_payload["weather_data"] = weather_data

        # Refine state hint using geocoding result if initial NLP failed
        if best_geo.get("state") and not detected_state:
            # Re-run extraction to map to our ALL_STATES format
            detected_state = extract_state_from_text(best_geo["state"]) or best_geo["state"]
        context_payload["location_resolution"] = {
            "mode": "explicit",
            "label": best_geo.get("display_name"),
            "query": explicit_location_query,
            "matched_query": geo_search.get("matched_query"),
            "fallback_used": geo_search.get("fallback_used", False),
        }
    elif explicit_location_query:
        if named_unit:
            detected_state = detected_state or named_unit.get("state_name")
            context_payload["block_data"] = named_unit
        context_payload["location_resolution"] = {
            "mode": "explicit_ungeocoded",
            "label": explicit_location_query,
            "query": explicit_location_query,
        }
    elif current_context:
        current_location = current_context.get("location") or {}
        current_weather = current_context.get("weather")
        current_coordinates = current_context.get("coordinates") or {}
        if current_location:
            context_payload["current_location"] = current_location
            context_payload["location_resolution"] = {
                "mode": "current",
                "label": current_location.get("selected_locality") or current_location.get("nearest_block") or current_location.get("detected_district"),
                "coordinates": current_coordinates,
                "user_referred_to_current_location": refers_to_current_location(user_msg),
            }
            detected_state = detected_state or current_location.get("detected_state")
        if current_weather:
            context_payload["weather_data"] = current_weather


    # 1. State Level Intent
    if detected_state:
        state_data = db_service.get_state_detail(detected_state)
        if state_data:
            context_payload["state_data"] = state_data
            
            # Build Visual Chart Payload
            visualization_payload = {
                "type": "state_analytics",
                "state_name": state_data["state_name"],
                "title": f"Groundwater Profile: {state_data['state_name']}",
                "metrics": {
                    "stage_of_extraction": state_data.get("stage_of_extraction_pct", 0),
                    "total_recharge_bcm": state_data.get("total_annual_recharge", state_data.get("total_recharge_bcm", 0)),
                    "total_extraction_bcm": state_data.get("total_annual_extraction", state_data.get("total_extraction_bcm", 0)),
                    "future_available_bcm": state_data.get("net_availability_future", state_data.get("net_availability_future_bcm", 0))
                },
                "donut_chart": {
                    "labels": ["Irrigation", "Industrial", "Domestic"],
                    "data": [
                        state_data.get("irrigation_extraction", state_data.get("irrigation_extraction_bcm", 0)),
                        state_data.get("industrial_extraction", state_data.get("industrial_extraction_bcm", 0)),
                        state_data.get("domestic_extraction", state_data.get("domestic_extraction_bcm", 0))
                    ]
                },
                "category_breakdown": state_data.get("category_counts", {}),
                "water_quality": state_data.get("water_quality", []),
                "depth_trends": state_data.get("depth_trends"),
                "factsheet": get_factsheet_visual_reference(state_data["state_name"])
            }

    # 2. Block Level Search
    # Combine original user message and the district from geocoding to improve hit rate
    found_block = None
    if best_geo:
        search_query = " ".join(filter(None, [explicit_location_query, best_geo.get("city"), best_geo.get("district")]))
        found_block = db_service.find_block_exact_or_fuzzy(search_query, state_hint=detected_state or "")
    elif explicit_location_query:
        found_block = named_unit or db_service.find_block_exact_or_fuzzy(explicit_location_query, state_hint=detected_state or "")
    elif current_context:
        found_block = (current_context.get("location") or {}).get("block_data")
    else:
        found_block = db_service.find_block_exact_or_fuzzy(user_msg, state_hint=detected_state or "")
    if found_block:
        context_payload["block_data"] = found_block
        if not detected_state and found_block.get("state_name"):
            state_data = db_service.get_state_detail(found_block["state_name"])
            if state_data:
                context_payload["state_data"] = state_data

        visualization_payload = {
            "type": "block_card",
            "title": f"{found_block['block_name']} ({found_block['district_name']}, {found_block['state_name']})",
            "category": found_block["category"],
            "block_name": found_block["block_name"],
            "district_name": found_block["district_name"],
            "state_name": found_block["state_name"],
            "status_color": "#10b981" if found_block["category"] == "Safe" else \
                            "#f59e0b" if found_block["category"] == "Semi-Critical" else \
                            "#f97316" if found_block["category"] == "Critical" else "#ef4444"
        }
        if state_data:
            visualization_payload["state_profile"] = {
                "type": "state_analytics",
                "state_name": state_data["state_name"],
                "title": f"Wider state context: {state_data['state_name']}",
                "metrics": {
                    "stage_of_extraction": state_data.get("stage_of_extraction_pct", 0),
                    "total_recharge_bcm": state_data.get("total_annual_recharge", state_data.get("total_recharge_bcm", 0)),
                    "total_extraction_bcm": state_data.get("total_annual_extraction", state_data.get("total_extraction_bcm", 0)),
                    "future_available_bcm": state_data.get("net_availability_future", state_data.get("net_availability_future_bcm", 0))
                },
                "donut_chart": {
                    "labels": ["Irrigation", "Industrial", "Domestic"],
                    "data": [
                        state_data.get("irrigation_extraction", state_data.get("irrigation_extraction_bcm", 0)),
                        state_data.get("industrial_extraction", state_data.get("industrial_extraction_bcm", 0)),
                        state_data.get("domestic_extraction", state_data.get("domestic_extraction_bcm", 0))
                    ]
                },
                "category_breakdown": state_data.get("category_counts", {}),
                "water_quality": state_data.get("water_quality", []),
                "depth_trends": state_data.get("depth_trends"),
                "factsheet": get_factsheet_visual_reference(state_data["state_name"])
            }

    # 3. National Summary Intent
    if any(k in user_msg.lower() for k in ["national", "all india", "overall", "india summary", "total recharge"]):
        nat = db_service.get_national_summary()
        context_payload["national_data"] = nat
        visualization_payload = {
            "type": "national_summary",
            "title": "All-India Groundwater Resource Assessment (GWRA-2025)",
            "metrics": nat,
            "category_pie": {
                "labels": ["Safe", "Semi-Critical", "Critical", "Over-Exploited"],
                "data": [nat["safe_blocks"], nat["semi_critical_blocks"], nat["critical_blocks"], nat["over_exploited_blocks"]]
            }
        }

    if visualization_payload and context_payload.get("weather_data"):
        visualization_payload["weather"] = context_payload["weather_data"]

    if visualization_payload:
        visualization_payload["visual_plan"] = visualization_service.build_visual_plan(user_msg, context_payload, visualization_payload)
        visualization_payload["visual_catalog"] = visualization_service.catalog_summary()

    # 4. RAG qualitative snippet search
    rag_snippets = rag_service.search_corpus(user_msg, top_k=2)
    if rag_snippets:
        context_payload["knowledge_snippets"] = rag_snippets

    # 5. Call the configured OpenAI-compatible model gateway
    llm_result = llm_service.generate_llm_response(
        user_message=user_msg,
        context_data=context_payload,
        conversation_history=persisted_history or req.history,
        language=req.language
    )

    auth_service.save_exchange(
        user_sub=user["sub"],
        conversation_id=conversation["id"],
        question=user_msg,
        answer=llm_result["text"],
        source=llm_result["source"],
        visualization=visualization_payload,
    )

    return {
        "conversation_id": conversation["id"],
        "reply": llm_result["text"],
        "source": llm_result["source"],
        "visualization": visualization_payload,
        "context_used": bool(context_payload),
        "location_resolution": context_payload.get("location_resolution")
    }

# ----------------- SMART SUGGESTOR ENDPOINTS -----------------

@app.post("/api/suggestor/rwh")
def calculate_rwh(req: RWHRequest):
    """
    Computes annual rainwater harvesting potential:
    Harvested Volume (Liters) = Area (sq.m) * Annual Rainfall (mm) * Runoff Coefficient
    """
    area_sq_m = req.rooftop_area_sqft * 0.092903
    
    # State average rainfall lookup (mm)
    rainfall_map = {
        "Maharashtra": 1200, "Gujarat": 800, "Punjab": 650, "Rajasthan": 550,
        "Karnataka": 1150, "Tamil Nadu": 950, "Kerala": 2900, "Uttar Pradesh": 900,
        "Madhya Pradesh": 1050, "Bihar": 1100, "West Bengal": 1600, "Delhi": 700
    }
    annual_rainfall_mm = rainfall_map.get(req.state_name, 1000)
    
    harvested_liters = area_sq_m * annual_rainfall_mm * req.runoff_coefficient
    tank_size_liters = round(harvested_liters * 0.25, -2) # Standard 25% peak surge tank
    water_tanker_savings_inr = round((harvested_liters / 1000) * 80) # Rs 80 per 1,000L saved
    
    return {
        "state": req.state_name,
        "rooftop_area_sqft": req.rooftop_area_sqft,
        "annual_rainfall_mm": annual_rainfall_mm,
        "annual_harvestable_liters": round(harvested_liters),
        "recommended_tank_capacity_liters": tank_size_liters,
        "estimated_annual_savings_inr": water_tanker_savings_inr,
        "equivalent_family_days": round(harvested_liters / 500) # 500L/day for 4-member family
    }

@app.post("/api/suggestor/crops")
def calculate_crop_advice(req: CropRequest):
    """
    Recommends drought-resistant and low water requirement crops for water-stressed blocks.
    """
    state_detail = db_service.get_state_detail(req.state_name)
    soe = state_detail.get("stage_of_extraction_pct", 60) if state_detail else 60
    is_stressed = soe > 80
    
    crop_recommendations = [
        {
            "crop": "Pearl Millet (Bajra) / Sorghum (Jowar)",
            "water_requirement_mm": "350 - 450 mm",
            "savings_vs_paddy_pct": "75%",
            "subsidy_applicable": "Govt PMKSY & National Millet Mission (Shree Anna)",
            "recommendation_reason": "High drought resilience; thrives with 70% less groundwater."
        },
        {
            "crop": "Mustard / Chickpea (Gram)",
            "water_requirement_mm": "250 - 350 mm",
            "savings_vs_paddy_pct": "80%",
            "subsidy_applicable": "National Food Security Mission (NFSM) Pulse Scheme",
            "recommendation_reason": "Ideal rabi alternative requiring only 1-2 protective irrigations."
        },
        {
            "crop": "Drip-Irrigated Pomegranate / Guava",
            "water_requirement_mm": "400 mm (Precision Drip)",
            "savings_vs_paddy_pct": "60%",
            "subsidy_applicable": "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY - Per Drop More Crop)",
            "recommendation_reason": "High market ROI with 55% micro-irrigation government subsidy."
        }
    ]
    
    return {
        "state_name": req.state_name,
        "stage_of_extraction_pct": soe,
        "is_water_stressed": is_stressed,
        "current_crop_water_drain": "Paddy requires ~1,200 - 1,500 mm water (High Aquifer Depletion Risk)",
        "recommendations": crop_recommendations
    }

@app.get("/api/grid/balancing")
def get_dam_and_aquifer_grid():
    """
    Returns conjunctive surface-to-groundwater balancing recommendations (Dam Surplus -> Dry Aquifer MAR).
    """
    return db_service.get_water_balancing_recommendations()

@app.get("/api/quality")
def get_water_quality(state: str = "", parameter: str = ""):
    """
    Returns water quality contamination records (Arsenic, Fluoride, Salinity, Uranium, Nitrate).
    """
    return db_service.get_all_water_quality(state=state, parameter=parameter)

@app.get("/api/depth-trends")
def get_depth_trends(state: str = ""):
    """
    Returns seasonal depth-to-water level trends across Indian states.
    """
    return db_service.get_all_depth_trends(state=state)


@app.get("/api/visualizations/catalog")
def get_visualization_catalog():
    return visualization_service.catalog_summary()


@app.get("/api/factsheets/{state_name}/pages/{page_number}.png")
def get_factsheet_page(state_name: str, page_number: int):
    reference = db_service.get_state_factsheet_reference(state_name)
    if not reference:
        raise HTTPException(status_code=404, detail="State fact sheet not found.")

    factsheet_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raw", "state_fact_sheets_2025"))
    pdf_path = os.path.abspath(os.path.join(factsheet_dir, reference["file_name"]))
    if os.path.commonpath([factsheet_dir, pdf_path]) != factsheet_dir or not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="State fact sheet file not found.")

    import fitz

    with fitz.open(pdf_path) as document:
        if page_number < 1 or page_number > document.page_count:
            raise HTTPException(status_code=404, detail="Fact sheet page not found.")
        page = document[page_number - 1]
        pixmap = page.get_pixmap(matrix=fitz.Matrix(1.45, 1.45), alpha=False)
        return Response(
            content=pixmap.tobytes("png"),
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=86400"},
        )

@app.get("/api/location/resolve")
def resolve_gps_location(lat: float = Query(18.5204), lng: float = Query(73.8567)):
    """
    Resolves client GPS coordinates to nearest Indian District, Block, Aquifer status, and Borewell rules.
    """
    return db_service.resolve_location_from_coords(lat, lng)



# Mount vanilla HTML/CSS/JS frontend directly at root
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
