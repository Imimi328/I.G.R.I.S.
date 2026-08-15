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
├── agent/                                    # Project memory, architecture & documentation
│   ├── memory.md                             # Long-term project memory & discoveries
│   ├── tasks.md                              # Backlog and completed tasks
│   ├── architecture.md                       # System architecture specification
│   ├── rules.md                              # Development rules
│   └── problem_and_solution_guide.md         # Illustrated domain guide
├── data/
│   ├── processed/
│   │   ├── ingres_master.db                  # Unified SQLite Master Database
│   │   ├── state_factsheets_corpus.json      # Semantic RAG Knowledge Corpus
│   │   └── india_all_blocks_categorization_2025.csv # 6,635 Block Records
│   ├── raw/                                  # Raw CGWB official PDFs & OpenCity CSVs
│   │   ├── cgwb_official/
│   │   ├── state_fact_sheets_2025/           # 36 State Fact Sheets (2025)
│   │   └── opencity_gw_2024/                 # State & City CSVs
│   ├── build_master_database.py              # Master data ingestion pipeline
│   └── generate_pdf_guide.py                 # PDF generation script
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

## 👥 Team
- **Project:** SIH 2026 - Problem Statement SIH25066
- **Repository:** [https://github.com/Imimi328/I.G.R.I.S.](https://github.com/Imimi328/I.G.R.I.S.)
