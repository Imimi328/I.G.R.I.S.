import fitz
import csv
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"data\raw\cgwb_official\Block_wise_Categorization_GWRA_2025.pdf"
out_dir = r"data\processed"
os.makedirs(out_dir, exist_ok=True)
csv_path = os.path.join(out_dir, "india_all_blocks_categorization_2025.csv")

doc = fitz.open(pdf_path)
print(f"Parsing {len(doc)} pages from {pdf_path}...")

all_rows = []
valid_categories = {'safe', 'semi_critical', 'critical', 'over_exploited', 'saline'}

for page_idx, page in enumerate(doc):
    text = page.get_text()
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    # Filter out header lines
    # Headers typically: S. No., State, District, Assessment Unit Name, Categorization, GWRA - 2025
    filtered_lines = []
    for l in lines:
        if l in ["S. No.", "State", "District", "Assessment Unit  Name", "Assessment Unit Name", "Categorization", "GWRA - 2025", "GWRA-2025"]:
            continue
        filtered_lines.append(l)
    
    # Stream parser: look for number, then state, district, block, category
    i = 0
    while i < len(filtered_lines):
        # Look for digit as serial number
        if filtered_lines[i].isdigit():
            s_no = filtered_lines[i]
            # Next tokens until category
            # Find category index
            cat_idx = -1
            for j in range(i + 1, min(i + 8, len(filtered_lines))):
                val = filtered_lines[j].lower()
                if val in valid_categories or any(val.startswith(c) for c in valid_categories):
                    cat_idx = j
                    break
            
            if cat_idx != -1:
                tokens = filtered_lines[i+1:cat_idx]
                category = filtered_lines[cat_idx].lower()
                
                # tokens should be [state, district, block] or variations
                if len(tokens) >= 3:
                    state = tokens[0]
                    district = tokens[1]
                    block = " ".join(tokens[2:])
                elif len(tokens) == 2:
                    state = tokens[0]
                    district = tokens[0]
                    block = tokens[1]
                elif len(tokens) == 1:
                    state = "Unknown"
                    district = "Unknown"
                    block = tokens[0]
                else:
                    state, district, block = "Unknown", "Unknown", "Unknown"
                
                all_rows.append([s_no, state, district, block, category])
                i = cat_idx + 1
                continue
        i += 1

print(f"Extracted {len(all_rows)} block records across India!")

# Write to CSV
with open(csv_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(["s_no", "state", "district", "block_name", "categorization"])
    writer.writerows(all_rows)

print(f"Successfully saved to: {csv_path}")

# Display category distribution
category_counts = {}
for r in all_rows:
    cat = r[4]
    category_counts[cat] = category_counts.get(cat, 0) + 1

print("\n--- India Block Category Summary (GWRA 2025) ---")
for cat, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
    print(f"  {cat}: {count} blocks")
