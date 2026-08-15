import sqlite3
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect(r"data\processed\ingres_master.db")
cursor = conn.cursor()

print("--- Database Tables & Row Counts ---")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
for (tbl,) in tables:
    cursor.execute(f"SELECT COUNT(*) FROM {tbl}")
    count = cursor.fetchone()[0]
    print(f"  {tbl}: {count} rows")

print("\n--- Test Query 1: Top 5 States by Stage of Extraction ---")
cursor.execute("SELECT state_name, total_annual_recharge, total_annual_extraction, stage_of_extraction_pct FROM states_summary ORDER BY stage_of_extraction_pct DESC LIMIT 5")
for row in cursor.fetchall():
    print(f"  {row[0]}: Recharge={row[1]} BCM, Extraction={row[2]} BCM, SoE={row[3]}%")

print("\n--- Test Query 2: Over-Exploited Blocks in Punjab ---")
cursor.execute("SELECT district, COUNT(*) FROM blocks_categorization WHERE state='PUNJAB' AND categorization='over_exploited' GROUP BY district LIMIT 5")
for row in cursor.fetchall():
    print(f"  District {row[0]}: {row[1]} over-exploited blocks")

print("\n--- Test Query 3: Water Quality Contamination in Rajasthan ---")
cursor.execute("SELECT parameter, permissible_limit, pct_above_limit FROM state_water_quality WHERE state_name LIKE '%Rajasthan%'")
for row in cursor.fetchall():
    print(f"  {row[0]} (Limit: {row[1]}): {row[2]}% of tested samples above limit")

conn.close()
