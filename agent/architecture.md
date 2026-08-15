# 🏗️ Architecture & System Design

This document details the high-level architecture and technology choices for our SIH 2026 project.

## Problem Statement
**SIH25066:** Development of an AI-driven ChatBOT for INGRES as a virtual assistant.
- Build an AI chatbot that lets users query India's groundwater data (from INGRES) using natural language.
- Must support interactive data visualization (charts, maps).
- Should be user-friendly for policymakers, researchers, and citizens.

## Tech Stack
- **Frontend:** *To be decided*
- **Backend:** *To be decided*
- **Database:** *To be decided*
- **AI/LLM:** *To be decided*
- **Deployment:** *To be decided*

## High-Level Architecture
*To be populated after tech stack decisions.*

## Core Features (Expected)
1. **Natural Language Query Engine** — Users ask questions in plain English/Hindi, chatbot fetches and presents groundwater data.
2. **Data Integration** — Connect to or replicate INGRES/CGWB data (recharge, extraction, SoE, categories).
3. **Interactive Visualization** — Charts, graphs, GIS maps showing groundwater status by region.
4. **Multilingual Support** — At minimum English + Hindi.
5. **Conversational AI** — Multi-turn chat, context retention, follow-up queries.

## APIs and Integrations
1. **INGRES REST / MCP Wrapper (via Parse.bot or custom proxy)**:
   - `get_assessment_years`: Assessment cycles (e.g. 2024-2025, 2023-2024)
   - `get_country_summary`: National aggregated numbers
   - `get_state_list`: State level overview & UUIDs
   - `get_state_data`: District level breakdown by state
   - `get_district_data`: Block level breakdown, water table depths, trends
   - `search_location`: Entity/location resolution
2. **Local Static Datasets (`data/raw/`)**:
   - OpenCity state and major city groundwater availability & extraction CSVs (2024)
   - CGWB Dynamic Ground Water Resources 2025 National Report (PDF extraction)
3. **GeoServer / Spatial Layers**:
   - Boundary GeoJSON / WFS layers from INGRES GeoServer for map visualizations.
