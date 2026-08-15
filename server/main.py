import os
import sys
import re
import sqlite3
from typing import List, Dict, Any, Optional

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import db_service
import rag_service
import llm_service

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

@app.post("/api/chat")
def process_chat(req: ChatRequest):
    user_msg = req.message.strip()
    detected_state = extract_state_from_text(user_msg)
    
    context_payload = {}
    visualization_payload = None
    
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
                    "total_recharge_bcm": state_data.get("total_recharge_bcm", 0),
                    "total_extraction_bcm": state_data.get("total_extraction_bcm", 0),
                    "future_available_bcm": state_data.get("net_future_availability_bcm", 0)
                },
                "donut_chart": {
                    "labels": ["Irrigation", "Industrial", "Domestic"],
                    "data": [
                        state_data.get("irrigation_extraction_bcm", 0),
                        state_data.get("industrial_extraction_bcm", 0),
                        state_data.get("domestic_extraction_bcm", 0)
                    ]
                },
                "category_breakdown": state_data.get("category_counts", {}),
                "water_quality": state_data.get("water_quality", []),
                "depth_trends": state_data.get("depth_trends")
            }

    # 2. Block Level Search if state not directly found or specific block queried
    if not detected_state or "block" in user_msg.lower() or "village" in user_msg.lower() or "tubewell" in user_msg.lower() or "borewell" in user_msg.lower():
        words = re.findall(r'\b[A-Za-z]{3,}\b', user_msg)
        # Skip stop words
        stop_words = {"what", "where", "how", "tell", "about", "is", "it", "safe", "borewell", "tubewell", "groundwater", "water", "status", "category", "in", "the", "for", "please", "can", "dig", "drill", "pump"}
        candidate_words = [w for w in words if w.lower() not in stop_words and w.lower() not in [s.lower() for s in ALL_STATES]]
        
        found_block = None
        for candidate in candidate_words:
            found_block = db_service.find_block_exact_or_fuzzy(candidate, state_hint=detected_state or "")
            if found_block:
                break
                
        if found_block:
            context_payload["block_data"] = found_block
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
