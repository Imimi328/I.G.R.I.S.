import fitz
import sqlite3
import csv
import json
import glob
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

PROCESSED_DIR = r"R:\Downlads\SIH2026\data\processed"
os.makedirs(PROCESSED_DIR, exist_ok=True)
DB_PATH = os.path.join(PROCESSED_DIR, "ingres_master.db")

print(f"==================================================")
print(f" BUILDING UNIFIED INGRES MASTER DATA LAKE (SQLite)")
print(f" Database: {DB_PATH}")
print(f"==================================================")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# 1. CREATE TABLES
cursor.execute("DROP TABLE IF EXISTS states_summary")
cursor.execute("""
CREATE TABLE states_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_name TEXT UNIQUE,
    monsoon_recharge_rainfall REAL,
    monsoon_recharge_other REAL,
    non_monsoon_recharge_rainfall REAL,
    non_monsoon_recharge_other REAL,
    total_annual_recharge REAL,
    total_natural_discharges REAL,
    annual_extractable_resource REAL,
    irrigation_extraction REAL,
    industrial_extraction REAL,
    domestic_extraction REAL,
    total_annual_extraction REAL,
    domestic_allocation_2025 REAL,
    net_availability_future REAL,
    stage_of_extraction_pct REAL
)
""")

cursor.execute("DROP TABLE IF EXISTS blocks_categorization")
cursor.execute("""
CREATE TABLE blocks_categorization (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    s_no INTEGER,
    state TEXT,
    district TEXT,
    block_name TEXT,
    categorization TEXT
)
""")
cursor.execute("CREATE INDEX idx_blocks_state ON blocks_categorization(state)")
cursor.execute("CREATE INDEX idx_blocks_district ON blocks_categorization(district)")
cursor.execute("CREATE INDEX idx_blocks_category ON blocks_categorization(categorization)")

cursor.execute("DROP TABLE IF EXISTS state_water_quality")
cursor.execute("""
CREATE TABLE state_water_quality (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_name TEXT,
    parameter TEXT,
    num_samples INTEGER,
    permissible_limit TEXT,
    samples_above_limit INTEGER,
    pct_above_limit REAL
)
""")

cursor.execute("DROP TABLE IF EXISTS state_depth_trends")
cursor.execute("""
CREATE TABLE state_depth_trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_name TEXT,
    season TEXT,
    depth_summary TEXT
)
""")

cursor.execute("DROP TABLE IF EXISTS state_factsheet_fulltext")
cursor.execute("""
CREATE TABLE state_factsheet_fulltext (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_name TEXT UNIQUE,
    file_name TEXT,
    full_text TEXT
)
""")

cursor.execute("DROP TABLE IF EXISTS city_groundwater")
cursor.execute("""
CREATE TABLE city_groundwater (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_name TEXT,
    annual_recharge REAL,
    extractable_resource REAL,
    total_extraction REAL,
    stage_of_extraction_pct REAL,
    categorization TEXT
)
""")

# 2. INGEST STATES SUMMARY FROM OPENCITY CSV
states_csv = r"data\raw\opencity_gw_2024\India_Groundwater_Availability_Utilization_and_Extraction_at_States_Level_2024.csv"
if os.path.exists(states_csv):
    print(f"\n[1/5] Ingesting State-Level Summary from {states_csv}...")
    with open(states_csv, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        count = 0
        for row in reader:
            if not row or len(row) < 16 or not row[0].strip():
                continue
            try:
                state_name = row[1].strip()
                def parse_val(v):
                    try:
                        return float(v.replace(',', '').strip())
                    except:
                        return 0.0
                
                cursor.execute("""
                INSERT INTO states_summary (
                    state_name, monsoon_recharge_rainfall, monsoon_recharge_other,
                    non_monsoon_recharge_rainfall, non_monsoon_recharge_other,
                    total_annual_recharge, total_natural_discharges,
                    annual_extractable_resource, irrigation_extraction,
                    industrial_extraction, domestic_extraction,
                    total_annual_extraction, domestic_allocation_2025,
                    net_availability_future, stage_of_extraction_pct
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    state_name, parse_val(row[2]), parse_val(row[3]),
                    parse_val(row[4]), parse_val(row[5]), parse_val(row[6]),
                    parse_val(row[7]), parse_val(row[8]), parse_val(row[9]),
                    parse_val(row[10]), parse_val(row[11]), parse_val(row[12]),
                    parse_val(row[13]), parse_val(row[14]), parse_val(row[15])
                ))
                count += 1
            except Exception as e:
                print(f"  Error row {row[1]}: {e}")
        print(f"  -> Successfully loaded {count} States and Union Territories!")

# 3. INGEST 6,635 BLOCKS CATEGORIZATION
blocks_csv = r"data\processed\india_all_blocks_categorization_2025.csv"
if os.path.exists(blocks_csv):
    print(f"\n[2/5] Ingesting Block-Level Categorization from {blocks_csv}...")
    with open(blocks_csv, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        blocks_data = []
        for row in reader:
            if row and len(row) >= 5:
                blocks_data.append((int(row[0]) if row[0].isdigit() else 0, row[1], row[2], row[3], row[4]))
        cursor.executemany("""
        INSERT INTO blocks_categorization (s_no, state, district, block_name, categorization)
        VALUES (?, ?, ?, ?, ?)
        """, blocks_data)
        print(f"  -> Successfully loaded {len(blocks_data)} Block records into database!")

# 4. PARSE & INGEST ALL 36 STATE FACT SHEET PDFs (Text + Quality + Depth)
factsheet_pdfs = sorted(glob.glob(r"data\raw\state_fact_sheets_2025\*.pdf"))
print(f"\n[3/5] Parsing and Ingesting {len(factsheet_pdfs)} State Fact Sheet PDFs...")

quality_count = 0
depth_count = 0
knowledge_corpus = []

for pdf_path in factsheet_pdfs:
    filename = os.path.basename(pdf_path)
    # Extract state name from filename or first page
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text() + "\n"
    
    # State name detection
    state_match = re.search(r'Ground Water Quality of\s+([A-Za-z\s&,]+),\s*2025', full_text)
    if state_match:
        state_name = state_match.group(1).strip().replace('\n', ' ')
    else:
        state_name = filename.split('_GW_FactSheet')[0].split('_', 1)[-1].replace('_', ' ')
    
    # Ingest Full Text
    cursor.execute("""
    INSERT OR REPLACE INTO state_factsheet_fulltext (state_name, file_name, full_text)
    VALUES (?, ?, ?)
    """, (state_name, filename, full_text))
    
    # Ingest into JSON corpus for fast vector/text retrieval
    knowledge_corpus.append({
        "state_name": state_name,
        "source_file": filename,
        "page_count": len(doc),
        "full_text": full_text
    })
    
    # Parse Water Quality Table (Page 1)
    p1_lines = doc[0].get_text().split('\n')
    for idx, l in enumerate(p1_lines):
        param_cand = l.strip()
        if param_cand in ["EC", "Fluoride", "Nitrate", "Arsenic", "Uranium", "Iron", "Chloride"]:
            # Next tokens often: num_samples, limit, above_limit, pct
            vals = []
            for k in range(idx+1, min(idx+7, len(p1_lines))):
                val_clean = p1_lines[k].strip()
                if val_clean:
                    vals.append(val_clean)
            if len(vals) >= 4:
                try:
                    num_samples = int(re.sub(r'[^0-9]', '', vals[0]))
                    perm_limit = vals[1]
                    samples_above = int(re.sub(r'[^0-9]', '', vals[2]))
                    pct_above = float(re.sub(r'[^0-9.]', '', vals[3]))
                    cursor.execute("""
                    INSERT INTO state_water_quality (state_name, parameter, num_samples, permissible_limit, samples_above_limit, pct_above_limit)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, (state_name, param_cand, num_samples, perm_limit, samples_above, pct_above))
                    quality_count += 1
                except:
                    pass
    
    # Parse Water Level Depth (Page 3)
    if len(doc) >= 3:
        p3_text = doc[2].get_text()
        pre_match = re.search(r'Pre-Monsoon\s*\(May\s*2024\)(.*?)(?:Post-Monsoon|$)', p3_text, re.DOTALL | re.IGNORECASE)
        post_match = re.search(r'Post-Monsoon\s*\(November\s*2024\)(.*?)(?:$)', p3_text, re.DOTALL | re.IGNORECASE)
        
        if pre_match:
            cursor.execute("INSERT INTO state_depth_trends (state_name, season, depth_summary) VALUES (?, ?, ?)",
                           (state_name, "Pre-Monsoon (May 2024)", " ".join(pre_match.group(1).split())))
            depth_count += 1
        if post_match:
            cursor.execute("INSERT INTO state_depth_trends (state_name, season, depth_summary) VALUES (?, ?, ?)",
                           (state_name, "Post-Monsoon (Nov 2024)", " ".join(post_match.group(1).split())))
            depth_count += 1

print(f"  -> Ingested {len(factsheet_pdfs)} State full-texts, {quality_count} water quality entries, and {depth_count} depth trends!")

# 5. INGEST MAJOR CITIES DATA
major_cities_csv = r"data\raw\opencity_gw_2024\Major_Cities_Groundwater_Availability_Utilization_and_Extraction_2024.csv"
if os.path.exists(major_cities_csv):
    print(f"\n[4/5] Ingesting Major Cities Dataset from {major_cities_csv}...")
    with open(major_cities_csv, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        city_count = 0
        for row in reader:
            if row and len(row) >= 6 and row[0].strip():
                try:
                    city_name = row[1].strip()
                    recharge = float(row[2].replace(',', '')) if row[2] else 0.0
                    extractable = float(row[3].replace(',', '')) if row[3] else 0.0
                    extraction = float(row[4].replace(',', '')) if row[4] else 0.0
                    soe = float(row[5].replace(',', '')) if row[5] else 0.0
                    cat = "Over-Exploited" if soe > 100 else ("Critical" if soe > 90 else ("Semi-Critical" if soe > 70 else "Safe"))
                    cursor.execute("""
                    INSERT INTO city_groundwater (city_name, annual_recharge, extractable_resource, total_extraction, stage_of_extraction_pct, categorization)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, (city_name, recharge, extractable, extraction, soe, cat))
                    city_count += 1
                except Exception as e:
                    pass
        print(f"  -> Loaded {city_count} Major City entries into database!")

# 6. EXPORT UNIFIED MASTER JSON CORPUS
json_corpus_path = os.path.join(PROCESSED_DIR, "state_factsheets_corpus.json")
with open(json_corpus_path, 'w', encoding='utf-8') as f:
    json.dump(knowledge_corpus, f, ensure_ascii=False, indent=2)
print(f"\n[5/5] Exported Unified Knowledge Corpus JSON to: {json_corpus_path} ({os.path.getsize(json_corpus_path)/1024:.1f} KB)")

conn.commit()
conn.close()

print(f"\n==================================================")
print(f" ALL DATASETS UNIFIED AND SAVED SUCCESSFULLY!")
print(f" Database Size: {os.path.getsize(DB_PATH)/1024:.1f} KB")
print(f"==================================================")
