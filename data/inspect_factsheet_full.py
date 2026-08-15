import fitz
import sys

sys.stdout.reconfigure(encoding='utf-8')

for state_file in [r"data\raw\state_fact_sheets_2025\01_Andhra_Pradesh_GW_FactSheet_2025.pdf", r"data\raw\state_fact_sheets_2025\19_Punjab_GW_FactSheet_2025.pdf", r"data\raw\state_fact_sheets_2025\20_Rajasthan_GW_FactSheet_2025.pdf"]:
    doc = fitz.open(state_file)
    print(f"\n==================== {state_file} ====================")
    for p_num, page in enumerate(doc, 1):
        print(f"--- PAGE {p_num} ---")
        print(page.get_text()[:800])
