import argparse
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

parser = argparse.ArgumentParser(description="Inspect resources in a saved OpenCity API response.")
parser.add_argument("manifest", type=Path, help="Markdown or JSON file containing the API response")
args = parser.parse_args()

with args.manifest.open(encoding='utf-8') as f:
    # Skip markdown header lines until we hit the JSON
    content = f.read()
    # Find the JSON start
    json_start = content.find('{')
    if json_start >= 0:
        data = json.loads(content[json_start:])
        resources = data.get('result', {}).get('resources', [])
        print(f"Found {len(resources)} resources:")
        for r in resources[:30]:
            name = r.get('name', 'N/A')
            fmt = r.get('format', 'N/A')
            url = r.get('url', 'N/A')
            print(f"  {name} | {fmt} | {url}")
    else:
        print("No JSON found in file")
