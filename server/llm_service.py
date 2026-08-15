import requests
import json
import re
from typing import Dict, Any, List, Optional

LMSTUDIO_URL = "http://localhost:1234/v1/chat/completions"
DEFAULT_MODEL = "gemma-4-e2b-it"

SYSTEM_PROMPT = """You are I.G.R.I.S. (Intelligent Groundwater Resource Insight System), an official AI virtual assistant for the Ministry of Jal Shakti / CGWB (Central Ground Water Board) INGRES platform.

Your mission is to provide clear, actionable, accurate, and easy-to-understand groundwater insights to farmers, industries, citizens, and policymakers across India based on the official Ground Water Resource Assessment (GWRA-2025) and GEC-2015 methodology.

Guidelines:
1. Categorization Rules:
   - Safe (SoE <= 70%): Sustainable; borewells permitted without restriction.
   - Semi-Critical (70% < SoE <= 90%): Caution advised; artificial recharge recommended.
   - Critical (90% < SoE <= 100%): Severe stress; no new non-drinking tubewells without CGWA clearance.
   - Over-Exploited (SoE > 100%): Extraction exceeds annual recharge! CGWA NOC strictly required with mandatory 100-200% artificial recharge. High water consumption crops (paddy/sugarcane) strongly discouraged.
2. Tone: Professional, helpful, empathetic to farmers and clear for non-technical citizens. Support English, Hindi, and transliterated queries.
3. Be concise and use bullet points with emoji icons.
"""

def generate_llm_response(
    user_message: str, 
    context_data: Optional[Dict[str, Any]] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    language: str = "en"
) -> Dict[str, Any]:
    
    # Build prompt with injected database/RAG facts
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    # Append history if any
    if conversation_history:
        for msg in conversation_history[-4:]:
            messages.append(msg)
            
    # Injected Context
    prompt_content = f"User Question: {user_message}\n"
    if context_data:
        prompt_content += f"\n[OFFICIAL CGWB VERIFIED DATA FOR THIS QUERY]:\n{json.dumps(context_data, indent=2)}\n"
        prompt_content += "\nUse the above exact verified numbers in your response to ensure 100% factual accuracy."
        
    messages.append({"role": "user", "content": prompt_content})
    
    payload = {
        "model": DEFAULT_MODEL,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 800
    }
    
    try:
        resp = requests.post(LMSTUDIO_URL, json=payload, timeout=20)
        if resp.status_code == 200:
            data = resp.json()
            reply = data["choices"][0]["message"]["content"].strip()
            return {
                "text": reply,
                "source": f"LMStudio ({DEFAULT_MODEL})"
            }
    except Exception as e:
        print(f"[Warning] LMStudio call failed ({e}). Using deterministic fallback.")
        
    # Fallback if LMStudio is not currently running
    return {
        "text": generate_deterministic_fallback(user_message, context_data),
        "source": "IGRIS Rule Engine (Fallback)"
    }

def generate_deterministic_fallback(user_message: str, context: Optional[Dict[str, Any]]) -> str:
    if not context:
        return "I am I.G.R.I.S., your virtual assistant for India's groundwater portal (INGRES). Ask me about any State, District, or Block in India to get verified water table depths, extraction percentages, and borewell safety recommendations!"
        
    if "block_data" in context:
        b = context["block_data"]
        cat = b.get("category", "Safe")
        block = b.get("block_name", "Unknown")
        dist = b.get("district_name", "")
        state = b.get("state_name", "")
        
        status_emoji = "🟢" if cat == "Safe" else "🟡" if cat == "Semi-Critical" else "🟠" if cat == "Critical" else "🔴"
        advice = "Tubewell digging is permissible. Practice rooftop rainwater harvesting to maintain water table." if cat == "Safe" else \
                 "Water extraction exceeds natural recharge! Avoid paddy/sugarcane and apply for CGWA NOC with mandatory artificial recharge." if cat == "Over-Exploited" else \
                 "Groundwater is under stress. Mandatory water conservation and check dams recommended."
                 
        return f"{status_emoji} **Groundwater Assessment for {block} ({dist}, {state})**:\n\n" \
               f"- **Official Categorization:** `{cat}`\n" \
               f"- **District:** {dist}\n" \
               f"- **State:** {state}\n\n" \
               f"**Hydrogeological Recommendation:**\n{advice}"
               
    if "state_data" in context:
        s = context["state_data"]
        state = s.get("state_name", "India")
        recharge = s.get("total_recharge_bcm", 0)
        extraction = s.get("total_extraction_bcm", 0)
        soe = s.get("stage_of_extraction_pct", 0)
        
        return f"📊 **Official Groundwater Summary for {state} (GWRA-2025):**\n\n" \
               f"- **Annual Ground Water Recharge:** `{recharge} BCM`\n" \
               f"- **Total Annual Extraction:** `{extraction} BCM`\n" \
               f"- **Stage of Extraction (SoE):** `{soe}%`\n" \
               f"- **Irrigation Usage:** `{s.get('irrigation_extraction_bcm', 0)} BCM`\n" \
               f"- **Industrial Usage:** `{s.get('industrial_extraction_bcm', 0)} BCM`\n" \
               f"- **Domestic Usage:** `{s.get('domestic_extraction_bcm', 0)} BCM`"
               
    return "Official groundwater assessment record found. Please review the chart and details displayed above."
