import argparse
import json
import sys
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

parser = argparse.ArgumentParser(description="Download OpenCity resources from a saved API response.")
parser.add_argument("manifest", type=Path, help="Markdown or JSON file containing the API response")
parser.add_argument(
    "--output",
    type=Path,
    default=Path(__file__).resolve().parent / "raw" / "opencity_gw_2024",
    help="Directory where downloaded resources are stored",
)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)

with args.manifest.open(encoding='utf-8') as f:
    content = f.read()
    json_start = content.find('{')
    data = json.loads(content[json_start:])

resources = data.get('result', {}).get('resources', [])
print(f"Downloading {len(resources)} resources...")

for i, r in enumerate(resources):
    name = r.get('name', f'resource_{i}')
    fmt = r.get('format', 'unknown').lower()
    url = r.get('url', '')
    
    # Create a clean filename
    safe_name = name.replace(' ', '_').replace('/', '_').replace('\\', '_')
    filename = f"{safe_name}.{fmt}"
    filepath = args.output / filename
    
    try:
        print(f"  [{i+1}/{len(resources)}] Downloading: {name} ({fmt})...")
        urllib.request.urlretrieve(url, filepath)
        size_kb = filepath.stat().st_size / 1024
        print(f"    -> Saved: {filename} ({size_kb:.1f} KB)")
    except Exception as e:
        print(f"    -> FAILED: {e}")

print("\nDone!")
