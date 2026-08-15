import urllib.request
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

DOWNLOAD_DIR = r"R:\Downlads\SIH2026\data\raw\cgwb_official"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

files_to_download = [
    {
        "name": "Block_wise_Categorization_GWRA_2025.pdf",
        "url": "https://cgwb.gov.in/cgwbpnm/public/uploads/documents/1767356717630008751file.pdf"
    },
    {
        "name": "Block_wise_Categorization_GWRA_2024.pdf",
        "url": "https://cgwb.gov.in/cgwbpnm/public/uploads/documents/17365121771867268670file.pdf"
    },
    {
        "name": "Block_wise_Categorization_GWRA_2023.pdf",
        "url": "https://cgwb.gov.in/cgwbpnm/public/uploads/documents/17365120091489421832file.pdf"
    },
    {
        "name": "State_UT_Fact_Sheets_GW_2025_Links.pdf",
        "url": "https://cgwb.gov.in/sites/default/files/2025-12/fact_sheet_2025_website_links_0.pdf"
    },
    {
        "name": "State_UT_Fact_Sheets_GW_2024_Links.pdf",
        "url": "https://cgwb.gov.in/sites/default/files/2025-07/fact_sheet_2024_updated_direct_link_1.pdf"
    },
    {
        "name": "GEC_2015_Methodology_Guidelines.pdf",
        "url": "https://cgwb.gov.in/cgwbpnm/public/uploads/documents/16871635141564318654file.pdf"
    }
]

print(f"Starting download of {len(files_to_download)} official CGWB datasets...")

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for idx, item in enumerate(files_to_download, 1):
    file_path = os.path.join(DOWNLOAD_DIR, item["name"])
    print(f"[{idx}/{len(files_to_download)}] Downloading {item['name']}...")
    try:
        req = urllib.request.Request(item["url"], headers=headers)
        with urllib.request.urlopen(req, timeout=60) as resp, open(file_path, 'wb') as out_f:
            out_f.write(resp.read())
        size_mb = os.path.getsize(file_path) / (1024 * 1024)
        print(f"  -> Successfully saved: {item['name']} ({size_mb:.2f} MB)")
    except Exception as e:
        print(f"  -> ERROR downloading {item['name']}: {e}")

print("\nFinished downloading CGWB official datasets!")
