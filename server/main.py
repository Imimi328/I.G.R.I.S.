import os
import sys
import re
import sqlite3
from typing import List, Dict, Any, Optional

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import db_service
import rag_service
import llm_service
import weather_service

app = FastAPI(
    title="I.G.R.I.S. API Engine",
    description="Backend AI & Hydrological Data Service for INGRES Virtual Assistant",
    version="1.0.0"
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = "default"
    history: Optional[List[Dict[str, str]]] = []
    language: Optional[str] = "en"

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
        "llm_provider": f"LMStudio ({llm_service.DEFAULT_MODEL})"
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

@app.post("/api/chat")
def process_chat(req: ChatRequest):
    user_msg = req.message.strip()
    detected_state = extract_state_from_text(user_msg)
    
    context_payload = {}
    visualization_payload = None
    
    # 0. Advanced Geolocation & Weather Intent
    # Attempt to resolve any location mentioned in the user message via OpenStreetMap
    geo_results = weather_service.get_location_from_nominatim(user_msg)
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


    # 1. State Level Intent
    if detected_state:
        state_data = db_service.get_state_detail(detected_state)
        if state_data:
            context_payload["state_data"] = state_data
            
            # Build Visual Chart Payload
            visualization_payload = {
                "type": "state_analytics",
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
                "depth_trends": state_data.get("depth_trends")
            }

    # 2. Block Level Search
    # Combine original user message and the district from geocoding to improve hit rate
    search_query = user_msg
    if best_geo and best_geo.get("district"):
        search_query += f" {best_geo['district']}"

    found_block = db_service.find_block_exact_or_fuzzy(search_query, state_hint=detected_state or "")
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

    # 4. RAG qualitative snippet search
    rag_snippets = rag_service.search_corpus(user_msg, top_k=2)
    if rag_snippets:
        context_payload["knowledge_snippets"] = rag_snippets

    # 5. Call LMStudio (gemma-4-e2b-it)
    llm_result = llm_service.generate_llm_response(
        user_message=user_msg,
        context_data=context_payload,
        conversation_history=req.history,
        language=req.language
    )

    return {
        "reply": llm_result["text"],
        "source": llm_result["source"],
        "visualization": visualization_payload,
        "context_used": bool(context_payload)
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
