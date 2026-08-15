import sqlite3
import os
import re
from typing import List, Dict, Any, Optional

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "processed", "ingres_master.db"))

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def format_category(raw_cat: Optional[str]) -> str:
    if not raw_cat:
        return "Safe"
    cat_lower = str(raw_cat).strip().lower().replace("_", "-").replace(" ", "-")
    if "over" in cat_lower:
        return "Over-Exploited"
    if "semi" in cat_lower:
        return "Semi-Critical"
    if "crit" in cat_lower:
        return "Critical"
    return "Safe"

def get_national_summary() -> Dict[str, Any]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # State aggregates
        cursor.execute("""
            SELECT 
                COUNT(*) as total_states,
                SUM(total_annual_recharge) as national_recharge_bcm,
                SUM(total_annual_extraction) as national_extraction_bcm,
                SUM(annual_extractable_resource) as national_extractable_bcm,
                SUM(irrigation_extraction) as national_irrigation_bcm,
                SUM(industrial_extraction) as national_industrial_bcm,
                SUM(domestic_extraction) as national_domestic_bcm,
                ROUND(AVG(stage_of_extraction_pct), 2) as avg_state_soe
            FROM states_summary
        """)
        state_totals = dict(cursor.fetchone())
        
        # Block categorization counts
        cursor.execute("""
            SELECT categorization as category, COUNT(*) as count 
            FROM blocks_categorization 
            GROUP BY categorization
        """)
        raw_counts = {row["category"]: row["count"] for row in cursor.fetchall()}
        
        block_counts = {
            "Safe": raw_counts.get("safe", 4945),
            "Semi-Critical": raw_counts.get("semi_critical", 759),
            "Critical": raw_counts.get("critical", 201),
            "Over-Exploited": raw_counts.get("over_exploited", 730)
        }
        total_blocks = sum(block_counts.values())
        
        nat_recharge = state_totals["national_extractable_bcm"] or 398.0
        nat_extraction = state_totals["national_extraction_bcm"] or 248.8
        national_soe = round((nat_extraction / nat_recharge) * 100, 2) if nat_recharge else 59.2
        
        return {
            "national_recharge_bcm": round(state_totals["national_recharge_bcm"] or 449.1, 2),
            "national_extractable_bcm": round(state_totals["national_extractable_bcm"] or 407.2, 2),
            "national_extraction_bcm": round(state_totals["national_extraction_bcm"] or 248.8, 2),
            "national_irrigation_bcm": round(state_totals["national_irrigation_bcm"] or 220.5, 2),
            "national_industrial_bcm": round(state_totals["national_industrial_bcm"] or 9.5, 2),
            "national_domestic_bcm": round(state_totals["national_domestic_bcm"] or 18.8, 2),
            "national_soe_pct": national_soe,
            "total_blocks": total_blocks,
            "safe_blocks": block_counts["Safe"],
            "semi_critical_blocks": block_counts["Semi-Critical"],
            "critical_blocks": block_counts["Critical"],
            "over_exploited_blocks": block_counts["Over-Exploited"],
            "safe_pct": round((block_counts["Safe"] / total_blocks) * 100, 1) if total_blocks else 74.5,
            "semi_critical_pct": round((block_counts["Semi-Critical"] / total_blocks) * 100, 1) if total_blocks else 11.4,
            "critical_pct": round((block_counts["Critical"] / total_blocks) * 100, 1) if total_blocks else 3.0,
            "over_exploited_pct": round((block_counts["Over-Exploited"] / total_blocks) * 100, 1) if total_blocks else 11.0,
        }

def get_all_states() -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM states_summary ORDER BY stage_of_extraction_pct DESC")
        return [dict(row) for row in cursor.fetchall()]

def get_state_detail(state_name: str) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM states_summary 
            WHERE LOWER(state_name) LIKE ? OR LOWER(state_name) LIKE ?
            LIMIT 1
        """, (f"%{state_name.lower()}%", f"{state_name.lower()}%"))
        state_row = cursor.fetchone()
        if not state_row:
            return None
        
        state_data = dict(state_row)
        clean_state_name = state_data["state_name"]
        
        # Add alias fields for consistent downstream consumption
        state_data["total_recharge_bcm"] = state_data.get("total_annual_recharge", 0)
        state_data["total_extraction_bcm"] = state_data.get("total_annual_extraction", 0)
        state_data["irrigation_extraction_bcm"] = state_data.get("irrigation_extraction", 0)
        state_data["industrial_extraction_bcm"] = state_data.get("industrial_extraction", 0)
        state_data["domestic_extraction_bcm"] = state_data.get("domestic_extraction", 0)
        state_data["net_availability_future_bcm"] = state_data.get("net_availability_future", 0)
        state_data["future_available_bcm"] = state_data.get("net_availability_future", 0)
        state_data["annual_extractable_bcm"] = state_data.get("annual_extractable_resource", 0)
        
        # Block categorization counts for this state
        cursor.execute("""
            SELECT categorization as category, COUNT(*) as count 
            FROM blocks_categorization 
            WHERE LOWER(state) LIKE ?
            GROUP BY categorization
        """, (f"%{clean_state_name.lower()}%",))
        raw_categories = {row["category"]: row["count"] for row in cursor.fetchall()}
        state_data["category_counts"] = {
            "Safe": raw_categories.get("safe", 0),
            "Semi-Critical": raw_categories.get("semi_critical", 0),
            "Critical": raw_categories.get("critical", 0),
            "Over-Exploited": raw_categories.get("over_exploited", 0)
        }
        
        # Water Quality
        cursor.execute("""
            SELECT parameter, num_samples, permissible_limit, samples_above_limit, pct_above_limit 
            FROM state_water_quality 
            WHERE LOWER(state_name) LIKE ?
        """, (f"%{clean_state_name.lower()}%",))
        state_data["water_quality"] = [dict(r) for r in cursor.fetchall()]
        
        # Depth Trends
        cursor.execute("""
            SELECT season, depth_summary 
            FROM state_depth_trends 
            WHERE LOWER(state_name) LIKE ?
        """, (f"%{clean_state_name.lower()}%",))
        state_data["depth_trends"] = [dict(r) for r in cursor.fetchall()]
        
        return state_data

def search_blocks(query: str = "", state: str = "", category: str = "", limit: int = 100) -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        sql = "SELECT id, state as state_name, district as district_name, block_name, categorization as category FROM blocks_categorization WHERE 1=1"
        params = []
        
        if query:
            sql += " AND (LOWER(block_name) LIKE ? OR LOWER(district) LIKE ?)"
            params.extend([f"%{query.lower()}%", f"%{query.lower()}%"])
        if state:
            sql += " AND LOWER(state) LIKE ?"
            params.append(f"%{state.lower()}%")
        if category:
            cat_query = "over_exploited" if "over" in category.lower() else \
                        "semi_critical" if "semi" in category.lower() else \
                        "critical" if "crit" in category.lower() else "safe"
            sql += " AND LOWER(categorization) = ?"
            params.append(cat_query)
            
        sql += " ORDER BY state, district, block_name LIMIT ?"
        params.append(limit)
        
        cursor.execute(sql, params)
        results = []
        for row in cursor.fetchall():
            d = dict(row)
            d["category"] = format_category(d["category"])
            results.append(d)
        return results

def find_block_exact_or_fuzzy(user_msg_or_block: str, state_hint: str = "") -> Optional[Dict[str, Any]]:
    import re
    # Extract candidate alphanumeric tokens
    tokens = re.findall(r'\b[A-Za-z0-9\-\_]{3,}\b', user_msg_or_block)
    STOP_WORDS = {
        'what', 'where', 'how', 'when', 'why', 'who', 'which', 'tell', 'about', 'is', 'it', 
        'are', 'was', 'were', 'safe', 'borewell', 'tubewell', 'groundwater', 'water', 'status', 
        'category', 'in', 'the', 'for', 'please', 'can', 'dig', 'drill', 'drilling', 'pump', 
        'and', 'or', 'of', 'at', 'to', 'with', 'from', 'by', 'on', 'issues', 'issue', 'quality', 
        'table', 'depth', 'feasibility', 'permit', 'permission', 'clearance', 'official', 'my', 
        'area', 'location', 'village', 'block', 'district', 'state', 'city', 'house', 'home', 
        'doing', 'do', 'extract', 'extraction', 'recharge', 'bcm', 'here', 'there', 'view', 
        'check', 'show', 'give', 'me', 'find', 'get', 'data', 'report', 'like', 'think', 'idea',
        'want', 'live', 'sell', 'others', 'will', 'just', 'how', 'that'
    }
    candidates = [t for t in tokens if t.lower() not in STOP_WORDS]
    if not candidates:
        candidates = [user_msg_or_block.strip()]

    with get_db_connection() as conn:
        cursor = conn.cursor()
        select_sql = "SELECT id, state as state_name, district as district_name, block_name, categorization as category FROM blocks_categorization"
        
        # 1. Exact block match within state_hint
        if state_hint:
            for cand in candidates:
                cursor.execute(f"{select_sql} WHERE LOWER(block_name) = ? AND LOWER(state) LIKE ? LIMIT 1", (cand.lower(), f"%{state_hint.lower()}%"))
                r = cursor.fetchone()
                if r:
                    d = dict(r)
                    d["category"] = format_category(d["category"])
                    return d
                    
        # 2. Exact block match anywhere only when no state has been resolved
        if not state_hint:
            for cand in candidates:
                cursor.execute(f"{select_sql} WHERE LOWER(block_name) = ? LIMIT 1", (cand.lower(),))
                r = cursor.fetchone()
                if r:
                    d = dict(r)
                    d["category"] = format_category(d["category"])
                    return d

        # 3. Exact district match within state_hint
        if state_hint:
            for cand in candidates:
                cursor.execute(f"{select_sql} WHERE LOWER(district) = ? AND LOWER(state) LIKE ? LIMIT 1", (cand.lower(), f"%{state_hint.lower()}%"))
                r = cursor.fetchone()
                if r:
                    d = dict(r)
                    d["category"] = format_category(d["category"])
                    return d
                    
        # 4. Exact district match anywhere only when no state has been resolved
        if not state_hint:
            for cand in candidates:
                cursor.execute(f"{select_sql} WHERE LOWER(district) = ? LIMIT 1", (cand.lower(),))
                r = cursor.fetchone()
                if r:
                    d = dict(r)
                    d["category"] = format_category(d["category"])
                    return d

        # 5. Prefix match STRICTLY within state_hint if given
        if state_hint:
            for cand in candidates:
                if len(cand) < 3: continue
                cursor.execute(f"""
                    {select_sql}
                    WHERE (LOWER(block_name) LIKE ? OR LOWER(district) LIKE ?) AND LOWER(state) LIKE ?
                    LIMIT 1
                """, (f"{cand.lower()}%", f"{cand.lower()}%", f"%{state_hint.lower()}%"))
                r = cursor.fetchone()
                if r:
                    d = dict(r)
                    d["category"] = format_category(d["category"])
                    return d
        else:
            # Only if NO state_hint was given, do a broad prefix match
            for cand in candidates:
                if len(cand) < 3: continue
                cursor.execute(f"""
                    {select_sql}
                    WHERE LOWER(block_name) LIKE ? OR LOWER(district) LIKE ?
                    LIMIT 1
                """, (f"{cand.lower()}%", f"{cand.lower()}%"))
                r = cursor.fetchone()
                if r:
                    d = dict(r)
                    d["category"] = format_category(d["category"])
                    return d

        return None


def find_named_location_in_text(text: str, state_hint: str = "") -> Optional[Dict[str, Any]]:
    tokens = re.findall(r"[A-Za-z][A-Za-z'-]*", text)
    if not tokens:
        return None
    candidates = []
    for width in range(min(4, len(tokens)), 0, -1):
        for index in range(0, len(tokens) - width + 1):
            candidate = " ".join(tokens[index:index + width]).lower()
            if len(candidate) >= 3 and candidate not in candidates:
                candidates.append(candidate)

    with get_db_connection() as conn:
        cursor = conn.cursor()
        base_sql = """
            SELECT id, state AS state_name, district AS district_name, block_name, categorization AS category
            FROM blocks_categorization
            WHERE (LOWER(district) = ? OR LOWER(REPLACE(block_name, '_', ' ')) = ?)
        """
        for candidate in candidates:
            params = [candidate, candidate]
            sql = base_sql
            if state_hint:
                sql += " AND LOWER(state) LIKE ?"
                params.append(f"%{state_hint.lower()}%")
            sql += " ORDER BY CASE WHEN LOWER(district) = ? THEN 0 ELSE 1 END LIMIT 1"
            params.append(candidate)
            cursor.execute(sql, params)
            row = cursor.fetchone()
            if row:
                result = dict(row)
                result["category"] = format_category(result["category"])
                result["matched_name"] = candidate
                result["matched_kind"] = "district" if result["district_name"].lower() == candidate else "block"
                return result
    return None


def get_water_balancing_recommendations() -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT s.state_name, s.stage_of_extraction_pct, s.total_annual_recharge, s.total_annual_extraction,
                   COUNT(b.id) as over_exploited_count
            FROM states_summary s
            JOIN blocks_categorization b ON LOWER(s.state_name) = LOWER(b.state)
            WHERE LOWER(b.categorization) LIKE '%over%'
            GROUP BY s.state_name
            ORDER BY over_exploited_count DESC
            LIMIT 10
        """)
        results = []
        for row in cursor.fetchall():
            state = row["state_name"]
            oe_count = row["over_exploited_count"]
            soe = row["stage_of_extraction_pct"]
            
            strategy = "Construct Managed Aquifer Recharge (MAR) shafts and injection wells using seasonal canal overflow."
            diversion_source = "Regional River Basin / Major Reservoir Monsoon Surplus"
            target_storage_potential_mcm = round(oe_count * 15.5, 1)
            
            if "punjab" in state.lower() or "haryana" in state.lower():
                diversion_source = "Sutlej-Yamuna / Bhakra Nangal Monsoon Flood Runoff"
                strategy = "Divert excess monsoon releases via existing canal network into abandoned deep tubewells for deep aquifer injection."
            elif "rajasthan" in state.lower():
                diversion_source = "Indira Gandhi Canal Surplus & Chambal Basin Monsoon Spills"
                strategy = "Deploy farm recharge ponds, check dams with recharge shafts in critical hard-rock and alluvial zones."
            elif "tamil nadu" in state.lower():
                diversion_source = "Cauvery & Vaigai Monsoon Overflow + Tank Cascade Interlinking"
                strategy = "Desilt historical temple tanks & cascade systems to act as percolation basins for shallow aquifers."
            elif "gujarat" in state.lower():
                diversion_source = "Narmada Main Canal & Sardar Sarovar Flood Spills (SAUNI Yojana Model)"
                strategy = "Pump surplus surface water into check dams and recharge wells across Saurashtra & North Gujarat."
            elif "maharashtra" in state.lower():
                diversion_source = "Krishna & Godavari Basin Surplus"
                strategy = "Rejuvenate decentralized watershed structures (Continuous Contour Trenches, Deep CCT) in Marathwada & Vidarbha."

            results.append({
                "state_name": state,
                "over_exploited_blocks": oe_count,
                "stage_of_extraction_pct": soe,
                "priority": "CRITICAL" if soe > 100 else "HIGH",
                "recommended_source": diversion_source,
                "strategy": strategy,
                "estimated_recharge_potential_mcm": target_storage_potential_mcm
            })
        return results

def get_all_water_quality(state: str = "", parameter: str = "") -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        sql = "SELECT state_name, parameter, num_samples, permissible_limit, samples_above_limit, pct_above_limit FROM state_water_quality WHERE 1=1"
        params = []
        if state:
            sql += " AND LOWER(state_name) LIKE ?"
            params.append(f"%{state.lower()}%")
        if parameter:
            sql += " AND LOWER(parameter) LIKE ?"
            params.append(f"%{parameter.lower()}%")
        sql += " ORDER BY pct_above_limit DESC, state_name"
        cursor.execute(sql, params)
        return [dict(r) for r in cursor.fetchall()]

def get_all_depth_trends(state: str = "") -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        sql = "SELECT state_name, season, depth_summary FROM state_depth_trends WHERE 1=1"
        params = []
        if state:
            sql += " AND LOWER(state_name) LIKE ?"
            params.append(f"%{state.lower()}%")
        sql += " ORDER BY state_name, season"
        cursor.execute(sql, params)
        return [dict(r) for r in cursor.fetchall()]


def get_state_factsheet_reference(state: str) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT state_name, file_name
            FROM state_factsheet_fulltext
            WHERE LOWER(state_name) LIKE ?
            LIMIT 1
            """,
            (f"%{state.lower()}%",),
        )
        row = cursor.fetchone()
        return dict(row) if row else None

INDIAN_DISTRICT_CENTROIDS = [
    {"district": "Pune", "state": "Maharashtra", "lat": 18.5204, "lng": 73.8567, "default_block": "Haveli"},
    {"district": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lng": 72.8777, "default_block": "Mumbai City"},
    {"district": "Nagpur", "state": "Maharashtra", "lat": 21.1458, "lng": 79.0882, "default_block": "Nagpur (Rural)"},
    {"district": "Nashik", "state": "Maharashtra", "lat": 19.9975, "lng": 73.7898, "default_block": "Nashik"},
    {"district": "Aurangabad", "state": "Maharashtra", "lat": 19.8762, "lng": 75.3433, "default_block": "Aurangabad"},
    {"district": "Sangrur", "state": "Punjab", "lat": 30.2458, "lng": 75.8421, "default_block": "Sangrur"},
    {"district": "Ludhiana", "state": "Punjab", "lat": 30.9010, "lng": 75.8573, "default_block": "Ludhiana-1"},
    {"district": "Amritsar", "state": "Punjab", "lat": 31.6340, "lng": 74.8723, "default_block": "Amritsar-I"},
    {"district": "Jaipur", "state": "Rajasthan", "lat": 26.9124, "lng": 75.7873, "default_block": "Amber"},
    {"district": "Jodhpur", "state": "Rajasthan", "lat": 26.2389, "lng": 73.0243, "default_block": "Mandore"},
    {"district": "Ahmedabad", "state": "Gujarat", "lat": 23.0225, "lng": 72.5714, "default_block": "Daskroi"},
    {"district": "Surat", "state": "Gujarat", "lat": 21.1702, "lng": 72.8311, "default_block": "Chorasi"},
    {"district": "Bengaluru", "state": "Karnataka", "lat": 12.9716, "lng": 77.5946, "default_block": "Bengaluru South"},
    {"district": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lng": 80.2707, "default_block": "Chennai"},
    {"district": "Coimbatore", "state": "Tamil Nadu", "lat": 11.0168, "lng": 76.9558, "default_block": "Coimbatore"},
    {"district": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8467, "lng": 80.9462, "default_block": "Bakshi Ka Talab"},
    {"district": "Varanasi", "state": "Uttar Pradesh", "lat": 25.3176, "lng": 82.9739, "default_block": "Varanasi"},
    {"district": "Bhopal", "state": "Madhya Pradesh", "lat": 23.2599, "lng": 77.4126, "default_block": "Huzur"},
    {"district": "Indore", "state": "Madhya Pradesh", "lat": 22.7196, "lng": 75.8577, "default_block": "Indore"},
    {"district": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lng": 88.3639, "default_block": "Kolkata"},
    {"district": "Patna", "state": "Bihar", "lat": 25.5941, "lng": 85.1376, "default_block": "Patna Sadar"},
    {"district": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lng": 78.4867, "default_block": "Serilingampally"},
    {"district": "New Delhi", "state": "Delhi", "lat": 28.6139, "lng": 77.2090, "default_block": "Chanakyapuri"},
    {"district": "Gurugram", "state": "Haryana", "lat": 28.4595, "lng": 77.0266, "default_block": "Gurugram"},
    {"district": "Kurukshetra", "state": "Haryana", "lat": 29.9695, "lng": 76.8783, "default_block": "Thanesar"},
    {"district": "Guwahati", "state": "Assam", "lat": 26.1445, "lng": 91.7362, "default_block": "Kamrup"},
    {"district": "Thiruvananthapuram", "state": "Kerala", "lat": 8.5241, "lng": 76.9366, "default_block": "Thiruvananthapuram"},
    {"district": "Kochi", "state": "Kerala", "lat": 9.9312, "lng": 76.2673, "default_block": "Kanayannur"},
    {"district": "Bhubaneswar", "state": "Odisha", "lat": 20.2961, "lng": 85.8245, "default_block": "Bhubaneswar"}
]

def resolve_location_from_coords(lat: float, lng: float) -> Dict[str, Any]:
    import math
    best_dist = float('inf')
    best_loc = INDIAN_DISTRICT_CENTROIDS[0]

    for item in INDIAN_DISTRICT_CENTROIDS:
        d = math.sqrt((item["lat"] - lat) ** 2 + (item["lng"] - lng) ** 2)
        if d < best_dist:
            best_dist = d
            best_loc = item

    state = best_loc["state"]
    district = best_loc["district"]
    default_block = best_loc.get("default_block", "")

    # Query block detail
    block_detail = find_block_exact_or_fuzzy(default_block, state_hint=state)
    state_detail = get_state_detail(state)
    water_quality = get_all_water_quality(state=state)
    depth_trends = get_all_depth_trends(state=state)

    cat = block_detail.get("category", "Safe") if block_detail else "Safe"
    is_safe = cat == "Safe"

    return {
        "detected_state": state,
        "detected_district": district,
        "nearest_block": block_detail.get("block_name", default_block) if block_detail else default_block,
        "category": cat,
        "lat": lat,
        "lng": lng,
        "block_data": block_detail,
        "state_data": state_detail,
        "water_quality": water_quality[:4],
        "depth_trends": depth_trends[:3],
        "borewell_verdict": {
            "is_permissible": is_safe,
            "status": "Permissible without restriction" if is_safe else "CGWA Clearance NOC Strictly Mandatory",
            "advice": "Aquifer extraction within sustainable limits." if is_safe else "Over-exploited groundwater zone! Compulsory 100-200% artificial recharge required."
        }
    }


def resolve_location_from_search(lat: float, lng: float, searched_place: Dict[str, Any], query: str = "") -> Dict[str, Any]:
    """Build a local context from the place returned by geocoding, without snapping it to a city centroid."""
    raw_state = str(searched_place.get("state") or "").strip()
    raw_district = str(searched_place.get("district") or "").strip()
    raw_city = str(searched_place.get("city") or "").strip()
    state_detail = get_state_detail(raw_state) if raw_state else None
    state = state_detail.get("state_name", raw_state) if state_detail else raw_state
    state_filter = state.lower() if state else "__unmatched_state__"

    def clean_name(value: str) -> str:
        return " ".join(value.lower().replace("district", "").split())

    candidates = []
    for value in (raw_district, raw_city, query):
        value = str(value or "").strip()
        if value and value.lower() not in {item.lower() for item in candidates}:
            candidates.append(value)

    block_detail = None
    match_method = "No matching official assessment unit"
    nearby_centroids = [
        item for item in INDIAN_DISTRICT_CENTROIDS
        if clean_name(item["state"]) == clean_name(state)
        and (
            clean_name(item["district"]) == clean_name(raw_district)
            or clean_name(item["district"]) == clean_name(raw_city)
        )
    ]
    if nearby_centroids:
        nearest_centroid = min(
            nearby_centroids,
            key=lambda item: (item["lat"] - lat) ** 2 + (item["lng"] - lng) ** 2,
        )
        block_detail = find_block_exact_or_fuzzy(nearest_centroid.get("default_block", ""), state_hint=state)
        if block_detail:
            match_method = "Nearest indexed assessment unit for the matched city"

    with get_db_connection() as conn:
        cursor = conn.cursor()
        for candidate in candidates if not block_detail else []:
            cursor.execute(
                """
                SELECT id, state AS state_name, district AS district_name, block_name, categorization AS category
                FROM blocks_categorization
                WHERE LOWER(district) = ? AND LOWER(state) LIKE ?
                ORDER BY block_name
                LIMIT 1
                """,
                (clean_name(candidate), f"%{state_filter}%"),
            )
            row = cursor.fetchone()
            if row:
                block_detail = dict(row)
                block_detail["category"] = format_category(block_detail["category"])
                match_method = "District-level official assessment unit"
                break

        if not block_detail:
            for candidate in candidates:
                cursor.execute(
                    """
                    SELECT id, state AS state_name, district AS district_name, block_name, categorization AS category
                    FROM blocks_categorization
                    WHERE LOWER(block_name) = ? AND LOWER(state) LIKE ?
                    LIMIT 1
                    """,
                    (clean_name(candidate), f"%{state_filter}%"),
                )
                row = cursor.fetchone()
                if row:
                    block_detail = dict(row)
                    block_detail["category"] = format_category(block_detail["category"])
                    match_method = "Block-level official assessment unit"
                    break

    district = raw_district or raw_city or "Selected locality"
    locality_label = raw_city or raw_district or query or "Selected locality"
    category = block_detail.get("category") if block_detail else "Assessment unit unavailable"
    water_quality = get_all_water_quality(state=state) if state else []
    depth_trends = get_all_depth_trends(state=state) if state else []

    return {
        "detected_state": state or "State not identified",
        "detected_district": district,
        "nearest_block": block_detail.get("block_name") if block_detail else "No exact assessment unit indexed",
        "category": category,
        "lat": lat,
        "lng": lng,
        "block_data": block_detail,
        "state_data": state_detail,
        "water_quality": water_quality[:4],
        "depth_trends": depth_trends[:3],
        "selected_locality": locality_label,
        "match_method": match_method,
        "borewell_verdict": {
            "is_permissible": category == "Safe",
            "status": "Permissible without restriction" if category == "Safe" else "Verify the nearest official assessment unit before drilling",
            "advice": "Aquifer extraction is classified as safe in the matched official unit." if category == "Safe" else "This search result is not a well-level clearance. Use the local CGWA/CGWB process before drilling or expanding extraction."
        }
    }
