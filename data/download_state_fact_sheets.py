import fitz
import urllib.request
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

def extract_links_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    links_data = []
    
    for page in doc:
        text = page.get_text()
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        # Regex to find links and preceding state name
        for i, line in enumerate(lines):
            if line.startswith("http://") or line.startswith("https://"):
                url = line
                # Look back up for state name
                state_name = "Unknown"
                for k in range(i-1, max(-1, i-6), -1):
                    cand = lines[k]
                    if not cand.isdigit() and not cand.startswith("http") and cand not in ["Click the link below to download", "States / Union", "Territories", "S.", "No.", "Central Ground Water Board (CGWB)", "State/UT wise fact sheets", "Dynamic Ground Water Resources, Ground Water Level &", "Ground Water Quality, 2025", "Ground Water Quality, 2024"]:
                        state_name = cand
                        break
                links_data.append((state_name, url))
    return links_data

print("--- Extracting 2025 State Fact Sheet Links ---")
links_2025 = extract_links_from_pdf(r"data\raw\cgwb_official\State_UT_Fact_Sheets_GW_2025_Links.pdf")
print(f"Found {len(links_2025)} links for 2025")

print("--- Extracting 2024 State Fact Sheet Links ---")
links_2024 = extract_links_from_pdf(r"data\raw\cgwb_official\State_UT_Fact_Sheets_GW_2024_Links.pdf")
print(f"Found {len(links_2024)} links for 2024")

# Download 2025 State Fact Sheets
out_dir_2025 = r"data\raw\state_fact_sheets_2025"
os.makedirs(out_dir_2025, exist_ok=True)

print(f"\nDownloading {len(links_2025)} State Fact Sheets for 2025 into {out_dir_2025}...")
for idx, (state, url) in enumerate(links_2025, 1):
    clean_state = re.sub(r'[^a-zA-Z0-9_]', '_', state).strip('_')
    filename = f"{idx:02d}_{clean_state}_GW_FactSheet_2025.pdf"
    filepath = os.path.join(out_dir_2025, filename)
    print(f"[{idx}/{len(links_2025)}] Downloading {state} -> {filename}...")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as resp, open(filepath, 'wb') as f:
            f.write(resp.read())
        size_kb = os.path.getsize(filepath) / 1024
        print(f"  -> Saved ({size_kb:.1f} KB)")
    except Exception as e:
        print(f"  -> Failed: {e}")

# Download 2024 State Fact Sheets
out_dir_2024 = r"data\raw\state_fact_sheets_2024"
os.makedirs(out_dir_2024, exist_ok=True)

print(f"\nDownloading {len(links_2024)} State Fact Sheets for 2024 into {out_dir_2024}...")
for idx, (state, url) in enumerate(links_2024, 1):
    clean_state = re.sub(r'[^a-zA-Z0-9_]', '_', state).strip('_')
    filename = f"{idx:02d}_{clean_state}_GW_FactSheet_2024.pdf"
    filepath = os.path.join(out_dir_2024, filename)
    print(f"[{idx}/{len(links_2024)}] Downloading {state} -> {filename}...")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as resp, open(filepath, 'wb') as f:
            f.write(resp.read())
        size_kb = os.path.getsize(filepath) / 1024
        print(f"  -> Saved ({size_kb:.1f} KB)")
    except Exception as e:
        print(f"  -> Failed: {e}")

print("\nAll State/UT Fact Sheets download completed!")
