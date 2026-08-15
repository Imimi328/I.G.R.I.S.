import fitz
import glob
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_files = glob.glob(r"data\raw\state_fact_sheets_2025\*.pdf")
print(f"Found {len(pdf_files)} state fact sheet PDFs.")

for f in pdf_files[:3]:
    doc = fitz.open(f)
    print(f"\n--- File: {os.path.basename(f)} (Pages: {len(doc)}) ---")
    print(doc[0].get_text()[:400])
