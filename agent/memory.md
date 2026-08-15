# 📝 Memory

This file acts as the project's long-term memory. It should be updated whenever we discover new requirements, context, API limits, or any important domain knowledge during the SIH 2026 hackathon.

## Project Context
- **Hackathon:** Smart India Hackathon (SIH) 2026
- **Problem Statement:** SIH25066
- **Title:** Development of an AI-driven ChatBOT for INGRES as a virtual assistant
- **Project Name:** **IGRIS** (**I**ntelligent **G**roundwater **R**esource **I**nsight **S**ystem / **I**NGRES **G**roundwater **R**etrieval & **I**ntelligence **S**ystem)
- **GitHub Repository:** [https://github.com/Imimi328/I.G.R.I.S.](https://github.com/Imimi328/I.G.R.I.S.)
- **Organization:** Ministry of Jal Shakti / Central Ground Water Board (CGWB)
- **Category:** Software
- **Theme:** Smart Automation
- **Current State:** Research & Data Ingestion complete. Ready for implementation.

## What is INGRES?
**IN-GRES** = **INdia-Groundwater Resource Estimation System**
- A GIS-based web application built by **CGWB + IIT-Hyderabad**.
- It is the national standard platform for periodic assessment of India's dynamic groundwater resources.
- Uses the **GEC-2015 methodology** (Ground Water Resource Estimation Committee).

### Data INGRES Holds
- Annual Ground Water Recharge
- Annual Extractable Ground Water Resources
- Total Annual Ground Water Extraction
- Stage of Groundwater Extraction (SoE)
- Historical assessments (2020, 2022, 2023, 2024, 2025)
- Spatial/GIS boundary layers (state, district, basin, sub-basin)
- Rainfall data, aquifer types, recharge worthiness

### INGRES Categorization System
| Category | Stage of Extraction |
|---|---|
| Safe | ≤ 70% |
| Semi-Critical | > 70% and ≤ 90% |
| Critical | > 90% and ≤ 100% |
| Over-exploited | > 100% |
| Saline | Predominantly saline water |

### Related Platforms
- **WIMS** (Water Information and Management System) — real-time DWLR data via NWIC
- **India-WRIS** — public water level & resource data dissemination
- **GEC Dashboard** — the public-facing dashboard for INGRES data

## Important Decisions & Discoveries
- **05/Aug/2026:** Reviewed all 100 SIH problem statements from PDF. Gemini recommended SIH25031, Opus recommended SIH25092.
- **15/Aug/2026:** Locked in **SIH25066** for the internal hackathon. Began deep research on INGRES and CGWB.
- **15/Aug/2026:** Downloaded all available groundwater data from CGWB and OpenCity.in.
- **15/Aug/2026:** Discovered the Parse.bot `ingres.iith.ac.in` API specification (7 endpoints) mapping national summary down to block-level and water level data.
- **15/Aug/2026:** Downloaded and parsed official CGWB Ground Water Resource Assessment datasets including block-wise categorization for all 6,635 blocks across India.
- **15/Aug/2026:** Created comprehensive illustrated guide [`agent/problem_and_solution_guide.md`](file:///r:/Downlads/SIH2026/agent/problem_and_solution_guide.md) and generated the NotebookLM-ready PDF [`SIH2026_INGRES_AI_Assistant_Complete_Guide.pdf`](file:///r:/Downlads/SIH2026/SIH2026_INGRES_AI_Assistant_Complete_Guide.pdf).

## Data Inventory

### Processed Datasets (`data/processed/`)
| File | Records / Size | Description |
|------|----------------|-------------|
| `ingres_master.db` | **1.05 MB (SQLite)** | **Unified Master Database** with 5 relational tables: `states_summary` (36), `blocks_categorization` (6,635), `state_water_quality` (141), `state_depth_trends` (61), `state_factsheet_fulltext` (36), `city_groundwater` (8) |
| `state_factsheets_corpus.json` | **274.6 KB** | Full-text knowledge corpus of all 36 state fact sheets for AI RAG semantic search |
| `india_all_blocks_categorization_2025.csv` | **6,635 blocks** | Full all-India block-wise assessment data (State, District, Block Name, Category) |

### Downloaded Raw Data (`data/raw/`)
| File | Size | Description |
|------|------|-------------|
| `cgwb_official/Block_wise_Categorization_GWRA_2025.pdf` | 0.91 MB | Official 97-page block-wise categorization (2025) |
| `cgwb_official/Block_wise_Categorization_GWRA_2024.pdf` | 1.47 MB | Official block-wise categorization (2024) |
| `cgwb_official/Block_wise_Categorization_GWRA_2023.pdf` | 1.47 MB | Official block-wise categorization (2023) |
| `cgwb_official/State_UT_Fact_Sheets_GW_2025_Links.pdf` | 0.13 MB | Direct download links for all 36 States/UTs fact sheets |
| `state_fact_sheets_2025/* (36 PDFs)` | ~40 MB | Individual in-depth fact sheets for all 36 States & UTs (2025) |
| `cgwb_official/GEC_2015_Methodology_Guidelines.pdf` | 5.49 MB | Official GEC-2015 Resource Estimation Guidelines |
| `CGWB_Dynamic_GW_Resources_India_2025.pdf` | 10.2 MB | Official national compilation report (2025) |
| `opencity_gw_2024/India_Groundwater_...States_Level_2024.csv` | 3.6 KB | State-wise GW availability, extraction, SoE (2024) |
| `opencity_gw_2024/* (12 CSV files)` | ~35 KB | District/City level extraction data across states |

### All-India GWRA 2025 Categorization Stats:
- **Safe:** 4,945 blocks (74.5%)
- **Semi-Critical:** 759 blocks (11.4%)
- **Over-Exploited:** 730 blocks (11.0%)
- **Critical:** 201 blocks (3.0%)

### CSV Column Schema (State-Level Data)
`Sl. No | Name of State/UT | Monsoon season recharge from rainfall (bcm) | Monsoon season recharge from other sources | Non-monsoon season recharge from rainfall | Non-monsoon season recharge from other sources | Total annual groundwater recharge | Total Natural Discharges | Annual Extractable Groundwater Resource | Irrigation - Annual extraction | Industrial - Annual extraction | Domestic - Annual Extraction | Total Annual Extraction | Annual GW Allocation for domestic use (2025) | Net GW availability for future | Stage of GW extraction (%)`

### INGRES API Endpoints (Parse.bot Scraper Spec)
1. `get_assessment_years` -> List of assessment cycles (e.g. 2024-2025, 2023-2024)
2. `get_country_summary` -> All-India national level summary statistics
3. `get_state_list` -> All states & UTs with area, recharge, extraction, SoE, locationUUID
4. `get_state_data` -> District-level metrics & category classification for a specific state
5. `get_district_data` -> Block-level metrics, water levels, and trend analysis for a district
6. `get_report_list` -> List of uploaded assessment reports by year
7. `search_location` -> Case-insensitive search for states/districts by name with UUIDs

## Technical Notes
- INGRES portal at `ingres.iith.ac.in` is an **Angular SPA** backed by GeoServer WFS layers and internal APIs.
- Parse.bot provides a pre-built API interface & MCP server wrapping the INGRES portal (`https://parse.bot/marketplace/72d8f7f9-affc-4b1e-b02a-42b8734734eb/ingres-iith-ac-in-api`). Requires an API key or can be queried directly via our own backend pipeline.
- OpenCity.in uses **CKAN** — has a working REST API at `data.opencity.in/api/3/action/`.
- We have converted the official 97-page CGWB GWRA-2025 document into a production-ready SQLite/PostgreSQL-compatible CSV with 6,635 blocks.


