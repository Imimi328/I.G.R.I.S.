import urllib.request
import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'data\inspect_ingres_bundle.py', 'r') as f:
    pass

url = "https://ingres.iith.ac.in/main.a1d99c2ec798f3107044.js"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=15) as resp:
    js = resp.read().decode('utf-8', errors='ignore')

# Search for all strings matching api patterns or http methods in Angular
api_calls = set(re.findall(r'["\'](/api/[^"\']+|/gec/[^"\']+|/py/[^"\']+|/user/[^"\']+)["\']', js))
print("Found API routes in bundle:")
for call in sorted(api_calls):
    print("  ", call)

# Test calling the backend APIs directly
base_url = "https://ingres.iith.ac.in"
test_endpoints = [
    "/api/gec/parentChildType",
    "/gec/stateHieAndAssmntData",
    "/api/gec/getAssessmentYears",
    "/api/gec/getStateList"
]

print("\n--- Testing Direct Backend APIs ---")
for ep in list(api_calls)[:10] + test_endpoints:
    full_url = base_url + ep
    try:
        req = urllib.request.Request(full_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as r:
            res_text = r.read().decode('utf-8', errors='ignore')
            print(f"[SUCCESS {r.status}] {ep} -> {res_text[:120]}")
    except Exception as e:
        print(f"[FAIL] {ep} -> {e}")
