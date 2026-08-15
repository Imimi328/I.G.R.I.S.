# 🌊 I.G.R.I.S. (Intelligent Groundwater Resource Insight System)

> **AI-Driven Conversational Virtual Assistant & Analytics Dashboard for INGRES**  
> **Smart India Hackathon (SIH) 2026** | **Problem Statement:** `SIH25066`  
> **Organization:** Ministry of Jal Shakti / Central Ground Water Board (CGWB)  
> **Category:** Software | **Theme:** Smart Automation

---

## 📌 Project Overview
**I.G.R.I.S.** is an intelligent, multilingual virtual assistant designed to serve as the conversational front-door to the **IN-GRES** (India-Groundwater Resource Estimation System) platform. 

It transforms dense national groundwater reports, 36 state fact sheets, and **6,635 granular block-level records** into an instant, location-aware decision assistant for farmers, residents, industries, and policymakers.

![I.G.R.I.S. citizen experience](docs/preview.png)

The assistant understands phrases such as **“my area”** as the user's selected or GPS location, while an explicitly named place overrides that context. It combines official INGRES/CGWB evidence with live weather and transparent location resolution rather than pretending that one block represents every locality.

---

## 🏛️ System Architecture & Data Assets

```
INGRES Government Data & Reports
   │
   ├──> Unified Master Database (SQLite: data/processed/ingres_master.db)
   │      ├── 36 States & UTs Summary (Recharge, Extraction, SoE %)
   │      ├── 6,635 Block Categorizations (Safe, Semi-Critical, Critical, Over-Exploited)
   │      ├── 141 State Water Quality Contamination Records (Fluoride, Arsenic, Nitrate, Uranium)
   │      └── 61 Water Table Depth Trends (Pre vs Post-Monsoon)
   │
   ├──> AI RAG Knowledge Corpus (data/processed/state_factsheets_corpus.json)
   │
   └──> I.G.R.I.S. Conversational Engine
          ├── Context-aware location resolver (GPS, locality, city, district, state)
          ├── Local LLM with evidence-grounded deterministic fallback
          ├── 128 visualization recipes across 12 evidence families
          ├── Live Open-Meteo weather and irrigation context
          └── Original CGWB fact-sheet evidence viewer
```

---

## 📁 Repository Structure

```
.
├── data/
│   ├── processed/
│   │   ├── ingres_master.db                  # Unified SQLite Master Database (6,635 blocks)
│   │   ├── state_factsheets_corpus.json      # Semantic RAG Knowledge Corpus (36 states)
│   │   └── india_all_blocks_categorization_2025.csv # 6,635 Block Records
│   ├── raw/
│   │   ├── cgwb_official/                    # Official CGWB GWRA block categorization PDFs
│   │   ├── state_fact_sheets_2025/           # 36 Official State & UT Fact Sheet PDFs (2025)
│   │   ├── opencity_gw_2024/                 # State & City Ground Water CSV datasets
│   │   └── CGWB_Dynamic_GW_Resources_India_2025.pdf # National Ground Water Assessment Report
│   ├── build_master_database.py              # Master data ingestion pipeline
│   └── generate_pdf_guide.py                 # PDF documentation generator
├── frontend/                                  # Six-page responsive citizen experience
├── server/                                    # FastAPI context, chat, data, and visual APIs
├── docs/                                      # Product screenshots
├── SIH2026_INGRES_AI_Assistant_Complete_Guide.pdf # Complete Project Guide for NotebookLM
└── README.md
```

---

## 🚀 Key Features
1. **Context-aware groundwater copilot**: “My area” uses GPS or the active selection; a named location such as *Kalwad Wasti, Pune* intelligently overrides it.
2. **Resilient neighborhood search**: OpenStreetMap-backed suggestions, spelling/transliteration fallback, exact coordinates, and transparent nearest-assessment matching.
3. **Evidence canvas**: 128 selectable visualization recipes covering resource balance, extraction stress, quality, depth, trends, weather, comparisons, actions, and source evidence.
4. **Original source sheets**: Inspect indexed CGWB state fact-sheet pages in a fit-to-page viewer or a zoomable full-screen evidence dialog.
5. **Citizen workflows**: Dedicated pages for local status, farming decisions, water safety, and rooftop recharge planning.
6. **Multilingual interaction**: English plus all 22 Scheduled Languages of India, language-matched voice input where supported, printable decision briefs, responsive navigation, and keyboard-friendly controls.
7. **Live local context**: Open-Meteo conditions and forecast data turn official annual assessments into practical “what should I do today?” guidance.
8. **Graceful offline intelligence**: When the local language model is unavailable, grounded rules still produce useful answers without inventing official facts.
9. **Private citizen accounts**: Google verifies identity, model generation requires sign-in, and account-owned conversations retain their evidence canvas for later review.

![I.G.R.I.S. conversational evidence canvas](docs/chat-preview.png)

---

## 🧑‍💻 Run Locally

```powershell
cd server
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Open [http://localhost:8000](http://localhost:8000). Location search and weather require internet access. A local OpenAI-compatible model server is optional; the evidence-grounded fallback remains available without one.

### Google sign-in

1. Create an OAuth 2.0 **Web application** in Google Cloud Console.
2. Add `http://localhost:8000` and `http://127.0.0.1:8000` as authorised JavaScript origins.
3. Copy `.env.example` to `.env`, set `GOOGLE_CLIENT_ID`, and generate a long random `AUTH_SESSION_SECRET`.
4. Keep `.env` private. The browser receives only the public client ID; Google credentials are verified server-side and I.G.R.I.S. stores no Google password.

Generated chat is protected by an HTTP-only, SameSite session cookie. Public pages, local searches, weather, official groundwater evidence, and source sheets remain accessible without an account. Private conversations are stored in the ignored runtime database at `data/runtime/igris_accounts.db`.

### Model upgrades

Set `LLM_BASE_URL`, `LLM_MODEL`, and optionally `LLM_API_KEY` to move from the prototype’s local model to any larger OpenAI-compatible local or hosted model. Location resolution, structured evidence retrieval, account security, conversation history, and visual generation remain model-independent.

### Core APIs

- `GET /api/local-context/search?query=...` — resolve a named place and return groundwater plus weather context.
- `GET /api/location/suggest?query=...` — locality autocomplete and transliteration-aware suggestions.
- `POST /api/chat` — context-aware groundwater answers and visualization payloads.
- `GET /api/visualizations/catalog` — the complete visualization recipe catalog.
- `GET /api/factsheets/{state}/pages/{page}.png` — rendered official source-sheet evidence.

---

## 🎬 90-Second Judge Demo
1. Search **Sangrur, Punjab** as a farmer. IGRIS returns **“Do not expand extraction”**, the official *Over-Exploited* classification, Punjab’s resource context, and immediate conservation actions.
2. Switch to **Haveli, Pune, Maharashtra** as a resident. The verdict becomes **“Proceed with safeguards”**, illustrating that the product is location-specific rather than alarmist.
3. Use **Plan recharge** to turn a 1,000 sq ft rooftop into a tangible annual water-capture and storage estimate.
4. Ask the follow-up chat: *“Can I drill a borewell in Sangrur?”* to demonstrate the grounded conversational layer.

The decision brief is an evidence-based screening tool, never a substitute for statutory clearance, a well-level water test, or a local hydrogeological survey.

---

## 👥 Team Emogi (JSPM University, Pune)

**Department:** School of Computational Sciences | **Program:** B.Tech AI/ML (SY)

| # | Member Name | Role | PRN | Profile / Contact |
|:---:|:---|:---|:---:|:---|
| 👑 | **Ritesh Verma** | **Team Leader** | `22558020284` | [emogi.in](http://emogi.in/) • [vritesh328@gmail.com](mailto:vritesh328@gmail.com) |
| 🧑‍💻 | **Utkarsh Mishra** | AI/ML Developer | `22558020277` | [utkarsh13528@gmail.com](mailto:utkarsh13528@gmail.com) |
| 👩‍💻 | **Stuti Priya** | AI/ML Developer | `22558020261` | [jhastuti827@gmail.com](mailto:jhastuti827@gmail.com) |
| 🧑‍💻 | **Parth Wade** | Data & Fullstack | `22558020287` | [parthwade09@gmail.com](mailto:parthwade09@gmail.com) |
| 👩‍💻 | **Swapnali Ubale** | AI/ML Developer | `22558020274` | [swapnaliubale16@gmail.com](mailto:swapnaliubale16@gmail.com) |
| 🧑‍💻 | **Prince Gaur** | Backend & GIS | `22558020067` | [pgaur698@gmail.com](mailto:pgaur698@gmail.com) |

---

## 📜 Problem Statement Details
- **Competition:** Smart India Hackathon (SIH) 2026
- **Problem Statement ID:** `SIH25066`
- **Title:** Development of an AI-driven ChatBOT for INGRES as a virtual assistant
- **Ministry / Organization:** Ministry of Jal Shakti / Central Ground Water Board (CGWB)
- **Theme:** Smart Automation
- **Category:** Software
- **Repository:** [https://github.com/Imimi328/I.G.R.I.S.](https://github.com/Imimi328/I.G.R.I.S.)
