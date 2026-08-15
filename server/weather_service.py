import urllib.request
import urllib.parse
import json
import datetime
import time
import re
from typing import Dict, Any, Optional

WEATHER_CACHE: Dict[str, Any] = {}
LOCATION_CACHE: Dict[str, Any] = {}
LAST_NOMINATIM_REQUEST_AT = 0.0

def get_current_agro_season() -> Dict[str, str]:
    now = datetime.datetime.now()
    month = now.month
    month_name = now.strftime("%B")
    
    if 6 <= month <= 10:
        season = "Kharif (Monsoon Season)"
        phase = "Active Sowing & Vegetative Growth Phase"
        primary_crops = ["Pearl Millet (Bajra)", "Sorghum (Jowar)", "Moong / Urad Dal", "Soybean", "Groundnut", "Pigeon Pea (Arhar/Tur)"]
    elif month in [11, 12, 1, 2, 3]:
        season = "Rabi (Winter Season)"
        phase = "Sowing & Tillering Phase"
        primary_crops = ["Chickpea (Gram)", "Mustard / Rapeseed", "Wheat (Drip Irrigated)", "Barley", "Lentils (Masoor)"]
    else:
        season = "Zaid (Summer Season)"
        phase = "Pre-Monsoon Short Season"
        primary_crops = ["Green Gram (Moong)", "Cowpea", "Sesame (Til)", "Cucumbers / Melons", "Fodder Sorghum"]
        
    return {
        "season_name": season,
        "phase": phase,
        "current_month": month_name,
        "primary_crops": primary_crops
    }

def get_live_weather(lat: float, lng: float) -> Dict[str, Any]:
    cache_key = f"{round(lat, 2)}_{round(lng, 2)}"
    now = datetime.datetime.now()
    
    if cache_key in WEATHER_CACHE:
        cached_time, cached_data = WEATHER_CACHE[cache_key]
        if (now - cached_time).total_seconds() < 1800: # 30 min cache
            return cached_data

    url = (
        f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}"
        f"&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m"
        f"&daily=precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min,uv_index_max"
        f"&timezone=auto&forecast_days=7"
    )
    
    weather_codes = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Fog", 48: "Depositing rime fog",
        51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
        61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
        80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
        95: "Thunderstorm"
    }

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "IGRIS-Groundwater-System/1.0"})
        with urllib.request.urlopen(req, timeout=6) as response:
            data = json.loads(response.read().decode("utf-8"))
            
            curr = data.get("current", {})
            daily = data.get("daily", {})
            
            w_code = curr.get("weather_code", 0)
            condition = weather_codes.get(w_code, "Partly cloudy / Monsoon skies")
            
            rain_next_7_days = sum(daily.get("precipitation_sum", [0]))
            avg_et0 = sum(daily.get("et0_fao_evapotranspiration", [3.5])) / max(len(daily.get("et0_fao_evapotranspiration", [1])), 1)
            
            temp = curr.get("temperature_2m", 28.0)
            humidity = curr.get("relative_humidity_2m", 70)
            precip = curr.get("precipitation", 0.0)
            wind = curr.get("wind_speed_10m", 12.0)
            
            # Dynamic Smart Irrigation Decision
            if rain_next_7_days > 15.0 or precip > 2.0:
                irrigation_advice = f"🌧️ Monsoon Rainfall Forecast ({round(rain_next_7_days, 1)} mm in next 7 days). Postpone tubewell pumping to conserve groundwater and power."
                irrigation_action = "Pause Tubewell Irrigation"
                irrigation_status = "Rainfall Sufficient"
            elif avg_et0 > 4.5 and rain_next_7_days < 5.0:
                irrigation_advice = f"☀️ High Evapotranspiration ({round(avg_et0, 1)} mm/day) & low rain. Use early-morning micro-drip irrigation to avoid moisture stress."
                irrigation_action = "Targeted Drip Irrigation"
                irrigation_status = "Moderate Deficit"
            else:
                irrigation_advice = f"⛅ Normal Atmospheric Demand (ET0 {round(avg_et0, 1)} mm/day). Maintain regular soil moisture without flood irrigation."
                irrigation_action = "Optimal Maintenance"
                irrigation_status = "Balanced"

            result = {
                "temperature_c": temp,
                "apparent_temperature_c": curr.get("apparent_temperature", temp),
                "humidity_pct": humidity,
                "condition": condition,
                "current_rain_mm": precip,
                "wind_speed_kmh": wind,
                "wind_gusts_kmh": curr.get("wind_gusts_10m", wind),
                "rain_next_7_days_mm": round(rain_next_7_days, 1),
                "daily_rainfall_forecast": daily.get("precipitation_sum", []),
                "daily_forecast": [
                    {
                        "date": date,
                        "rain_mm": daily.get("precipitation_sum", [])[index],
                        "rain_probability_pct": daily.get("precipitation_probability_max", [0] * 7)[index],
                        "temp_max_c": daily.get("temperature_2m_max", [0] * 7)[index],
                        "temp_min_c": daily.get("temperature_2m_min", [0] * 7)[index],
                        "et0_mm": daily.get("et0_fao_evapotranspiration", [0] * 7)[index],
                        "uv_index_max": daily.get("uv_index_max", [0] * 7)[index]
                    }
                    for index, date in enumerate(daily.get("time", []))
                ],
                "avg_evapotranspiration_mm_day": round(avg_et0, 2),
                "smart_irrigation": {
                    "status": irrigation_status,
                    "action": irrigation_action,
                    "advice": irrigation_advice
                },
                "season_context": get_current_agro_season(),
                "source": "Open-Meteo forecast and FAO-56 reference evapotranspiration",
                "observed_at": curr.get("time")
            }
            
            WEATHER_CACHE[cache_key] = (now, result)
            return result
            
    except Exception as e:
        print(f"[Warning] Open-Meteo fetch failed: {e}. Using seasonal default.")
        season = get_current_agro_season()
        return {
            "temperature_c": 28.5,
            "apparent_temperature_c": 30.0,
            "humidity_pct": 72,
            "condition": "Monsoon / Seasonal Atmosphere",
            "current_rain_mm": 1.5,
            "wind_speed_kmh": 14.0,
            "wind_gusts_kmh": 18.0,
            "rain_next_7_days_mm": 18.4,
            "daily_rainfall_forecast": [3.2, 4.1, 2.8, 5.0, 1.2, 0.8, 1.3],
            "daily_forecast": [],
            "avg_evapotranspiration_mm_day": 3.4,
            "smart_irrigation": {
                "status": "Rainfall Sufficient",
                "action": "Pause Tubewell Irrigation",
                "advice": "Monsoon activity detected. Utilize natural soil moisture to prevent groundwater depletion."
            },
            "season_context": season,
            "source": "Agro-meteorological baseline (live forecast unavailable)",
            "observed_at": None
        }

def get_location_from_nominatim(query: str) -> Optional[Dict[str, Any]]:
    clean_query = query.strip()
    if not clean_query:
        return None

    cache_key = clean_query.lower()
    cached = LOCATION_CACHE.get(cache_key)
    if cached and (datetime.datetime.now() - cached[0]).total_seconds() < 86400:
        return cached[1]

    global LAST_NOMINATIM_REQUEST_AT
    remaining_wait = 1 - (time.monotonic() - LAST_NOMINATIM_REQUEST_AT)
    if remaining_wait > 0:
        time.sleep(remaining_wait)
        
    url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(clean_query)}&countrycodes=in&addressdetails=1&limit=5"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "IGRIS-SIH2026-Groundwater-Assistant/1.0"})
        with urllib.request.urlopen(req, timeout=6) as response:
            LAST_NOMINATIM_REQUEST_AT = time.monotonic()
            data = json.loads(response.read().decode("utf-8"))
            if data and len(data) > 0:
                results = []
                for item in data:
                    addr = item.get("address", {})
                    state = addr.get("state", "")
                    district = addr.get("state_district", addr.get("county", addr.get("city", "")))
                    city = addr.get("city", addr.get("town", addr.get("village", addr.get("suburb", ""))))
                    
                    results.append({
                        "display_name": item.get("display_name"),
                        "lat": float(item.get("lat")),
                        "lng": float(item.get("lon")),
                        "state": state,
                        "district": district,
                        "city": city,
                        "type": item.get("type", "location")
                    })
                LOCATION_CACHE[cache_key] = (datetime.datetime.now(), results)
                return results
    except Exception as e:
        print(f"[Warning] Nominatim search failed: {e}")
        return None


def get_location_search_variants(query: str) -> list[str]:
    clean_query = re.sub(r"\s+", " ", query).strip(" ,")
    if not clean_query:
        return []

    variants = [clean_query]
    transliterated = re.sub(r"\bwasti\b", "vasti", clean_query, flags=re.IGNORECASE)
    if transliterated.lower() != clean_query.lower():
        variants.append(transliterated)

    parts = [part.strip() for part in clean_query.split(",") if part.strip()]
    if parts:
        locality_words = parts[0].split()
        removable_suffixes = {"wasti", "vasti", "vasthi", "basti", "colony", "chowk", "area", "locality"}
        simplified_words = [word for word in locality_words if word.lower().strip(".-") not in removable_suffixes]
        if simplified_words and simplified_words != locality_words:
            simplified = ", ".join([" ".join(simplified_words), *parts[1:]])
            variants.append(simplified)

    unique_variants = []
    for variant in variants:
        if variant.lower() not in {item.lower() for item in unique_variants}:
            unique_variants.append(variant)
    return unique_variants[:3]


def search_location_resilient(query: str) -> Dict[str, Any]:
    variants = get_location_search_variants(query)
    for index, variant in enumerate(variants):
        results = get_location_from_nominatim(variant)
        if results:
            return {
                "results": results,
                "requested_query": query.strip(),
                "matched_query": variant,
                "fallback_used": index > 0,
                "confidence": "exact" if index == 0 else "nearby",
            }
    return {
        "results": [],
        "requested_query": query.strip(),
        "matched_query": None,
        "fallback_used": False,
        "confidence": "not_found",
    }
