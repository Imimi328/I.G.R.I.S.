import json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'C:\Users\PC\.gemini\antigravity-ide\brain\6ffed4fa-cd26-416e-a7ef-4f5f3bad23c3\.system_generated\steps\158\content.md', encoding='utf-8') as f:
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
