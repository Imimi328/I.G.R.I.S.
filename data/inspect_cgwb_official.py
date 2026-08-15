import fitz
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("--- State/UT Fact Sheets Links (2025) ---")
doc = fitz.open(r"data\raw\cgwb_official\State_UT_Fact_Sheets_GW_2025_Links.pdf")
print("Total Pages:", len(doc))
for page in doc:
    print(page.get_text())

print("\n--- Block-wise Categorization 2025 Sample ---")
doc2 = fitz.open(r"data\raw\cgwb_official\Block_wise_Categorization_GWRA_2025.pdf")
print("Total Pages:", len(doc2))
for i in range(min(3, len(doc2))):
    print(f"Page {i+1} sample:")
    print(doc2[i].get_text()[:600])
