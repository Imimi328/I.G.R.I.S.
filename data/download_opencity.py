import json, sys, urllib.request, os

sys.stdout.reconfigure(encoding='utf-8')

OUT_DIR = r'R:\Downlads\SIH2026\data\raw\opencity_gw_2024'
os.makedirs(OUT_DIR, exist_ok=True)

with open(r'C:\Users\PC\.gemini\antigravity-ide\brain\6ffed4fa-cd26-416e-a7ef-4f5f3bad23c3\.system_generated\steps\158\content.md', encoding='utf-8') as f:
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
    filepath = os.path.join(OUT_DIR, filename)
    
    try:
        print(f"  [{i+1}/{len(resources)}] Downloading: {name} ({fmt})...")
        urllib.request.urlretrieve(url, filepath)
        size_kb = os.path.getsize(filepath) / 1024
        print(f"    -> Saved: {filename} ({size_kb:.1f} KB)")
    except Exception as e:
        print(f"    -> FAILED: {e}")

print("\nDone!")
