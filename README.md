# 🌊 I.G.R.I.S. (Intelligent Groundwater Resource Insight System)

> **AI-Driven Conversational Virtual Assistant & Analytics Dashboard for INGRES**  
> **Smart India Hackathon (SIH) 2026** | **Problem Statement:** `SIH25066`  
> **Organization:** Ministry of Jal Shakti / Central Ground Water Board (CGWB)  
> **Category:** Software | **Theme:** Smart Automation

---

## 📌 Project Overview
**I.G.R.I.S.** is an intelligent, multilingual virtual assistant designed to serve as the conversational front-door to the **IN-GRES** (India-Groundwater Resource Estimation System) platform. 

It transforms dense national groundwater compilation reports, 36 state fact sheets, and **6,635 granular block-level records** into an instant, interactive decision-support assistant for farmers, industries, citizens, and policymakers.

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
   └──> IGRIS Conversational Engine
          ├── NL2SQL Query Router (Instant factual answers)
          ├── Multilingual Support (Hindi & English)
          ├── Interactive Visualizations (Charts & Gauges)
          └── Leaflet GIS Maps (Color-coded block danger overlays)
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
├── SIH2026_INGRES_AI_Assistant_Complete_Guide.pdf # Complete Project Guide for NotebookLM
└── README.md
```

---

## 🚀 Key Features
1. **Plain-Language Water Inquiries**: Ask questions like *"Is it safe to dig a tube-well in Sangrur, Punjab?"* or *"Compare groundwater recharge in Gujarat and Maharashtra."*
2. **Regulatory & NOC Guidance**: Advises industries on CGWA compliance and rainwater recharge mandates in over-exploited zones.
3. **Visual Analytics**: Instant rendering of donut charts (Irrigation vs Domestic vs Industrial extraction) and Stage of Extraction gauges.
4. **Offline-First & Fast**: Powered by an indexed, local SQLite database containing 100% of India's block records with optional live API sync.

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

