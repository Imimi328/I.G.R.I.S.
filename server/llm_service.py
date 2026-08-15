import requests
import json
import re
from typing import Dict, Any, List, Optional

LMSTUDIO_URL = "http://localhost:1234/v1/chat/completions"
DEFAULT_MODEL = "gemma-4-e2b-it"

def generate_llm_response(
    user_message: str, 
    context_data: Optional[Dict[str, Any]] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    language: str = "en"
) -> Dict[str, Any]:
    
    # Strict language determination
    is_hindi = language == "hi" or bool(re.search(r'[\u0900-\u097F]', user_message))
    lang_name = "Hindi (हिंदी)" if is_hindi else "English"
    
    # Clean structured data representation
    evidence_text = ""
    if context_data:
        evidence_text = "\n[OFFICIAL CGWB & GWRA-2025 VERIFIED DATA]:\n"
        if "block_data" in context_data:
            b = context_data["block_data"]
            evidence_text += f"- Assessment Unit: {b.get('block_name')} Block, {b.get('district_name')} District, {b.get('state_name')}\n"
            evidence_text += f"- Official Categorization: {b.get('category')} (GWRA-2025 / GEC-2015)\n"
            if b.get("category") == "Over-Exploited":
                evidence_text += "- Regulatory Clearance: Extraction exceeds 100% of replenishable recharge. Prohibited for new non-drinking tubewells without CGWA NOC. Mandatory 100-200% artificial recharge.\n"
            elif b.get("category") == "Safe":
                evidence_text += "- Regulatory Clearance: Sustainable aquifer limits. Tubewells permissible for agriculture and drinking.\n"
        
        if "state_data" in context_data:
            s = context_data["state_data"]
            evidence_text += f"- State/UT: {s.get('state_name')}\n"
            evidence_text += f"- Annual Ground Water Recharge: {s.get('total_recharge_bcm')} BCM\n"
            evidence_text += f"- Total Annual Extraction: {s.get('total_extraction_bcm')} BCM\n"
            evidence_text += f"- Stage of Extraction (SoE): {s.get('stage_of_extraction_pct')}%\n"
            evidence_text += f"- Irrigation Usage: {s.get('irrigation_extraction_bcm')} BCM\n"
            evidence_text += f"- Domestic Usage: {s.get('domestic_extraction_bcm')} BCM\n"
            evidence_text += f"- Industrial Usage: {s.get('industrial_extraction_bcm')} BCM\n"
            evidence_text += f"- Future Available Allocation: {s.get('net_availability_future_bcm')} BCM\n"
            
            if "water_quality" in s and s["water_quality"]:
                wq_summary = [f"{q['parameter']} ({q['pct_above_limit']}% samples > BIS limit {q['permissible_limit']})" for q in s["water_quality"][:4]]
                evidence_text += f"- Water Quality Contaminants: {', '.join(wq_summary)}\n"

            if "depth_trends" in s and s["depth_trends"]:
                depth_summary = [f"{d['season']} ({d['depth_summary']})" for d in s["depth_trends"][:2]]
                evidence_text += f"- Seasonal Water Level Depth Trends: {'; '.join(depth_summary)}\n"

        if "national_data" in context_data:
            n = context_data["national_data"]
            evidence_text += f"- National Annual Recharge: {n.get('national_recharge_bcm')} BCM\n"
            evidence_text += f"- National Annual Extraction: {n.get('national_extraction_bcm')} BCM\n"
            evidence_text += f"- National Stage of Extraction: {n.get('national_soe_pct')}%\n"
            evidence_text += f"- Total Assessment Units: {n.get('total_blocks')} Blocks (Safe: {n.get('safe_blocks')}, Semi-Critical: {n.get('semi_critical_blocks')}, Critical: {n.get('critical_blocks')}, Over-Exploited: {n.get('over_exploited_blocks')})\n"

        if "knowledge_snippets" in context_data:
            evidence_text += "\n[QUALITATIVE FACTSHEET CITATIONS]:\n"
            for snip in context_data["knowledge_snippets"]:
                evidence_text += f"- {snip.get('state_name')}: {snip.get('summary')}\n"

    system_instruction = f"""You are I.G.R.I.S. (Intelligent Groundwater Resource Insight System), the official AI virtual assistant for the Ministry of Jal Shakti / CGWB (Central Ground Water Board) INGRES platform.

MANDATORY LANGUAGE RULES:
- The user is communicating in {lang_name}.
- You MUST write your ENTIRE answer strictly and fluently in {lang_name}.
- If the language is English: Use ONLY clear, polished English. Do NOT output Hindi words or Devanagari text.
- If the language is Hindi: Use standard Hindi in Devanagari script.

CONTENT & TONE RULES:
- Ground your answer in the official CGWB verified data provided below.
- Give direct, authoritative, and actionable hydrological insights with clean bullet points and section headers.
- Explain the real-world impact (whether borewells are permissible, CGWA NOC requirements, water quality risks like Fluoride/Arsenic, and low-water crop suggestions).
"""

    user_prompt = f"User Question: {user_message}\n{evidence_text}\n\nProvide an authoritative, detailed, and helpful response in {lang_name}:"

    messages = [
        {"role": "system", "content": system_instruction},
    ]
    
    if conversation_history:
        for msg in conversation_history[-3:]:
            messages.append(msg)
            
    messages.append({"role": "user", "content": user_prompt})

    payload = {
        "model": DEFAULT_MODEL,
        "messages": messages,
        "temperature": 0.15,
        "max_tokens": 1000
    }

    try:
        resp = requests.post(LMSTUDIO_URL, json=payload, timeout=25)
        if resp.status_code == 200:
            data = resp.json()
            reply = data["choices"][0]["message"]["content"].strip()
            
            # Verify language integrity
            if not is_hindi and bool(re.search(r'[\u0900-\u097F]', reply[:100])):
                # If model mistakenly generated Hindi for an English query, fallback to deterministic English
                return {
                    "text": generate_deterministic_fallback(user_message, context_data, is_hindi=False),
                    "source": "IGRIS Grounded Hydro-Engine"
                }
                
            return {
                "text": reply,
                "source": f"LMStudio ({DEFAULT_MODEL})"
            }
    except Exception as e:
        print(f"[Warning] LMStudio call failed: {e}. Using deterministic fallback.")

    return {
        "text": generate_deterministic_fallback(user_message, context_data, is_hindi),
        "source": "IGRIS Grounded Hydro-Engine"
    }

def generate_deterministic_fallback(user_message: str, context: Optional[Dict[str, Any]], is_hindi: bool = False) -> str:
    if not context:
        if is_hindi:
            return "मैं I.G.R.I.S. हूँ - भारत के राष्ट्रीय भूजल पोर्टल (INGRES) का AI वर्चुअल असिस्टेंट। आप भारत के किसी भी राज्य, जिले या ब्लॉक के भूजल स्तर, दोहन दर और बोरवेल अनुमति के बारे में पूछ सकते हैं।"
        return "I am I.G.R.I.S., your official AI virtual assistant for the national INGRES groundwater portal (Ministry of Jal Shakti / CGWB). Ask me about any State, District, or Block across India to get verified extraction percentages, seasonal water table depths, water quality contaminants, and borewell safety recommendations."

    if "block_data" in context:
        b = context["block_data"]
        cat = b.get("category", "Safe")
        block = b.get("block_name", "Unknown")
        dist = b.get("district_name", "")
        state = b.get("state_name", "")
        
        status_icon = "🟢" if cat == "Safe" else "🟡" if cat == "Semi-Critical" else "🟠" if cat == "Critical" else "🔴"
        
        if is_hindi:
            advice = "इस ब्लॉक में नलकूप (बोरवेल) लगाने की अनुमति है। भूजल स्तर बनाए रखने के लिए वर्षा जल संचयन करें।" if cat == "Safe" else \
                     "यह क्षेत्र अत्यधिक दोहित (Over-Exploited) है। नए बोरवेल के लिए CGWA से NOC अनिवार्य है और 100% वर्षा जल पुनर्भरण आवश्यक है।" if cat == "Over-Exploited" else \
                     "भूजल तनावग्रस्त है। सूक्ष्म सिंचाई (ड्रिप/स्प्रिंकलर) और जल संरक्षण संरचनाएं अनिवार्य हैं।"
                     
            return f"{status_icon} **{block} ब्लॉक का आधिकारिक भूजल मूल्यांकन ({dist}, {state})**:\n\n" \
                   f"- **आधिकारिक श्रेणी (GWRA-2025):** `{cat}`\n" \
                   f"- **जिला:** {dist}\n" \
                   f"- **राज्य:** {state}\n\n" \
                   f"**हाइड्रोजियोलॉजिकल सलाह एवं नियामक नियम:**\n{advice}"

        advice = "Tubewell drilling is permissible for domestic and agricultural purposes under safe aquifer limits. Construct rooftop recharge pits to ensure sustainable recharge." if cat == "Safe" else \
                 "Annual groundwater extraction exceeds annual replenishable recharge (SoE > 100%). Strictly avoid water-intensive crops (paddy/sugarcane). Any commercial/industrial extraction strictly requires a CGWA NOC with mandatory 100-200% artificial recharge." if cat == "Over-Exploited" else \
                 "Groundwater is under stress (70-90% SoE). Mandatory water conservation structures and micro-irrigation (drip/sprinkler) are strongly recommended."
                 
        return f"{status_icon} **Official Groundwater Assessment for {block} ({dist}, {state})**:\n\n" \
               f"- **Official Categorization (GWRA-2025):** `{cat}`\n" \
               f"- **District:** {dist}\n" \
               f"- **State:** {state}\n\n" \
               f"**Hydrogeological Recommendation & Regulatory Advice:**\n{advice}"

    if "state_data" in context:
        s = context["state_data"]
        state = s.get("state_name", "India")
        recharge = s.get("total_recharge_bcm", 0)
        extraction = s.get("total_extraction_bcm", 0)
        soe = s.get("stage_of_extraction_pct", 0)
        
        wq_text = ""
        if "water_quality" in s and s["water_quality"]:
            wq_list = [f"`{q['parameter']}` ({q['pct_above_limit']}% samples > BIS limit {q['permissible_limit']})" for q in s["water_quality"][:3]]
            wq_text = f"\n- **Key Contaminants (BIS IS 10500):** {', '.join(wq_list)}"
            
        depth_text = ""
        if "depth_trends" in s and s["depth_trends"]:
            depth_list = [f"{d['season']}: {d['depth_summary']}" for d in s["depth_trends"][:2]]
            depth_text = f"\n- **Seasonal Depth-to-Water Trends:** {'; '.join(depth_list)}"

        if is_hindi:
            return f"📊 **{state} का आधिकारिक भूजल सारांश (GWRA-2025):**\n\n" \
                   f"- **वार्षिक भूजल पुनर्भरण:** `{recharge} BCM`\n" \
                   f"- **कुल वार्षिक निष्कर्षण:** `{extraction} BCM`\n" \
                   f"- **दोहन दर (SoE):** `{soe}%`\n" \
                   f"- **सिंचाई उपयोग:** `{s.get('irrigation_extraction_bcm', 0)} BCM`\n" \
                   f"- **औद्योगिक उपयोग:** `{s.get('industrial_extraction_bcm', 0)} BCM`\n" \
                   f"- **घरेलू उपयोग:** `{s.get('domestic_extraction_bcm', 0)} BCM`" + wq_text + depth_text

        return f"📊 **Official Groundwater Resource Summary for {state} (GWRA-2025):**\n\n" \
               f"- **Annual Ground Water Recharge:** `{recharge} BCM`\n" \
               f"- **Total Annual Extraction:** `{extraction} BCM`\n" \
               f"- **Stage of Extraction (SoE):** `{soe}%`\n" \
               f"- **Irrigation Usage:** `{s.get('irrigation_extraction_bcm', 0)} BCM`\n" \
               f"- **Industrial Usage:** `{s.get('industrial_extraction_bcm', 0)} BCM`\n" \
               f"- **Domestic Usage:** `{s.get('domestic_extraction_bcm', 0)} BCM`\n" \
               f"- **Net Allocation for Future Use:** `{s.get('net_availability_future_bcm', 0)} BCM`" + wq_text + depth_text

    return "Official groundwater assessment record retrieved. Please inspect the visual charts and summary data displayed above."
