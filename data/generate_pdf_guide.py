import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"R:\Downlads\SIH2026\SIH2026_INGRES_AI_Assistant_Complete_Guide.pdf"

doc = SimpleDocTemplate(
    pdf_path,
    pagesize=letter,
    rightMargin=40,
    leftMargin=40,
    topMargin=40,
    bottomMargin=40
)

styles = getSampleStyleSheet()

# Custom Palette
PRIMARY = colors.HexColor("#0D47A1")     # Deep Royal Blue
SECONDARY = colors.HexColor("#00838F")   # Deep Teal
ACCENT = colors.HexColor("#E65100")      # Deep Orange/Amber
DARK_TEXT = colors.HexColor("#1A202C")
LIGHT_BG = colors.HexColor("#F8FAFC")
BORDER_COLOR = colors.HexColor("#CBD5E1")

# Custom Styles
title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=22,
    leading=26,
    textColor=PRIMARY,
    alignment=TA_CENTER,
    spaceAfter=6
)

subtitle_style = ParagraphStyle(
    'DocSubTitle',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=12,
    leading=16,
    textColor=SECONDARY,
    alignment=TA_CENTER,
    spaceAfter=15
)

h1_style = ParagraphStyle(
    'Header1',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=14,
    leading=18,
    textColor=PRIMARY,
    spaceBefore=14,
    spaceAfter=8,
    keepWithNext=True
)

h2_style = ParagraphStyle(
    'Header2',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=11,
    leading=15,
    textColor=SECONDARY,
    spaceBefore=10,
    spaceAfter=4,
    keepWithNext=True
)

body_style = ParagraphStyle(
    'Body',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9.5,
    leading=14,
    textColor=DARK_TEXT,
    alignment=TA_JUSTIFY,
    spaceAfter=6
)

bullet_style = ParagraphStyle(
    'Bullet',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9,
    leading=13,
    textColor=DARK_TEXT,
    leftIndent=15,
    spaceAfter=3
)

callout_style = ParagraphStyle(
    'Callout',
    parent=styles['Normal'],
    fontName='Helvetica-Oblique',
    fontSize=9.5,
    leading=14,
    textColor=colors.HexColor("#0F172A")
)

table_header_style = ParagraphStyle(
    'TableHeader',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=8.5,
    leading=11,
    textColor=colors.white,
    alignment=TA_CENTER
)

table_cell_style = ParagraphStyle(
    'TableCell',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8,
    leading=11,
    textColor=DARK_TEXT
)

table_cell_bold = ParagraphStyle(
    'TableCellBold',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=8,
    leading=11,
    textColor=DARK_TEXT
)

story = []

# --- HEADER / TITLE ---
story.append(Paragraph("Smart India Hackathon (SIH) 2026", subtitle_style))
story.append(Paragraph("AI-Driven Virtual Assistant for INGRES", title_style))
story.append(Paragraph("Problem Statement: SIH25066 | Ministry of Jal Shakti / CGWB | Complete Guide", subtitle_style))
story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceAfter=12))

# --- EXECUTIVE SUMMARY ---
story.append(Paragraph("1. Executive Summary", h1_style))
story.append(Paragraph(
    "This document serves as the foundational reference and master guide for our project in the Smart India Hackathon 2026. "
    "The challenge focuses on developing an intelligent, AI-powered conversational virtual assistant for the <b>IN-GRES</b> "
    "(INdia-Groundwater Resource Estimation System) platform created by the Central Ground Water Board (CGWB) and IIT Hyderabad. "
    "Our solution transforms over 500 pages of dense government hydrology reports, 36 state fact sheets, and 6,635 granular block-level "
    "records into an accessible, interactive, and multilingual decision-support assistant for farmers, industries, citizens, and policymakers.",
    body_style
))

# --- THE CRISIS ---
story.append(Paragraph("2. The Real-World Groundwater Crisis in India", h1_style))
story.append(Paragraph(
    "India is the largest consumer of groundwater globally, extracting more than 240 Billion Cubic Meters (BCM) annually—surpassing "
    "the combined extraction of China and the United States. Groundwater accounts for over <b>85% of India's rural and urban domestic drinking water</b> "
    "and more than <b>60% of total agricultural irrigation</b>. However, unsustainable extraction practices, erratic monsoon patterns, and "
    "rapid urbanization have pushed hundreds of blocks into severe groundwater depletion.",
    body_style
))

# --- GLOSSARY TABLE ---
story.append(Paragraph("3. Plain-English Glossary of Hydrogeological Terms", h1_style))
story.append(Paragraph(
    "Understanding the technical terminology used by the Ministry of Jal Shakti is vital. Below is a simplified translation using a banking analogy:",
    body_style
))

glossary_data = [
    [Paragraph("Technical Term", table_header_style), Paragraph("Formal Definition (CGWB)", table_header_style), Paragraph("Bank Account Analogy", table_header_style)],
    [Paragraph("<b>Annual Recharge</b>", table_cell_bold), Paragraph("Total volume of water naturally refilling the underground aquifers each year from rainfall, canals, and surface water bodies.", table_cell_style), Paragraph("<b>Annual Salary / Deposits</b> into your bank account.", table_cell_style)],
    [Paragraph("<b>Extractable Resource</b>", table_cell_bold), Paragraph("The portion of total recharge safely available for human extraction after subtracting natural environmental discharges (streams, base flow).", table_cell_style), Paragraph("<b>Available Balance</b> after mandatory taxes/savings.", table_cell_style)],
    [Paragraph("<b>Annual Extraction</b>", table_cell_bold), Paragraph("Total water pumped out of the ground via tube-wells and borewells for irrigation, drinking, and industrial use.", table_cell_style), Paragraph("<b>Total Spending / Withdrawals</b> from your account.", table_cell_style)],
    [Paragraph("<b>Stage of Extraction (SoE %)</b>", table_cell_bold), Paragraph("(Total Annual Extraction / Annual Extractable Resource) × 100. Key metric of aquifer stress.", table_cell_style), Paragraph("<b>Spending Ratio</b>: Spending more than your salary means bankruptcy.", table_cell_style)],
    [Paragraph("<b>BCM</b>", table_cell_bold), Paragraph("Billion Cubic Meters (1 BCM = 1,000,000,000,000 liters). Standard unit of national water estimation.", table_cell_style), Paragraph("The currency denomination (e.g., Crores).", table_cell_style)],
    [Paragraph("<b>Assessment Unit (Block)</b>", table_cell_bold), Paragraph("Administrative sub-district unit (Block, Taluk, Mandal, Firka) evaluated as a distinct hydrological unit.", table_cell_style), Paragraph("Individual branch/account location.", table_cell_style)]
]

t_glossary = Table(glossary_data, colWidths=[110, 240, 180])
t_glossary.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), PRIMARY),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG]),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
]))
story.append(t_glossary)
story.append(Spacer(1, 10))

# --- CATEGORIZATION TIERS ---
story.append(Paragraph("4. The 4 Official Categorization Tiers (GWRA-2025)", h1_style))
story.append(Paragraph(
    "Under the Ground Water Resource Estimation Committee (GEC-2015) guidelines, every assessment unit in India is categorized into four distinct zones based on its Stage of Groundwater Extraction (SoE %):",
    body_style
))

cat_data = [
    [Paragraph("Category", table_header_style), Paragraph("Extraction Threshold", table_header_style), Paragraph("Current National Count", table_header_style), Paragraph("Regulatory & Physical Implications", table_header_style)],
    [Paragraph("<font color='#2E7D32'><b>SAFE</b></font>", table_cell_bold), Paragraph("SoE ≤ 70%", table_cell_style), Paragraph("4,945 Blocks (74.5%)", table_cell_style), Paragraph("Aquifer is replenishing faster than extraction. New borewells permitted easily.", table_cell_style)],
    [Paragraph("<font color='#F57F17'><b>SEMI-CRITICAL</b></font>", table_cell_bold), Paragraph("70% < SoE ≤ 90%", table_cell_style), Paragraph("759 Blocks (11.4%)", table_cell_style), Paragraph("Approaching sustainable limit. Water conservation & monitoring mandatory.", table_cell_style)],
    [Paragraph("<font color='#E65100'><b>CRITICAL</b></font>", table_cell_bold), Paragraph("90% < SoE ≤ 100%", table_cell_style), Paragraph("201 Blocks (3.0%)", table_cell_style), Paragraph("Severe stress. Extraction equals total replenishable recharge. High alert.", table_cell_style)],
    [Paragraph("<font color='#C62828'><b>OVER-EXPLOITED</b></font>", table_cell_bold), Paragraph("SoE > 100%", table_cell_style), Paragraph("730 Blocks (11.0%)", table_cell_style), Paragraph("<b>Severe Crisis Zone</b>. Water tables plummeting rapidly. Strict CGWA NOC clearance required.", table_cell_style)]
]

t_cat = Table(cat_data, colWidths=[95, 115, 120, 200])
t_cat.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), SECONDARY),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG]),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
]))
story.append(t_cat)
story.append(Spacer(1, 10))

# --- WHAT IS INGRES ---
story.append(Paragraph("5. What is the INGRES System?", h1_style))
story.append(Paragraph(
    "<b>INGRES (INdia-Groundwater Resource Estimation System)</b> is a centralized, GIS-based web application developed jointly by the "
    "Central Ground Water Board (CGWB) and the Indian Institute of Technology Hyderabad (IIT-H). It automates the nationwide assessment of dynamic "
    "groundwater resources using the GEC-2015 methodology. It incorporates hydrological boundaries, rainfall data, telemetry sensor logs from Digital "
    "Water Level Recorders (DWLRs), and spatial GIS layers across states.",
    body_style
))

# --- THE PROBLEM TODAY ---
story.append(Paragraph("6. The Problem Statement: Why INGRES Needs an AI Assistant", h1_style))
story.append(Paragraph(
    "While INGRES holds comprehensive scientific water data, its current interface is heavily technical, static, and inaccessible to the people who need it most:",
    body_style
))
story.append(Paragraph("• <b>High Cognitive Barrier:</b> Data is presented through dense GIS layers and voluminous PDF reports that require hydrogeological expertise to interpret.", bullet_style))
story.append(Paragraph("• <b>No Conversational Access:</b> Citizens and farmers cannot type a simple question like <i>'Can I dig a borewell in my village?'</i> or <i>'Is water level rising in my district?'</i>.", bullet_style))
story.append(Paragraph("• <b>Lack of Decision-Support for Officials:</b> Administrators (District Collectors, Panchayats) lack an instant synthesis tool to identify high-stress blocks needing urgent rainwater harvesting funds.", bullet_style))
story.append(Paragraph("• <b>Zero Multi-Lingual & Voice Support:</b> Non-English speakers in rural farming belts cannot interact with the national water platform.", bullet_style))

story.append(PageBreak())

# --- OUR SOLUTION ARCHITECTURE ---
story.append(Paragraph("7. Our Proposed AI Virtual Assistant Solution", h1_style))
story.append(Paragraph(
    "We are building a full-stack, AI-driven conversational intelligence system that acts as the virtual front-door to INGRES. "
    "It combines natural language processing, structured SQL retrieval against 6,635 blocks, RAG-powered knowledge extraction from 36 state fact sheets, "
    "and real-time data visualization.",
    body_style
))

arch_data = [
    [Paragraph("Layer", table_header_style), Paragraph("Component", table_header_style), Paragraph("Function & Capabilities", table_header_style)],
    [Paragraph("<b>User Interface</b>", table_cell_bold), Paragraph("Modern Web & Mobile App (React / Next.js / Vite)", table_cell_style), Paragraph("Conversational chat UI with dark mode, interactive Leaflet GIS maps, chart cards, and voice input in Hindi & English.", table_cell_style)],
    [Paragraph("<b>AI / NLU Engine</b>", table_cell_bold), Paragraph("Query Router & Function Calling (Gemini LLM)", table_cell_style), Paragraph("Translates plain-English/Hindi user intents into precise database queries and synthesizes intuitive, empathetic advisories.", table_cell_style)],
    [Paragraph("<b>Database Layer</b>", table_cell_bold), Paragraph("Unified Master DB (SQLite / PostgreSQL)", table_cell_style), Paragraph("High-speed indexed storage of 36 state summaries, 6,635 block categorizations, 141 water quality records, and 61 depth trends.", table_cell_style)],
    [Paragraph("<b>Knowledge RAG</b>", table_cell_bold), Paragraph("State Fact Sheet Semantic Corpus", table_cell_style), Paragraph("Full-text vector search across all 36 state reports for local contamination advisories (Fluoride, Arsenic, Salinity) and depth trends.", table_cell_style)],
    [Paragraph("<b>INGRES API Spec</b>", table_cell_bold), Paragraph("Standardized 7-Endpoint Schema", table_cell_style), Paragraph("Implements official INGRES REST endpoints: get_country_summary, get_state_data, get_district_data, search_location.", table_cell_style)]
]

t_arch = Table(arch_data, colWidths=[95, 150, 285])
t_arch.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), PRIMARY),
    ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG]),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
]))
story.append(t_arch)
story.append(Spacer(1, 10))

# --- USER PERSONAS & SCENARIOS ---
story.append(Paragraph("8. Real-World User Scenarios (Persona Walkthrough)", h1_style))

story.append(Paragraph("<b>Scenario A: The Farmer (Local Guidance)</b>", h2_style))
story.append(Paragraph("<i>'I am a paddy farmer in Sangrur, Punjab. Is groundwater sufficient for next season?'</i>", callout_style))
story.append(Paragraph("<b>AI Assistant Response:</b> Alerts the farmer that Sangrur's Stage of Extraction is at 156.8% (Over-Exploited). Displays a visual donut chart showing agricultural water stress and advises on government subsidies for drip irrigation and direct seeded rice.", body_style))

story.append(Paragraph("<b>Scenario B: The Factory Owner (Regulatory / NOC Advisory)</b>", h2_style))
story.append(Paragraph("<i>'Can I get a CGWA NOC to extract 50,000 liters/day for a food plant in Bilara, Jodhpur?'</i>", callout_style))
story.append(Paragraph("<b>AI Assistant Response:</b> Identifies Bilara block as Over-Exploited. Clearly explains CGWA mandatory rainwater recharge obligations, artificial recharge requirements, and required NOC documentation.", body_style))

story.append(Paragraph("<b>Scenario C: The District Collector (Policy & Resource Allocation)</b>", h2_style))
story.append(Paragraph("<i>'Show me all critical and over-exploited blocks in my state for emergency Jal Shakti funding.'</i>", callout_style))
story.append(Paragraph("<b>AI Assistant Response:</b> Instantly queries the 6,635 block database, generates an interactive color-coded GIS map, and provides a downloadable CSV/PDF priority report.", body_style))

# --- DATA LAKE STATUS ---
story.append(Paragraph("9. Current Master Data Lake Status in Project", h1_style))
story.append(Paragraph(
    "All project data has been downloaded, parsed, and consolidated into <b>data/processed/ingres_master.db</b> and <b>data/processed/state_factsheets_corpus.json</b>:",
    body_style
))
story.append(Paragraph("• <b>36 State & UT Complete Summaries</b> (Monsoon/Non-monsoon recharge, natural discharge, sector extraction, SoE %).", bullet_style))
story.append(Paragraph("• <b>6,635 Individual Block Categorizations</b> parsed from the official 97-page CGWB 2025 document.", bullet_style))
story.append(Paragraph("• <b>141 State Water Quality Contamination Records</b> (Fluoride, Arsenic, Nitrate, Uranium, EC, Iron).", bullet_style))
story.append(Paragraph("• <b>61 Seasonal Water Table Depth Trends</b> (Pre-Monsoon vs Post-Monsoon ranges and decadal shifts).", bullet_style))
story.append(Paragraph("• <b>36 Full State Fact Sheet Texts</b> indexed for semantic RAG search.", bullet_style))
story.append(Paragraph("• <b>8 Major Metropolitan Cities</b> groundwater extraction and recharge datasets.", bullet_style))

# --- ROADMAP ---
story.append(Spacer(1, 10))
story.append(Paragraph("10. Hackathon Implementation Plan", h1_style))
story.append(Paragraph("1. <b>Backend:</b> Build FastAPI / Express server exposing the 7 INGRES endpoints directly connected to our unified SQLite master DB.", bullet_style))
story.append(Paragraph("2. <b>AI Layer:</b> Connect LLM function-calling to route queries to SQL (numerical lookups) or RAG (fact sheet advisories).", bullet_style))
story.append(Paragraph("3. <b>Frontend:</b> Build a responsive dashboard featuring conversational chat, dynamic charts (Recharge vs Extraction), and interactive Leaflet map overlays.", bullet_style))
story.append(Paragraph("4. <b>Verification & Polish:</b> Test multi-turn conversations, voice input, and multi-lingual prompt handling.", bullet_style))

# Build Document
doc.build(story)
print(f"PDF Successfully generated at: {pdf_path}")
print(f"File size: {os.path.getsize(pdf_path) / 1024:.1f} KB")
